import { createGuideThumbnailRenderer } from './guide-thumbnails.mjs';
import { sizeOf } from './geometry.mjs';

// Neutral cloth is a clearly labelled fallback when selected artwork cannot
// be mapped at its recorded physical scale. It never changes the order.
const cloth = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000"><defs><pattern id="weave" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="#c9bba5"/><path d="M0 0h4M0 0v4" stroke="#d6cbb8" stroke-width=".5"/></pattern></defs><rect width="1000" height="1000" fill="url(#weave)"/></svg>');
const neutralFabric = {
  id: 'my-home-neutral-study', imageUrl: cloth, previewReady: true,
  calibration: { imageUrl: cloth, physicalWidthMm: 2000, physicalHeightMm: 2000,
    orientation: 'upright', tileable: false, evidence: 'Authored neutral style study, not supplier fabric.' },
};
export function createMyHomeStudies({ threeUrl, createRenderer = createGuideThumbnailRenderer }) {
  const renderer = createRenderer({ threeUrl, width: 600, height: 540, maxEntries: 48, productBackdrop: '#ffffff' });
  return {
    async render(orderedSpec, fabrics = []) {
      const size = sizeOf(orderedSpec.sizeId);
      const label = `${size.shape === 'bed' ? 'Bed square' : size.shape[0].toUpperCase() + size.shape.slice(1)} cushion`;
      const selected = fabrics.find(fabric => fabric.id === orderedSpec.fabricId);
      if (selected?.previewReady && selected.calibration && selected.imageUrl) {
        // Keep the ordered dimensions, identity and motif placement unchanged.
        // The shared renderer rejects artwork that cannot cover this geometry.
        const result = await renderer.render({
          piece: { spec: structuredClone(orderedSpec), position: { slot: 1, offsetX: 0, offsetY: 0, rotation: 0 } },
          fabrics,
        });
        if (result.url) return { ...result, label: `${label} in your chosen fabric`, selectedFabric: true };
      }
      const spec = { ...structuredClone(orderedSpec), id: 'style-study', quantity: 1,
        fabricId: neutralFabric.id, pipingFabricId: neutralFabric.id,
        placementMm: { x: 100, y: 100 }, bolsterEndPlacementMm: { x: 100, y: 100 } };
      const result = await renderer.render({ piece: { spec, position: { slot: 1, offsetX: 0, offsetY: 0, rotation: 0 } }, fabrics: [neutralFabric] });
      return { ...result, label: `${label} style study`, selectedFabric: false };
    },
    dispose: () => renderer.dispose(),
  };
}
