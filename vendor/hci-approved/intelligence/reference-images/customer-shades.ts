import type { ColourFamily } from './evidence';

/** Customer-selected visual guides, not measured pixels, supplier facts or paint standards.
 * Names reuse the governed supplier-colour vocabulary; ambiguous teal is explicitly
 * qualified within the customer's chosen family. Existing IDs/hex values are immutable.
 * This evidence never changes canonical family matching or manufacturer normalization.
 */
export const customerShadePolicy = 'customer-room-shades-v1';
const cards: Record<ColourFamily, readonly (readonly [string, string])[]> = {
  white: [
    ['Chalk white', '#FAF9F5'],
    ['Soft white', '#F1EFE8'],
    ['Cool white', '#E9EFF0'],
    ['Warm white', '#F4EDDE'],
    ['Porcelain white', '#E4E2DD'],
  ],
  cream: [
    ['Pale cream', '#F6F0DC'],
    ['Ivory', '#EDE5CE'],
    ['Warm cream', '#E5D6B7'],
    ['Soft cream', '#DCD5C6'],
    ['Deep cream', '#CFBD98'],
  ],
  beige: [
    ['Pale beige', '#E8DFCF'],
    ['Soft beige', '#D5C8B4'],
    ['Sand beige', '#C8B590'],
    ['Warm beige', '#BFA180'],
    ['Deep beige', '#A58C6D'],
  ],
  taupe: [
    ['Pale taupe', '#DCD5CA'],
    ['Soft taupe', '#BDB2A2'],
    ['Grey taupe', '#A9A298'],
    ['Warm taupe', '#A58F7B'],
    ['Deep taupe', '#75695D'],
  ],
  brown: [
    ['Pale brown', '#CEB89D'],
    ['Soft brown', '#AD937D'],
    ['Mid brown', '#8C694B'],
    ['Warm brown', '#8A5135'],
    ['Deep brown', '#594235'],
    ['Dark brown', '#382F29'],
  ],
  grey: [
    ['Pale grey', '#DCDDD8'],
    ['Soft grey', '#B8BCB6'],
    ['Warm grey', '#A6A095'],
    ['Cool grey', '#909CA3'],
    ['Deep grey', '#697173'],
    ['Charcoal', '#414749'],
  ],
  black: [
    ['Soft black', '#474640'],
    ['Warm black', '#36312D'],
    ['Cool black', '#2A3038'],
    ['Deep black', '#202222'],
    ['Ink black', '#16191C'],
  ],
  blue: [
    ['Pale blue', '#DCE8ED'],
    ['Soft blue', '#AAC4CF'],
    ['Mid blue', '#628EAC'],
    ['Grey-blue', '#8197A1'],
    ['Teal-blue', '#3F7D89'],
    ['Deep blue', '#345675'],
    ['Navy', '#23364F'],
  ],
  green: [
    ['Pale green', '#DCE4CF'],
    ['Sage', '#A5B59A'],
    ['Soft green', '#849E83'],
    ['Olive', '#777E4F'],
    ['Emerald', '#367760'],
    ['Teal-green', '#397969'],
    ['Deep green', '#2E4D3C'],
  ],
  red: [
    ['Pale red', '#DFB5AC'],
    ['Muted red', '#B8786B'],
    ['Mid red', '#B5483C'],
    ['Scarlet', '#BB302E'],
    ['Burgundy', '#783844'],
    ['Deep red', '#602E32'],
  ],
  pink: [
    ['Pale pink', '#F0DDDA'],
    ['Blush', '#DFB5AD'],
    ['Soft pink', '#CD9FAD'],
    ['Mid pink', '#BC788F'],
    ['Rich pink', '#AB4D77'],
    ['Deep pink', '#86415E'],
  ],
  purple: [
    ['Pale purple', '#E2DDEB'],
    ['Lilac', '#BFB0CF'],
    ['Mauve', '#A58C9F'],
    ['Violet', '#816A9E'],
    ['Rich purple', '#6F497D'],
    ['Deep purple', '#503750'],
  ],
  orange: [
    ['Pale orange', '#EBCDB0'],
    ['Soft orange', '#D9A777'],
    ['Muted orange', '#B88668'],
    ['Mid orange', '#CB8241'],
    ['Rich orange', '#C5642F'],
    ['Deep orange', '#954D32'],
  ],
  yellow: [
    ['Pale yellow', '#F3E9BD'],
    ['Soft yellow', '#E4D49A'],
    ['Mid yellow', '#D6BB57'],
    ['Ochre yellow', '#BA963F'],
    ['Mustard yellow', '#A88E3C'],
    ['Deep yellow', '#897139'],
  ],
  gold: [
    ['Pale gold', '#E5D6AE'],
    ['Soft gold', '#CEBB8A'],
    ['Mid gold', '#BDA168'],
    ['Ochre gold', '#AF8C44'],
    ['Rich gold', '#9E7839'],
    ['Deep gold', '#7B6037'],
  ],
};
export type CustomerShade = { id: string; family: ColourFamily; label: string; hex: string };
export const customerShades = Object.fromEntries(
  Object.entries(cards).map(([family, values]) => [
    family,
    values.map(([label, hex], index) => ({
      id: `${customerShadePolicy}:${family}:${index + 1}`,
      family: family as ColourFamily,
      label,
      hex,
    })),
  ]),
) as Record<ColourFamily, CustomerShade[]>;

/** Persist only a validated versioned ID; clients cannot submit arbitrary RGB or terminology. */
export function selectedCustomerShade(
  family: ColourFamily,
  id: unknown,
): CustomerShade | undefined {
  return typeof id === 'string'
    ? customerShades[family]?.find((shade) => shade.id === id)
    : undefined;
}
