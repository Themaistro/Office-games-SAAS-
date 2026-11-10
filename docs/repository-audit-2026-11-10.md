# GitHub repository audit — 10 November 2026

## Findings and changes

| Finding                                                                     | Resolution                                                                                                                                                                                             |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| README used the old brand and incomplete game/realtime descriptions         | Replaced with an Office Games overview, original SVG banner, actual CI badge, feature map and architecture summary.                                                                                    |
| Setup referenced a missing `.env.example` and obsolete public publisher key | Added a sanitized tracked example and documented server-only Ably keys/scoped browser tokens. Real environment files stay ignored.                                                                     |
| Database instructions mixed fresh installs and upgrades                     | Documented Docker, empty PostgreSQL and existing-database paths separately. Bootstrap is not an upgrade command.                                                                                       |
| Architecture/runbook introductions still said nothing had been pushed       | Updated current guide introductions; dated reports remain historical evidence.                                                                                                                         |
| Documentation was difficult to navigate                                     | Added a documentation hub and a local development guide.                                                                                                                                               |
| No contributor or issue/PR guidance                                         | Added contributing/security guides, bug/feature forms and a pull-request template.                                                                                                                     |
| About description/topics were empty                                         | Set a product description and seven relevant topics. Repository name, visibility and licensing were not changed.                                                                                       |
| First GitHub Actions run failed on a fresh database                         | Job `42759964135` expected `trivia_review_sources` in table ownership, but that table only existed in ad-hoc local review tooling. Added migration 32 and fresh-install ownership parity verification. |
| CI lacked manual dispatch/concurrency bounds                                | Added manual dispatch, cancellation of superseded runs and a 30-minute job timeout.                                                                                                                    |

The migration is additive and preserves existing review records. It was applied to the local database and rehearsed in an isolated fresh database. No hosted Neon database was migrated during this repository task.

## Repository-level observations

At audit time, the repository was public, with `main` unprotected and no repository rulesets. Branch-protection settings were not changed because they determine whether the owner's direct-push workflow remains available. No open-source license has been selected; no licensing terms were invented. Security reporting instructions do not assume private vulnerability reporting is enabled.

## Validation

The banner was rendered and visually inspected. Current-guide local links and issue/workflow YAML are checked. The new migration passes existing-table ownership checks and an empty-database bootstrap/migration/seed/runtime-role rehearsal; the fresh test now checks every owned table. The standard platform/database/build checks are run before publication. GitHub's own workflow badge remains authoritative for remote CI, separately from local results.

## Remaining product work

The group-room lifecycle audit, group rematches, full content review, real multiplayer network-cut sessions and hosted capacity testing remain separate from repository presentation. They are listed in [the roadmap](../ROADMAP.md), not represented as completed features.
