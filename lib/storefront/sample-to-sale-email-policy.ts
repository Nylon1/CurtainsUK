import type { PilotStage } from './sample-to-sale';

export type EmailStage = Exclude<PilotStage, 'not_ready' | 'expired'>;
const FIVE_DAYS = 5 * 86_400_000;

/** Start at the current due stage. A late offer gets room before any reminder. */
export function dueSampleEmailStage(stage: PilotStage, offerSentAt: string | null, now = new Date()): EmailStage | null {
  if (stage === 'reminder') {
    if (!offerSentAt) return 'offer';
    const sentAt = Date.parse(offerSentAt);
    return Number.isFinite(sentAt) && now.getTime() - sentAt >= FIVE_DAYS ? 'reminder' : null;
  }
  return stage === 'check_in' || stage === 'inspiration' || stage === 'offer' ? stage : null;
}
