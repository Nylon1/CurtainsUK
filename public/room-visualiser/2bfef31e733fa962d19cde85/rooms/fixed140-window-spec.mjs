import {ROOMS} from './catalog.mjs';

// Profile-specific architecture only. The GLB room packs and STANDARD mount
// remain byte-identical.
// The 140 × 120 cm curtain overlaps the glazed opening by 2 cm at each side
// and 6 cm at both heading and hem, as a fitted curtain should.
const aperture=Object.freeze({widthCm:136,heightCm:108,bottomCm:102,topCm:210,mountY:96});
export const FIXED140_WINDOWS=Object.freeze(Object.fromEntries(ROOMS.map(room=>[room.id,aperture])));
