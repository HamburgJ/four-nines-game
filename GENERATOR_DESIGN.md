# Four Nines puzzle generator

## What changed

The original generator used random AST construction and a genetic search. It
could run for a long time without proving coverage, kept whichever expression
happened to be shortest, and produced a very uneven catalog. The shipped set
contained 431 playable puzzles: from only 16 targets for digit 1 to 85 for
digit 4.

The current generator is deterministic and exhaustive inside explicit bounds.
Run it with:

```bash
npm run generate:puzzles
```

It writes:

- `puzzles/puzzle_catalog.json` — the generated catalog and quality metadata.
- `puzzles/par_data.json` — the verified minimal-symbol solution used for par
  and hints.
- `puzzles/legacy_schedule.json` — the compact target lists needed to preserve
  historical date mappings without shipping the old catalog twice.

The old Python scripts remain as historical experiments, but they are no
longer the production content pipeline.

## Search model

For each seed digit 1–9, the solver builds expressions from exactly four copies
of that digit. It uses dynamic programming by digit count, so equivalent
subproblems are solved once rather than rediscovered randomly.

Supported expression tools match the game:

- addition, subtraction, multiplication, and division;
- exponentiation and modulo;
- factorial, square root, and unary minus;
- concatenation and one decimal point per numeric literal;
- free parentheses for grouping.

The search keeps the lowest symbol-cost expression for each reachable numeric
value. It rejects non-finite results and caps intermediate magnitude, unary
nesting, and total symbol cost so generated solutions remain suitable for a
daily puzzle rather than becoming mathematical noise.

Every chosen expression is then evaluated again with `mathjs`, the evaluator
used by the live game. A candidate is published only when it contains exactly
four copies of the seed digit and reaches the target exactly within numeric
tolerance.

## Catalog size

Targets are intentionally curated to integers 1–100. Within those rules and
the readable-expression bounds, the generator currently proves 663 distinct
seed/target puzzles out of 900 theoretical pairs:

| Digit | Reachable targets |
| --- | ---: |
| 1 | 28 |
| 2 | 62 |
| 3 | 88 |
| 4 | 98 |
| 5 | 86 |
| 6 | 65 |
| 7 | 63 |
| 8 | 73 |
| 9 | 100 |

This is a practical curated ceiling, not a claim that only 663 mathematical
expressions exist. The allowed operators can produce arbitrarily large target
values; expanding the target range or accepting much more elaborate solutions
would create many more puzzles, but not necessarily better daily puzzles.

## Difficulty and variety

Each puzzle records:

- `par`: visible symbol cost of the simplest known solution;
- `difficulty_score`: par plus weights for advanced operations,
  representation tricks, and nesting;
- `difficulty`: easy, medium, hard, or expert;
- `traits`: decimal, concatenation, division, square root, factorial,
  exponent, modulo, or negative exponent.

Each new day contains three clearly labelled puzzles: easy, medium, and hard.
The hard lane alternates between the catalog's hard and expert material, so
players get a reliable three-step session without being forced into a separate
expert puzzle every day. Stable rules meet changing target/operator demands,
giving the player a learnable mastery path without making every day identical.

The richer catalog starts on 2026-07-14. Earlier dates continue to use the
legacy catalog so archive puzzles and saved records never change underneath a
player.
