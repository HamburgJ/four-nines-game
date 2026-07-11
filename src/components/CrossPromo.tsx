import React, { useMemo } from 'react';
import { pickPromos } from '../utils/crossPromo';
import { logCrossPromoClick } from '../utils/analytics';

interface CrossPromoProps {
  /** Puzzle date (YYYY-MM-DD); drives the daily rotation. */
  dateStr: string;
}

/**
 * Quiet post-solve strip pointing at other burgerfun games. Rendered after
 * the result panel and share actions — never before, never blocking.
 */
export const CrossPromo: React.FC<CrossPromoProps> = ({ dateStr }) => {
  const picks = useMemo(() => pickPromos(dateStr), [dateStr]);
  if (picks.length === 0) return null;

  return (
    <div className="cross-promo">
      <div className="cross-promo-heading">More strange little games</div>
      {picks.map((pick) => (
        <a
          key={pick.id}
          href={pick.url}
          className="cross-promo-link"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => logCrossPromoClick(pick.id)}
        >
          <span className="cross-promo-name">{pick.name}</span>
          <span className="cross-promo-blurb">{pick.blurb}</span>
        </a>
      ))}
    </div>
  );
};
