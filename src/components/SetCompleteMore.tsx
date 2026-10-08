import { useSyncExternalStore } from 'react';
import { CrossPromo } from './CrossPromo';
import { onBurgerfunSite, subscribeSiteBrand } from '../utils/nextUp';

interface SetCompleteMoreProps {
  /** Puzzle date (YYYY-MM-DD); drives CrossPromo's daily rotation. */
  dateStr: string;
}

/**
 * After today's set: on burgerfun.ca the site's "Next up" row (its own heading,
 * cards and pacing); anywhere else the game's own CrossPromo strip, unchanged.
 * The row's slot has no box until the site fills it, so the rule above it lives
 * on the wrapper and only appears with the row.
 */
export const SetCompleteMore = ({ dateStr }: SetCompleteMoreProps) => {
  const onSite = useSyncExternalStore(subscribeSiteBrand, onBurgerfunSite, () => false);
  if (!onSite) return <CrossPromo dateStr={dateStr} />;
  return (
    <div className="fn-nextup">
      <burger-next-cards kind="daily-solved" game="four-nines" />
    </div>
  );
};
