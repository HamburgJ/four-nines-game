import { useEffect, useRef } from 'react';
import { logPortfolioGameEvent } from '../utils/analytics';

const destination =
  '/match-five/?ref=next_game&utm_source=four-nines&utm_medium=cross_game&utm_campaign=portfolio_loop';

export const NextGameRecommendation = () => {
  const impressedRef = useRef(false);

  useEffect(() => {
    if (impressedRef.current) return;
    impressedRef.current = true;
    logPortfolioGameEvent('next_game_impression', {
      destination_game_id: 'match-five',
      destination,
      placement: 'session_end',
    });
  }, []);

  return (
    <aside className="next-game" aria-label="Play Match Five next">
      <span className="next-game__eyebrow">One more strange game</span>
      <strong className="next-game__title">Match Five</strong>
      <span className="next-game__description">
        Done with numbers? Find the hidden connection between five words.
      </span>
      <a
        className="next-game__link"
        href={destination}
        onClick={() => {
          logPortfolioGameEvent('next_game_click', {
            destination_game_id: 'match-five',
            destination,
            placement: 'session_end',
          });
        }}
      >
        Find the connection <span aria-hidden="true">→</span>
      </a>
    </aside>
  );
};
