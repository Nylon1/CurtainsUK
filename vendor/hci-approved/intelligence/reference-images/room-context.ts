/** Customer statements only. Never inferred from pixels or treated as supplier facts. */
export const roomPalettePolicy = 'customer-room-palette-context-v2';
export const roomFeatures = [
  'walls',
  'sofa',
  'flooring',
  'rug',
  'wallpaper',
  'furniture',
  'curtains',
  'cushions',
  'artwork',
  'accessories',
  'other',
] as const;
export const colourInfluences = ['important', 'consider', 'ignore'] as const;
export type RoomFeature = (typeof roomFeatures)[number];
export type ColourInfluence = (typeof colourInfluences)[number];
export type ConfirmedRoomColourContext = {
  feature: RoomFeature | null;
  role: 'primary' | 'secondary' | 'accent';
  influence: Exclude<ColourInfluence, 'ignore'>;
  source: 'customer-confirmed';
};
export function validateRoomColourContext(value: ConfirmedRoomColourContext) {
  if (
    !value ||
    Object.keys(value).length !== 4 ||
    Object.keys(value).some((k) => !['feature', 'role', 'influence', 'source'].includes(k)) ||
    (value.feature !== null && !roomFeatures.includes(value.feature)) ||
    !['primary', 'secondary', 'accent'].includes(value.role) ||
    !['important', 'consider'].includes(value.influence) ||
    value.source !== 'customer-confirmed'
  )
    throw Error('Invalid customer room colour context');
  return { ...value };
}
