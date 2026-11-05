export function matchResultDescription(reason?: string) {
  const descriptions: Record<string, string> = {
    resignation: "The match was won by resignation.",
    resigned_to_accept_invite:
      "The opponent resigned to accept another invitation.",
    timeout: "The match was decided on time.",
    line: "The winning line completed the match.",
    agreement: "Both players agreed to a draw.",
    draw: "The match ended in a draw.",
    stalemate: "The match ended by stalemate.",
    checkmate: "The match was won by checkmate.",
  };
  return `${descriptions[reason || ""] || "Match complete."} The final board stays open for review.`;
}
