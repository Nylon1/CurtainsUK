export type KnowledgeBasis =
  'curtain-practice' | 'interior-design-guidance' | 'calibration-hypothesis';

export const designCharacterValues = [
  'calm',
  'refined',
  'luxurious',
  'relaxed',
  'natural',
  'tailored',
  'formal',
  'decorative',
  'expressive',
  'playful',
  'romantic',
  'dramatic',
  'understated',
  'sophisticated',
  'heritage',
  'artisanal',
  'organic',
  'graphic',
] as const;

export type FabricWeightBand = 'sheer' | 'light' | 'medium' | 'medium-heavy' | 'heavy';
export type DrapeCharacter = 'fluid' | 'soft' | 'balanced' | 'structured';
export type SurfaceCharacter = 'smooth' | 'subtle-texture' | 'visible-weave' | 'pile' | 'relief';
export type SheenLevel = 'matte' | 'low' | 'gentle' | 'lustrous';
export type WindowScale = 'compact' | 'standard' | 'large' | 'extra-large';
export type PatternScale = 'none' | 'small' | 'medium' | 'large';
export type FullnessBand = 'light' | 'standard' | 'full' | 'luxurious';
export type HeadingId =
  'wave' | 'pencil-pleat' | 'double-pinch-pleat' | 'triple-pinch-pleat' | 'eyelet' | 'goblet-pleat';
export type FabricBehaviourId =
  | 'sheer-voile'
  | 'lightweight-woven'
  | 'linen-look-medium'
  | 'medium-woven'
  | 'silk-look'
  | 'chenille'
  | 'velvet'
  | 'jacquard'
  | 'blackout-coated';
export const patternIds = [
  'plain',
  'textured-plain',
  'subtle-pattern',
  'stripe',
  'geometric',
  'botanical',
  'traditional-motif',
  'abstract',
  'statement',
] as const;
export type PatternId = (typeof patternIds)[number];

export interface KnowledgeNote {
  text: string;
  basis: KnowledgeBasis;
  requiresSupplierVerification?: boolean;
}

export interface CurtainHeadingKnowledge {
  id: HeadingId;
  displayName: string;
  character: string[];
  formality: 'relaxed' | 'balanced' | 'formal';
  typicalFullness: FullnessBand[];
  hardware: ('track' | 'pole')[];
  fabricAffinity: Record<FabricBehaviourId, number>;
  strengths: KnowledgeNote[];
  cautions: KnowledgeNote[];
}

export interface FabricBehaviourClass {
  id: FabricBehaviourId;
  displayName: string;
  weight: FabricWeightBand;
  drape: DrapeCharacter;
  surface: SurfaceCharacter;
  sheen: SheenLevel;
  opacity: 'sheer' | 'translucent' | 'opaque' | 'variable';
  patternHandling: 'excellent' | 'good' | 'variable';
  character: string[];
  notes: KnowledgeNote[];
}

export interface PatternKnowledge {
  id: PatternId;
  displayName: string;
  scale: PatternScale;
  visualActivity: number;
  foldSensitivity: number;
  windowScaleAffinity: Record<WindowScale, number>;
  fullnessAffinity: Record<FullnessBand, number>;
  notes: KnowledgeNote[];
}

export interface ColourArchetype {
  id: string;
  displayName: string;
  family: string;
  hueDegrees: number;
  lightness: number;
  saturation: number;
  temperature: 'warm' | 'cool' | 'balanced';
  undertones: string[];
  neutrality: 'neutral' | 'near-neutral' | 'colour';
  visualWeight: number;
  atmosphericAssociations: { label: string; strength: number; context: string }[];
  lightingSensitivity: string[];
  basis: 'design-hypothesis';
}

export interface TechnicalAssessment {
  eligible: boolean;
  score: number;
  reasons: string[];
  cautions: string[];
  unknowns: string[];
}

export interface AestheticAssessment {
  score: number;
  reasons: string[];
  unknowns: string[];
}

export interface CurtainKnowledgeAssessment {
  technical: TechnicalAssessment;
  aesthetic: AestheticAssessment;
}

export interface CurtainCombinationInput {
  headingId: HeadingId;
  fabricBehaviourId: FabricBehaviourId;
  patternId: PatternId;
  windowScale: WindowScale;
  fullness: FullnessBand;
}
