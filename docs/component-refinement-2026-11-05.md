# Component and game contract refinement

Both profile pages share `MissionHistoryList`, preserving their existing separate empty states and navigation. Global/department ranking is now an application service with a typed repository contract; composition supplies PostgreSQL counts. Admin rank, missing names/departments, and XP/name tie behavior are retained. Independent ranking counts run concurrently.

Chess player identity/material/clock presentation lives in `ChessPlayerHeader`; material calculation is a framework-free Lounge domain helper. The board still owns live synchronization, moves and annotations; those stateful behaviors were not moved as part of this extraction.

All 16 challenge renderers use `GameComponentPropsFor<kind>` with focused content fields. Optional seed/content fields preserve supported ID-based and legacy fallbacks. Shared result hints use `ChallengeAnswerOptions`, and server-authoritative validation returns `ValidatedChallengeResult` and accepts typed question content instead of an unrestricted record. Answer serialization and XP/timing rules are unchanged.

Regression coverage includes profile ranking ties, admin/missing department handling, chess material display, existing question validation, actual assembled mission reads for all 15 active games, and the shared gameplay suite. No new multiplayer game was added in this refinement.
