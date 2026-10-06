import { SPEC } from './core.mjs';

export const OPEN_SPEC = Object.freeze({ stackWidth: 32, clearCentre: 166, wavesPerPanel: 5 });

/** Arc-length integration of a rounded, stacked S profile, never an X scale.
 * Nearly parallel flanks store the same cloth in greater depth. Tangents remain
 * below 90 degrees: each row is strictly X-monotone and cannot self-intersect.
 * Columns still identify the exact same material samples as the approved mesh.
 */
function section(angle, v, panel) {
  const points = [[0, 0]], ds = SPEC.flatPanelWidth / SPEC.columns;
  // An orderly supported heading relaxes into a dressed fall. No random noise:
  // panel-specific low-frequency variation is deterministic in material space.
  const relaxation = 1.2 * (0.75 * v + 0.25 * v * v * (3 - 2 * v));
  let x = 0, z = 0;
  for (let i = 0; i < SPEC.columns; i++) {
    const u = (i + 0.5) / SPEC.columns; // outer wall side -> leading window edge
    const dressing = relaxation * (0.20 * Math.sin(2 * Math.PI * u) + 0.09 * Math.sin(6 * Math.PI * u + 0.8 * panel) * Math.sin(Math.PI * u));
    // Retain the approved operation order, including exact top-row float values.
    const phase = 2 * Math.PI * OPEN_SPEC.wavesPerPanel * (i + 0.5) / SPEC.columns + 0.06 * Math.sin(Math.PI * v / 2) + dressing;
    // Slightly tighter at the wall, rounder toward the free leading edge.
    const compression = 6 - 0.3 * v + relaxation * (1 - 2 * u + 0.55 * Math.sin(4 * Math.PI * u + 0.8 * panel));
    const theta = angle * Math.tanh(compression * Math.sin(phase));
    x += ds * Math.cos(theta); z += ds * Math.sin(theta);
    points.push([x, z]);
  }
  const centre = (Math.min(...points.map(p => p[1])) + Math.max(...points.map(p => p[1]))) / 2;
  for (const p of points) p[1] += -centre + 0.45 * Math.sin(Math.PI * v) + (0.6 - 0.1 * panel) * relaxation;
  return { points, width: x };
}

export function buildOpenMesh(closed) {
  const position = new Float32Array(closed.position.length), amplitudes = [];
  for (let panel = 0; panel < SPEC.panels; panel++) for (let j = 0; j <= SPEC.rows; j++) {
    let lo = 0, hi = Math.PI / 2;
    for (let k = 0; k < 40; k++) {
      const mid = (lo + hi) / 2;
      if (section(mid, j / SPEC.rows, panel).width > OPEN_SPEC.stackWidth) lo = mid; else hi = mid;
    }
    const angle = (lo + hi) / 2, profile = section(angle, j / SPEC.rows, panel);
    if (Math.abs(profile.width - OPEN_SPEC.stackWidth) > 1e-8) throw Error('OPEN_STACK_SOLUTION_UNAVAILABLE');
    amplitudes.push(angle);
    for (let i = 0; i <= SPEC.columns; i++) {
      const a = 3 * (panel * (SPEC.rows + 1) * (SPEC.columns + 1) + j * (SPEC.columns + 1) + i);
      const [x, z] = profile.points[panel ? SPEC.columns - i : i];
      position[a] = panel ? SPEC.finishedPanelWidth - x : x - SPEC.finishedPanelWidth;
      position[a + 1] = closed.position[a + 1];
      position[a + 2] = z;
    }
  }
  // These buffers are deliberately shared, not reconstructed or reparameterised.
  return { ...closed, position, amplitudes };
}

export function stackMetrics(mesh) {
  return Array.from({ length: SPEC.panels }, (_, panel) => {
    const count = (SPEC.rows + 1) * (SPEC.columns + 1), points = mesh.position.subarray(panel * count * 3, (panel + 1) * count * 3);
    const bounds = [0, 1, 2].map(axis => {
      const values = points.filter((_, i) => i % 3 === axis);
      return [Math.min(...values), Math.max(...values)];
    });
    return { boundsCm: bounds, widthCm: bounds[0][1] - bounds[0][0], dropCm: bounds[1][1] - bounds[1][0], depthCm: bounds[2][1] - bounds[2][0] };
  });
}
