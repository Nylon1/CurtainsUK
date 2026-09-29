import type { customerView } from '../hci-premium-view';
export type NailaView = Omit<ReturnType<typeof customerView>, 'question' | 'directions'> & {
  revision: number;
  question: { id: string; prompt: string; answers: { id: string; label: string }[] } | null;
  directions: (Omit<ReturnType<typeof customerView>['directions'][number], 'cards'> & {
    cards: (ReturnType<typeof customerView>['directions'][number]['cards'][number] & { commerceToken?: string })[];
  })[];
  directionDelivery?: { current: number; total: number };
  naila?: ConsultationState;
};
export type Preference = { dimension: string; value: string; label: string; confidence: 'confirmed' | 'emerging' | 'unclear' };
export type ConsultationPhase = 'welcome' | 'understand' | 'explore' | 'react' | 'refine' | 'recommend' | 'act';
export type ConsultationState = {
  version: 2; sessionId: string; revision: number;
  confirmedPreferences: Preference[]; emergingPreferences: Preference[]; unclearPreferences: Preference[];
  likedFabricIds: string[]; dislikedFabricIds: string[]; currentShortlist: string[];
  rejectedDirections: string[]; currentPriceLevel: string | null; currentRoom: null;
  currentPhase: ConsultationPhase; currentQuestion: string | null; lastCompletedMoment: string;
  workspace: 'browse' | 'exploration' | 'recommendations';
  directionIndex: number | null;
  selectedFabricId: string | null;
  returnPhase: Exclude<ConsultationPhase, 'act'> | null;
  calibrationReactions: { fabricMasterId: string; reaction: string }[];
  fabricReactions: { fabricMasterId: string; reaction: string }[];
  summary: string[];
  browseFilters: Record<string, string>;
};
