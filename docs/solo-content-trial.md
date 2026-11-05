# Solo content trial

Use normal play; a solo pilot can identify problems but cannot establish how all employees will perform.

1. Play without deliberately rushing or skipping. Use hints when needed.
2. Note any confusing prompt, unfamiliar vocabulary, ambiguous answer, visual problem, or timer that feels unreasonable. Include the game and difficulty.
3. Test short sessions rather than exhausting the whole library at once. Aim initially for five genuine attempts per game and difficulty across several sessions.
4. Distinguish a wrong answer caused by the prompt from one caused by an ordinary mistake. A single failed attempt is not enough to change a difficulty tier.
5. Run `node --env-file=.env.local db/scripts/solo-difficulty-report.mjs` to inspect recorded outcomes. Add an account email as the final argument to restrict the report.

The report excludes skips and unknown legacy outcomes from success rates. It shows timing and XP alongside outcomes and labels a single account as solo evidence. It never creates synthetic player results or rewrites history.

Automated checks run separately:

- `node scripts/test-content-generators.cjs`
- `node scripts/test-content-history.cjs`
- `node scripts/test-daily-rotation.cjs`
- `node --env-file=.env.local db/scripts/verify_content_banks.mjs`

These verify rules, generated-puzzle integrity, history selection and scheduling. They do not measure human comprehension, typing comfort or population-level fairness.
