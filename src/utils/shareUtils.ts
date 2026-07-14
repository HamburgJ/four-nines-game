/**
 * Compact, text-only result sharing. No emojis, no spoilers — the share block
 * gives the puzzle number, outcome, symbol count vs par, and (optionally) a
 * challenge line.
 */

export const SHARE_URL = 'burgerfun.ca/four-nines';

export interface ShareResult {
  puzzleNumber: number;
  difficulty?: string;
  solved: boolean;
  isArchive: boolean;
  hintsUsed: number;
  timeMs?: number;
  symbols?: number;
  par?: number;
  includeChallenge?: boolean;
}

/** Format milliseconds as m:ss (or h:mm:ss for long solves). */
export const formatDuration = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

/** The one-line outcome summary, e.g. "Solved in 1:47 — 7 symbols (par 5)". */
export const buildResultLine = (result: ShareResult): string => {
  if (result.solved) {
    let line = 'Solved';
    if (result.timeMs !== undefined) {
      line += ` in ${formatDuration(result.timeMs)}`;
    }
    if (result.symbols !== undefined) {
      line += ` — ${result.symbols} symbol${result.symbols === 1 ? '' : 's'}`;
      if (result.par !== undefined) {
        line += result.symbols <= result.par ? ' (par)' : ` (par ${result.par})`;
      }
    }
    if (result.hintsUsed > 0) {
      line += ` (${result.hintsUsed} hint${result.hintsUsed === 1 ? '' : 's'})`;
    }
    return line;
  }
  let line = 'Not solved';
  if (result.par !== undefined) {
    line += ` — par was ${result.par} symbol${result.par === 1 ? '' : 's'}`;
  }
  if (result.hintsUsed > 0) {
    line += ` (${result.hintsUsed} hint${result.hintsUsed === 1 ? '' : 's'})`;
  }
  return line;
};

export const generateShareText = (result: ShareResult): string => {
  const lines: string[] = [];
  const difficulty = result.difficulty ? ` — ${result.difficulty}` : '';
  lines.push(`Four Nines #${result.puzzleNumber}${difficulty}${result.isArchive ? ' (archive)' : ''}`);
  lines.push(buildResultLine(result));

  if (result.includeChallenge && result.par !== undefined) {
    const beaten = result.solved && result.symbols !== undefined && result.symbols <= result.par;
    lines.push(
      beaten
        ? `Can you match a ${result.par}-symbol solution?`
        : `Can you find a ${result.par}-symbol solution?`
    );
  }

  lines.push(SHARE_URL);
  return lines.join('\n');
};

/** Copy the share block to the clipboard. Returns whether it succeeded. */
export const copyShareText = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers / non-secure contexts.
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  }
};
