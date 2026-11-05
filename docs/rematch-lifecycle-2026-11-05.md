# Shared rematch lifecycle

All three board games render `RematchControls` and use the same authenticated rematch actions and Lounge service. The old Tic-Tac-Toe rematch action delegates to that service. There is one creation/acceptance rule set rather than three button-specific implementations.

| Situation | Behavior |
| --- | --- |
| Opponent left the lounge or navigated elsewhere | Invitation remains available through global notifications. Their current page does not determine eligibility. |
| Opponent offline | Show offline context and leave the invitation pending for up to 30 minutes. |
| Opponent playing another match | Deliver the invite; acceptance from notifications or rematch controls uses the shared active-game/loss confirmation. No silent forfeiture. |
| Sender started another match after inviting | Acceptance fails without resigning the sender's new match. The existing invitation remains pending. |
| Declined | Show the declined state, distinguish who declined, and enable another invitation. |
| Ignored/expired | Show expired; retry removes the stale pending row under participant locks before creating a fresh invite. |
| Cancelled | Show cancelled; repeated cancellation is safe. An acceptance that wins the race is reported as accepted. |
| Repeated clicks / another tab | Reuse the same pending invitation. |
| Both players request simultaneously | The reciprocal request accepts the existing invitation, producing one active game. |
| Refresh or return to old result screen | Restore the tracked invitation from session storage and re-read authoritative state. |
| Rematch finishes before navigation | Show completed and a Review rematch link. |
| Spectator / unfinished source / disabled or missing player | Reject the request with a clear result; no new game is created. |
| Deleted invitation | Show unavailable and allow retry. |
| Temporary read failure | Preserve the invitation state, display the read error, and clear it after recovery. |

Request/cancel operations invalidate older UI reads. The sender navigation coordinator suppresses duplicate redirects. Rematch business errors return explicit serializable responses so production error masking does not hide useful messages. Incoming rematches and notification bubbles share `useInvitationActions` and `InviteSwitchConfirmation`, including Daily Mission saving and current-game loss warnings.

The local fixture suite contains 34 scenarios: eleven groups for each board game plus server-action error transport. A reciprocal request from an active Daily Mission remains an incoming invitation so its acceptance warning cannot be bypassed. The suite exercises real database locks and settlement and removes its temporary users/games. Automated coverage does not mean every browser/network timing combination has been manually played.
