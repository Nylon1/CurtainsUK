import type { searchRetailFabrics } from './retail-repository';

type Fabric = Awaited<ReturnType<typeof searchRetailFabrics>>['fabrics'][number] & {
  roomPreview: { available: boolean; url: string | null };
};

/** Opt-in card transport only. Detail, consultation and visualiser keep their full payloads. */
export function browseCard(fabric: Fabric) {
  return {
    id: fabric.id, supplier: fabric.supplier, brand: fabric.brand, collection: fabric.collection,
    design: fabric.design, colour: fabric.colour, fabricProfileUrl: fabric.fabricProfileUrl,
    imageReferences: fabric.imageReferences.slice(0, 1),
    images: fabric.images.slice(0, 1),
    sampleAvailable: fabric.sampleAvailable, orderReady: fabric.orderReady,
    priceReady: fabric.priceReady, currentStockConfirmed: fabric.currentStockConfirmed,
    browseReady: fabric.browseReady, launchReady: fabric.launchReady, availability: fabric.availability,
    browseGuide: 'browseGuide' in fabric ? fabric.browseGuide : undefined,
    curtainEstimate: fabric.curtainEstimate,
    patterns: fabric.patterns, characters: fabric.characters,
    intelligence: fabric.intelligence ? { dimensions: fabric.intelligence.dimensions, advice: [] } : undefined,
    visualIntelligence: fabric.visualIntelligence,
    roomPreview: { available: fabric.roomPreview.available, url: fabric.roomPreview.url },
  };
}
