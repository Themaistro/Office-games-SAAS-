import { MatchPlayer } from "../MatchPresentation";
type Player = {
  full_name?: string;
  avatar_url?: string;
  lounge_lp?: number;
  chess_elo?: number;
};
type Props = {
  color: "white" | "black";
  game: { white?: Player; black?: Player };
  whiteTimeMs: number;
  blackTimeMs: number;
  material: { white: number; black: number };
  gameStatus: string;
  turn: string;
  mounted: boolean;
};
export default function ChessPlayerHeader({
  color,
  game,
  whiteTimeMs,
  blackTimeMs,
  material,
  gameStatus,
  turn,
  mounted,
}: Props) {
  const player = color === "white" ? game.white : game.black;
  const time = color === "white" ? whiteTimeMs : blackTimeMs,
    advantage = material[color];
  const active = gameStatus === "in_progress" && turn === color.charAt(0);
  const seconds = Math.floor(time / 1000),
    clock = `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;
  return (
    <MatchPlayer
      name={player?.full_name}
      avatar={player?.avatar_url}
      lp={player?.lounge_lp}
      side={color === "white" ? "White" : "Black"}
      active={active}
      detail={`${advantage > 0 ? `Material +${advantage}` : "Even material"} · Chess rating ${player?.chess_elo ?? "—"}`}
    >
      <div
        aria-label={`${color} clock`}
        className={`match-clock ${active && time <= 60000 && time > 0 ? "match-clock-low" : ""}`}
      >
        {mounted ? clock : "--:--"}
      </div>
    </MatchPlayer>
  );
}
