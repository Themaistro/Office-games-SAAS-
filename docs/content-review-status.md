# Content review status — 2026-10-31

Local changes only. This is a review record, not a production certification.

## Verified behavior

- The session creator uses `freshCandidatesFirst` from `src/lib/content-selection.ts`.
- Direct selector tests cover regenerated daily IDs, duplicate rows, source-key history, fresh-first fallback and 1/3/10 rounds per tier.
- Typing has 90 distinct passages in each difficulty tier. At one round per tier that is capacity for 90 typing appearances. At three rounds it is 30 appearances; at ten rounds it is nine. This is not a calendar-day or browser end-to-end guarantee.
- 2,190 simulated user-days preserve exact game counts and balanced coverage in the tested 1/5/15-game configurations. Consecutive identical orders are avoided when more than one game is selected.
- 2,405 generator integrity checks and 180 independent Sudoku uniqueness checks passed in the preceding pass.

## Trivia review

Eight surviving source-bank records have individually recorded references in `trivia_review_sources`. Six checked fact groups cover alphabet length, planet count, water coverage, card-deck size, football team size and US coin arithmetic. Four reworded duplicates were removed. A previous incorrect chromosome answer was corrected from 23 chromosomes to 46, with the distinction between chromosomes and pairs made explicit.

Historical session question records are retained. Obsolete generated copies of corrected or merged questions are excluded from new missions. The remaining trivia records have structural checks, not complete individual factual verification. No claim that the entire bank has been fact-checked is justified.

## Fairness findings

Active generated questions observed in the local database have a base reward of 100 XP. The server still awards different bonuses by game: normal quick answers may receive 25 speed XP and 20 no-hint XP; typing may receive 50 perfect XP and up to 30 speed XP; card matching may receive up to 60 speed XP, 20 no-hint XP and a mistake deduction. Equal base XP does not establish equal earning opportunity.

The local database has 15 legacy completed-question records with missing outcomes, one per observed game/difficulty group. These are unknown results, not failures. Excluding them leaves zero usable scored attempts. Do not rebalance difficulties using these legacy records as if they were a representative player study. `db/scripts/solo-difficulty-report.mjs` now excludes unknown outcomes and skips from success rates and reports the available evidence explicitly.

## Remaining evidence needed

- Individual factual review of the remaining trivia records.
- Browser verification of fresh-content selection through real session creation and refresh/resume.
- Representative player trials measuring completion rate, time, accuracy and hint use by game and difficulty.
- Reward balancing using those trial results; simulation verifies scheduling properties only.
