import type { ColourFamily } from '../intelligence/reference-images/evidence';
import type { RoomFeature } from '../intelligence/reference-images/room-context';
export const familyLabel = (colour: string) =>
  colour === 'cream' ? 'Cream / off-white' : colour[0]!.toUpperCase() + colour.slice(1);
export const shades: Record<ColourFamily, string> = {
  white: '#fdfcf7',
  cream: '#e8dfc9',
  beige: '#cabb9e',
  taupe: '#a39582',
  brown: '#70583f',
  grey: '#92958e',
  black: '#30352f',
  blue: '#78939b',
  green: '#869079',
  red: '#a66458',
  pink: '#d6aca5',
  purple: '#978591',
  orange: '#c48a58',
  yellow: '#d7c48b',
  gold: '#bda168',
};
export const featureLabel: Record<RoomFeature, string> = {
  walls: 'Walls',
  sofa: 'Sofa / Upholstery',
  flooring: 'Flooring',
  rug: 'Rug',
  wallpaper: 'Wallpaper',
  furniture: 'Furniture / Wood',
  curtains: 'Existing curtains',
  cushions: 'Cushions / Soft furnishings',
  artwork: 'Artwork',
  accessories: 'Accessories / Metalwork',
  other: 'Other',
};
export const influenceCopy = {
  important: 'Use this strongly when finding my curtain direction.',
  consider: 'Keep it in mind.',
  ignore: 'Don’t use this when choosing my curtains.',
};
