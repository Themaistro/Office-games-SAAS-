"use client";
import RematchControls from "@/components/game/RematchControls";
import { parseMatchEvent } from "@/features/lounge/domain/realtime-event";
import { parseChessSnapshot } from "@/features/lounge/domain/match-snapshot";
import { remainingClock as getCalculatedTime } from "@/features/lounge/domain/match-clock";
import { elapsedMilliseconds } from "@/features/lounge/domain/match-clock";
import { getMaterialAdvantage } from "@/features/lounge/domain/chess-presentation";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Chess, Square } from "chess.js";
import { Chessboard, defaultArrowOptions } from "react-chessboard";
import type { Arrow } from "react-chessboard";
import type * as Ably from "ably";
import { useGameRealtime } from "@/hooks/useGameRealtime";
import {
  updateChessGameState,
  resignChessGame,
  drawChessGame,
  declareChessTimeout,
  cancelChessGame,
} from "../actions";
import {
  Loader2,
  Flag,
  Handshake,
  Send,
  Eye,
  User,
  X as XIcon,
  Settings2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useVfx } from "@/hooks/useVfx";
import {
  MatchToolbar,
  MatchResult,
  MatchSpectator,
} from "@/components/game/MatchPresentation";
import ChessPlayerHeader from "@/components/game/chess/ChessPlayerHeader";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/ToastProvider";

const darkSquareStyle = { backgroundColor: "#739552" };
const lightSquareStyle = { backgroundColor: "#ebecd0" };

const playSound = (_type: string) => {
  try {
    const audio = new Audio("/sounds/wood-click.mp3");
    audio.play().catch((e) => console.warn("Audio play failed:", e));
  } catch (e) {}
};

export default function ChessBoardClient({
  game,
  currentUserId,
  playerColor,
}: {
  game: any;
  currentUserId: string;
  currentUserProfile: { full_name: string; avatar_url?: string };
  playerColor: "white" | "black" | "spectator";
}) {
  const [chess] = useState(new Chess());
  const [fen, setFen] = useState(
    game.fen && game.fen !== "start" ? game.fen : chess.fen(),
  );
  const [gameStatus, setGameStatus] = useState(game.status);
  const [matchResult, setMatchResult] = useState(game.result);
  const [resultReason, setResultReason] = useState<string | undefined>(
    game.result?.reason,
  );
  const [resigning, setResigning] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isOpponentConnected, setIsOpponentConnected] = useState(false);
  const [connectionIssue, setConnectionIssue] = useState(false);
  const [spectators, setSpectators] = useState<any[]>([]);
  const { triggerConfetti } = useVfx();

  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    if (gameStatus === "finished" && game.winner_id === currentUserId) {
      triggerConfetti();
    }
  }, [gameStatus, game.winner_id, currentUserId, triggerConfetti]);

  const [whiteTimeMs, setWhiteTimeMs] = useState(() =>
    getCalculatedTime(
      game.white_time_ms ?? 600000,
      chess.turn() === "w",
      game.last_move_timestamp,
      game.status,
    ),
  );
  const [blackTimeMs, setBlackTimeMs] = useState(() =>
    getCalculatedTime(
      game.black_time_ms ?? 600000,
      chess.turn() === "b",
      game.last_move_timestamp,
      game.status,
    ),
  );
  const [drawOfferedBy, setDrawOfferedBy] = useState<string | null>(null);

  // Chat State
  const [chatMessages, setChatMessages] = useState<
    { sender: string; text: string }[]
  >([]);
  const [chatInput, setChatInput] = useState("");
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Modal State
  const [showResignConfirm, setShowResignConfirm] = useState(false);

  const [optionSquares, setOptionSquares] = useState<
    Record<string, React.CSSProperties>
  >({});
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: string;
    to: string;
  } | null>(null);
  const [showNotation, setShowNotation] = useState(true);

  const router = useRouter();
  const { toast } = useToast();
  const channelRef = useRef<{ send: (payload: unknown) => void } | null>(null);
  const eventCursorRef = useRef<string | null>(game.updated_at || null);

  const sendChessEvent = useCallback(
    (payload: any) => {
      const eventType =
        payload?.event === "chat"
          ? "chat"
          : payload?.event === "offer_draw"
            ? "offer_draw"
            : payload?.event === "decline_draw"
              ? "decline_draw"
              : null;
      if (!eventType) return;
      void fetch(`/api/chess/${game.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType, payload: payload.payload || {} }),
      });
    },
    [game.id],
  );

  useEffect(() => {
    channelRef.current = { send: sendChessEvent };
    return () => {
      channelRef.current = null;
    };
  }, [sendChessEvent]);

  // Material Calculation
  const material = getMaterialAdvantage(fen);

  // Move History
  const history = chess.history();
  const movePairs = [];
  for (let i = 0; i < history.length; i += 2) {
    movePairs.push([history[i], history[i + 1]]);
  }
  const historyScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (historyScrollRef.current) {
      historyScrollRef.current.scrollTop =
        historyScrollRef.current.scrollHeight;
    }
  }, [history.length]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages.length]);

  useEffect(() => {
    if (game.pgn) {
      chess.loadPgn(game.pgn);
      setFen(chess.fen());
    }

    if (game.status) {
      setGameStatus(game.status);
    }

    if (game.white_time_ms !== undefined) {
      setWhiteTimeMs(
        getCalculatedTime(
          game.white_time_ms,
          chess.turn() === "w",
          game.last_move_timestamp,
          game.status,
        ),
      );
    }
    if (game.black_time_ms !== undefined) {
      setBlackTimeMs(
        getCalculatedTime(
          game.black_time_ms,
          chess.turn() === "b",
          game.last_move_timestamp,
          game.status,
        ),
      );
    }
  }, [game, chess]);

  useEffect(() => {
    if (gameStatus !== "in_progress") return;

    let previousTick = performance.now();
    const interval = setInterval(() => {
      const now = performance.now(),
        elapsed = elapsedMilliseconds(previousTick, now);
      previousTick = now;
      const isWhiteTurn = chess.turn() === "w";
      if (isWhiteTurn) {
        setWhiteTimeMs((prev: number) => {
          const next = Math.max(0, prev - elapsed);
          return next;
        });
      } else {
        setBlackTimeMs((prev: number) => {
          const next = Math.max(0, prev - elapsed);
          return next;
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [gameStatus, fen, chess]);

  useEffect(() => {
    if (
      gameStatus !== "in_progress" ||
      (chess.turn() === "w" ? whiteTimeMs : blackTimeMs) > 0
    )
      return;
    let active = true,
      inFlight = false;
    const settleTimeout = async () => {
      if (inFlight || !active) return;
      inFlight = true;
      try {
        await declareChessTimeout(game.id);
      } catch {
        if (active) setConnectionIssue(true);
      } finally {
        inFlight = false;
      }
    };
    void settleTimeout();
    const retry = window.setInterval(() => void settleTimeout(), 1000);
    return () => {
      active = false;
      window.clearInterval(retry);
    };
  }, [game.id, gameStatus, fen, whiteTimeMs, blackTimeMs, chess]);

  useEffect(() => {
    if (!game.id) return;
    let disposed = false;
    let pollInFlight = false;
    const controller = new AbortController();
    const refreshSnapshot = async () => {
      if (pollInFlight) return;
      pollInFlight = true;
      const requestedPosition = chess.pgn();
      try {
        const eventQuery = eventCursorRef.current
          ? `?eventsSince=${encodeURIComponent(eventCursorRef.current)}`
          : "";
        const response = await fetch(`/api/chess/${game.id}${eventQuery}`, {
          cache: "no-store",
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(10000),
          ]),
        });
        if (!response.ok) {
          if (!disposed) setConnectionIssue(true);
          return;
        }
        const next = parseChessSnapshot(await response.json(), game.id);
        if (disposed) return;
        setConnectionIssue(false);
        for (const event of next.events || []) {
          eventCursorRef.current = event.created_at;
          if (event.sender_id === currentUserId) continue;
          if (event.event_type === "chat" && event.payload?.text)
            setChatMessages((current) =>
              [
                ...current,
                { sender: event.full_name, text: event.payload.text || "" },
              ].slice(-100),
            );
          if (event.event_type === "offer_draw")
            setDrawOfferedBy(
              event.sender_id === next.white_player_id ? "white" : "black",
            );
          if (event.event_type === "decline_draw") setDrawOfferedBy(null);
        }
        setSpectators(next.spectators || []);
        setMatchResult(next.result);
        if (next.result?.reason) setResultReason(next.result.reason);
        if (chess.pgn() !== requestedPosition) return;
        if (next.status !== gameStatus) {
          setGameStatus(next.status);
        }
        if (typeof next.white_time_ms === "number")
          setWhiteTimeMs(
            getCalculatedTime(
              next.white_time_ms,
              next.fen?.split(" ")[1] === "w",
              next.last_move_timestamp,
              next.status,
            ),
          );
        if (typeof next.black_time_ms === "number")
          setBlackTimeMs(
            getCalculatedTime(
              next.black_time_ms,
              next.fen?.split(" ")[1] === "b",
              next.last_move_timestamp,
              next.status,
            ),
          );
        if (next.pgn && next.pgn !== chess.pgn()) {
          chess.loadPgn(next.pgn);
          setFen(chess.fen());
        }
        setIsOpponentConnected(
          Boolean(
            next.online_player_ids?.includes(
              (next.white_player_id === currentUserId
                ? next.black_player_id
                : next.white_player_id) || "",
            ),
          ),
        );
      } catch {
        if (!disposed) setConnectionIssue(true);
      } finally {
        pollInFlight = false;
      }
    };
    const focused = () => {
      if (document.visibilityState === "visible") void refreshSnapshot();
    };
    let nextPollAt = 0;
    const timer = window.setInterval(() => {
      if (Date.now() < nextPollAt) return;
      nextPollAt = Date.now() + (realtimeHealthy.current ? 5000 : 1000);
      focused();
    }, 500);
    window.addEventListener("office-games:match-reconnected", focused);
    window.addEventListener("focus", focused);
    window.addEventListener("online", focused);
    document.addEventListener("visibilitychange", focused);
    void refreshSnapshot();
    return () => {
      disposed = true;
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener("office-games:match-reconnected", focused);
      window.removeEventListener("focus", focused);
      window.removeEventListener("online", focused);
      document.removeEventListener("visibilitychange", focused);
    };
  }, [game.id, gameStatus, router, chess, currentUserId]);

  const realtimeHealthy = useGameRealtime(
    "chess",
    game.id,
    (message: Ably.Message) => {
      const event = parseMatchEvent(message.data);
      if (!event || event.senderId === currentUserId) return;
      if (event.type === "move" && event.payload?.fen) {
        if (event.payload.pgn && event.payload.pgn !== chess.pgn())
          chess.loadPgn(event.payload.pgn as string);
        setFen(event.payload.fen as string);
        if (event.payload.status) setGameStatus(event.payload.status as string);
        if (typeof event.payload.white_time_ms === "number")
          setWhiteTimeMs(
            getCalculatedTime(
              event.payload.white_time_ms,
              chess.turn() === "w",
              event.payload.last_move_timestamp ?? null,
              event.payload.status ?? "in_progress",
            ),
          );
        if (typeof event.payload.black_time_ms === "number")
          setBlackTimeMs(
            getCalculatedTime(
              event.payload.black_time_ms,
              chess.turn() === "b",
              event.payload.last_move_timestamp ?? null,
              event.payload.status ?? "in_progress",
            ),
          );
      }
      if (event.type === "chat" && event.payload?.text)
        setChatMessages((current) =>
          [
            ...current,
            { sender: "Opponent", text: String(event.payload?.text) },
          ].slice(-100),
        );
      if (event.type === "offer_draw")
        setDrawOfferedBy(playerColor === "white" ? "black" : "white");
      if (event.type === "decline_draw") setDrawOfferedBy(null);
      if (event.type === "game_finished" && event.payload?.status)
        setGameStatus(String(event.payload.status));
      if (event.type === "game_finished" && event.payload?.reason)
        setResultReason(event.payload.reason);
    },
    () => window.dispatchEvent(new Event("office-games:match-reconnected")),
  );

  const [moveFrom, setMoveFrom] = useState<string | null>(null);

  const choosePromotion = useCallback(
    (promotion: "q" | "r" | "b" | "n") => {
      if (!pendingPromotion) return;
      try {
        const move = chess.move({
          from: pendingPromotion.from,
          to: pendingPromotion.to,
          promotion,
        });
        if (!move) return;
        setFen(chess.fen());
        setMoveFrom(null);
        setOptionSquares({});
        playSound(move.flags.includes("c") ? "capture" : "move");
        let nextStatus = "in_progress";
        if (chess.isGameOver())
          nextStatus = chess.isCheckmate()
            ? chess.turn() === "w"
              ? "black_won"
              : "white_won"
            : "draw";
        if (nextStatus !== "in_progress") setGameStatus(nextStatus as any);
        updateChessGameState(
          game.id,
          chess.pgn(),
          chess.fen(),
          nextStatus,
          chess.turn(),
        );
      } finally {
        setPendingPromotion(null);
      }
    },
    [pendingPromotion, chess, game.id],
  );

  const onDrop = useCallback(
    ({
      sourceSquare,
      targetSquare,
    }: {
      sourceSquare: string;
      targetSquare: string | null;
    }) => {
      if (playerColor === "spectator" || gameStatus !== "in_progress")
        return false;
      if (!targetSquare) return false;

      // Only allow moving own pieces
      if (chess.turn() === "w" && playerColor !== "white") return false;
      if (chess.turn() === "b" && playerColor !== "black") return false;
      const movingPiece = chess.get(sourceSquare as Square);
      if (
        movingPiece?.type === "p" &&
        (targetSquare.endsWith("1") || targetSquare.endsWith("8"))
      ) {
        setPendingPromotion({ from: sourceSquare, to: targetSquare });
        return false;
      }

      try {
        const move = chess.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: "q",
        });

        if (move === null) return false;

        // Update state instantly for immediate visual feedback
        setFen(chess.fen());
        setMoveFrom(null);
        setOptionSquares({});

        if (chess.isCheck()) {
          playSound("check");
        } else if (move.flags.includes("k") || move.flags.includes("q")) {
          playSound("castle");
        } else if (move.flags.includes("c") || move.flags.includes("e")) {
          playSound("capture");
        } else {
          playSound("move");
        }

        channelRef.current?.send({
          type: "broadcast",
          event: "move",
          payload: move,
        });

        let nextStatus = "in_progress";
        if (chess.isGameOver()) {
          if (chess.isCheckmate())
            nextStatus = chess.turn() === "w" ? "black_won" : "white_won";
          else nextStatus = "draw";
          setGameStatus(nextStatus as any);
        }

        updateChessGameState(
          game.id,
          chess.pgn(),
          chess.fen(),
          nextStatus,
          chess.turn(),
        );

        return true;
      } catch (e) {
        setMoveFrom(null);
        setOptionSquares({});
        return false;
      }
    },
    [playerColor, gameStatus, chess, game.id],
  );

  const getMoveOptions = useCallback(
    (square: Square) => {
      const moves = chess.moves({
        square,
        verbose: true,
      });
      if (moves.length === 0) {
        setOptionSquares({});
        return;
      }

      const newSquares: Record<string, React.CSSProperties> = {};
      moves.map((move) => {
        const isCapture = chess.get(move.to as Square);
        newSquares[move.to] = {
          background: isCapture
            ? "radial-gradient(transparent 0%, transparent 65%, rgba(0,0,0,.35) 65%, rgba(0,0,0,.35) 85%, transparent 85%)"
            : "radial-gradient(circle, rgba(0,0,0,.35) 20%, transparent 20%)",
          borderRadius: "50%",
        };
      });
      newSquares[square] = {
        background: "rgba(255, 255, 0, 0.4)",
      };
      setOptionSquares(newSquares);
    },
    [chess],
  );

  // Compute all square styles dynamically, memoized to prevent re-renders breaking drag
  const computedSquareStyles = React.useMemo(() => {
    const styles = { ...optionSquares };

    // 1. Highlight last move
    const chessHistory = chess.history({ verbose: true });
    if (chessHistory.length > 0) {
      const lastMove = chessHistory[chessHistory.length - 1];
      if (!styles[lastMove.from]) {
        styles[lastMove.from] = { background: "rgba(245, 190, 66, 0.42)" };
      }
      if (!styles[lastMove.to]) {
        styles[lastMove.to] = { background: "rgba(245, 190, 66, 0.42)" };
      }
    }

    // 2. Highlight King in check
    if (chess.isCheck() || chess.isCheckmate()) {
      const board = chess.board();
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
          const piece = board[i][j];
          if (piece && piece.type === "k" && piece.color === chess.turn()) {
            styles[piece.square] = {
              ...styles[piece.square],
              background:
                "radial-gradient(circle, rgba(255,51,51,0.9) 10%, rgba(255,51,51,0.4) 40%, rgba(255,51,51,0) 85%)",
              borderRadius: "50%",
            };
          }
        }
      }
    }
    return styles;
  }, [optionSquares, fen]);

  const onSquareClick = useCallback(
    ({ square }: { square: string | null }) => {
      if (!square) return;
      if (playerColor === "spectator" || gameStatus !== "in_progress") return;

      const isOurTurn =
        (chess.turn() === "w" && playerColor === "white") ||
        (chess.turn() === "b" && playerColor === "black");
      if (!isOurTurn) return;

      if (!moveFrom) {
        const piece = chess.get(square as Square);
        if (piece && piece.color === chess.turn()) {
          setMoveFrom(square);
          getMoveOptions(square as Square);
        }
        return;
      }

      const piece = chess.get(square as Square);
      if (piece && piece.color === chess.turn()) {
        setMoveFrom(square);
        getMoveOptions(square as Square);
        return;
      }

      try {
        const movingPiece = chess.get(moveFrom as Square);
        if (
          movingPiece?.type === "p" &&
          (square.endsWith("1") || square.endsWith("8"))
        ) {
          setPendingPromotion({ from: moveFrom, to: square });
          return;
        }
        const move = chess.move({
          from: moveFrom,
          to: square,
          promotion: "q",
        });

        if (move === null) {
          setMoveFrom(null);
          setOptionSquares({});
          return;
        }

        setFen(chess.fen());
        setMoveFrom(null);
        setOptionSquares({});

        if (chess.isCheck()) {
          playSound("check");
        } else if (move.flags.includes("k") || move.flags.includes("q")) {
          playSound("castle");
        } else if (move.flags.includes("c") || move.flags.includes("e")) {
          playSound("capture");
        } else {
          playSound("move");
        }

        channelRef.current?.send({
          type: "broadcast",
          event: "move",
          payload: move,
        });

        let nextStatus = "in_progress";
        if (chess.isGameOver()) {
          if (chess.isCheckmate())
            nextStatus = chess.turn() === "w" ? "black_won" : "white_won";
          else nextStatus = "draw";
          setGameStatus(nextStatus as any);
        }

        updateChessGameState(
          game.id,
          chess.pgn(),
          chess.fen(),
          nextStatus,
          chess.turn(),
        );
      } catch (e) {
        setMoveFrom(null);
        setOptionSquares({});
      }
    },
    [playerColor, gameStatus, chess, moveFrom, getMoveOptions, game.id],
  );

  const handleResign = async () => {
    setShowResignConfirm(true);
  };

  const confirmResign = async () => {
    if (resigning) return;
    setResigning(true);
    setShowResignConfirm(false);
    try {
      const result = await resignChessGame(game.id);
      setResultReason(result.reason);
      setGameStatus(result.status);
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : "Could not resign. Please retry.",
      );
    } finally {
      setResigning(false);
    }
  };

  const handleOfferDraw = async () => {
    const result = await drawChessGame(game.id);
    if (!result.success) {
      toast(result.error || "Draw offer failed");
      return;
    }
    channelRef.current?.send({
      type: "broadcast",
      event: "offer_draw",
      payload: { color: playerColor },
    });
    setDrawOfferedBy(playerColor);
  };

  const handleAcceptDraw = async () => {
    setDrawOfferedBy(null);
    const res = await drawChessGame(game.id);
    if (res && !res.success) toast("Failed to draw: " + res.error);
  };

  const handleDeclineDraw = () => {
    channelRef.current?.send({
      type: "broadcast",
      event: "decline_draw",
      payload: {},
    });
    setDrawOfferedBy(null);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const msg = {
      sender:
        playerColor === "white" ? game.white?.full_name : game.black?.full_name,
      text: chatInput.trim(),
    };
    setChatMessages((prev) => [...prev, msg]);
    channelRef.current?.send({
      type: "broadcast",
      event: "chat",
      payload: msg,
    });
    setChatInput("");
  };

  let derivedGameOver: { title: string; reason: string } | null = null;
  if (gameStatus === "white_won") {
    derivedGameOver = {
      title: `${game.white?.full_name || "White"} wins`,
      reason: chess.isCheckmate() ? "by Checkmate" : "by Resignation / Timeout",
    };
  } else if (gameStatus === "black_won") {
    derivedGameOver = {
      title: `${game.black?.full_name || "Black"} wins`,
      reason: chess.isCheckmate() ? "by Checkmate" : "by Resignation / Timeout",
    };
  } else if (gameStatus === "draw") {
    derivedGameOver = {
      title: "Game Drawn",
      reason: "by Agreement or Stalemate",
    };
  }
  if (derivedGameOver && resultReason) {
    const reasons: Record<string, string> = {
      checkmate: "Decided by checkmate",
      timeout: "Decided on time",
      resignation: "Decided by resignation",
      resigned_to_accept_invite:
        "Opponent resigned to accept another invitation",
      agreement: "Draw agreed by both players",
      stalemate: "Draw by stalemate",
      draw: "Match drawn",
    };
    derivedGameOver.reason = reasons[resultReason] || "Result recorded";
  }

  return (
    <section className="match-room space-y-6">
      <MatchToolbar
        title="Chess"
        status={
          derivedGameOver?.title ||
          (gameStatus === "waiting"
            ? "Waiting for an opponent"
            : `${chess.turn() === "w" ? game.white?.full_name || "White" : game.black?.full_name || "Black"}’s turn`)
        }
        disconnected={connectionIssue}
        finished={Boolean(derivedGameOver)}
      />
      <div className="grid grid-cols-[minmax(0,1fr)_320px] items-start gap-6">
        {/* Left: Chess Board */}
        <div className="min-w-0 flex flex-col gap-4">
          {/* Top Player (Opponent) */}
          <ChessPlayerHeader
            color={playerColor === "white" ? "black" : "white"}
            game={game}
            whiteTimeMs={whiteTimeMs}
            blackTimeMs={blackTimeMs}
            material={material}
            gameStatus={gameStatus}
            turn={chess.turn()}
            mounted={isMounted}
          />

          {playerColor === "spectator" && (
            <MatchSpectator count={spectators.length} />
          )}
          <div className="w-full aspect-square rounded-2xl overflow-hidden border-[6px] border-border bg-secondary relative shadow-sm">
            <Chessboard
              key={playerColor}
              options={{
                position: fen,
                boardOrientation: playerColor === "black" ? "black" : "white",
                darkSquareStyle,
                lightSquareStyle,
                boardStyle: { borderRadius: "0.5rem", overflow: "hidden" },
                animationDurationInMs: 180,
                allowDrawingArrows: true,
                arrows,
                onArrowsChange: ({ arrows: nextArrows }) =>
                  setArrows(nextArrows),
                clearArrowsOnClick: true,
                arrowOptions: {
                  ...defaultArrowOptions,
                  colors: {
                    default: "rgba(245, 190, 66, 0.9)",
                    shift: "rgba(96, 165, 250, 0.9)",
                    ctrl: "rgba(248, 113, 113, 0.9)",
                    alt: "rgba(74, 222, 128, 0.9)",
                    meta: "rgba(192, 132, 252, 0.9)",
                  },
                  opacity: 0.9,
                  activeOpacity: 1,
                },
                showNotation,
                onPieceDrop: ({ sourceSquare, targetSquare }) =>
                  onDrop({ sourceSquare, targetSquare }),
                canDragPiece: () => {
                  if (
                    playerColor === "spectator" ||
                    gameStatus !== "in_progress"
                  )
                    return false;
                  const isOurTurn =
                    (chess.turn() === "w" && playerColor === "white") ||
                    (chess.turn() === "b" && playerColor === "black");
                  if (!isOurTurn) return false;
                  return true;
                },
                onPieceDrag: ({ square }) => {
                  if (square) {
                    getMoveOptions(square as Square);
                  }
                },
                onSquareMouseDown: ({ square }) => {
                  if (square) {
                    getMoveOptions(square as Square);
                  }
                },
                onSquareClick: ({ square }) => onSquareClick({ square }),
                squareStyles: computedSquareStyles,
              }}
            />

            {pendingPromotion && (
              <div className="absolute inset-0 z-[170] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-label="Choose promotion piece"
                  className="w-full max-w-xs rounded-2xl border border-border bg-card p-5 text-center shadow-2xl"
                >
                  <p className="text-lg font-black">Choose your promotion</p>
                  <p className="mt-1 text-xs font-medium text-muted-foreground">
                    Select the piece your pawn becomes.
                  </p>
                  <div className="mt-4 grid grid-cols-4 gap-2">
                    {(
                      [
                        ["q", "♛", "Queen"],
                        ["r", "♜", "Rook"],
                        ["b", "♝", "Bishop"],
                        ["n", "♞", "Knight"],
                      ] as const
                    ).map(([piece, symbol, label]) => (
                      <button
                        key={piece}
                        type="button"
                        onClick={() => choosePromotion(piece)}
                        className="rounded-xl border border-border bg-background p-3 transition hover:border-primary hover:bg-primary/10"
                        aria-label={`Promote to ${label}`}
                      >
                        <span className="block text-3xl leading-none">
                          {symbol}
                        </span>
                        <span className="mt-1 block text-[10px] font-bold text-muted-foreground">
                          {label}
                        </span>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingPromotion(null)}
                    className="mt-4 text-xs font-bold text-muted-foreground hover:text-foreground"
                  >
                    Cancel move
                  </button>
                </div>
              </div>
            )}

            <ConfirmModal
              isOpen={showResignConfirm}
              onClose={() => setShowResignConfirm(false)}
              onConfirm={() => void confirmResign()}
              title="Resign this match?"
              message="Your opponent will win and your Lounge rank will be updated."
              confirmText="Resign match"
            />
          </div>

          {/* Bottom Player (You) */}
          <ChessPlayerHeader
            color={playerColor === "white" ? "white" : "black"}
            game={game}
            whiteTimeMs={whiteTimeMs}
            blackTimeMs={blackTimeMs}
            material={material}
            gameStatus={gameStatus}
            turn={chess.turn()}
            mounted={isMounted}
          />
          {derivedGameOver && (
            <MatchResult
              title={derivedGameOver.title}
              description={`${derivedGameOver.reason}. The final board stays open for review.`}
            >
              {playerColor !== "spectator" && matchResult && (
                <span className="rounded-xl bg-card px-3 py-2 text-sm font-bold text-primary">
                  {Number(
                    matchResult.player1_id === currentUserId
                      ? matchResult.player1_lp_delta
                      : matchResult.player2_lp_delta,
                  ) >= 0
                    ? "+"
                    : ""}
                  {matchResult.player1_id === currentUserId
                    ? matchResult.player1_lp_delta
                    : matchResult.player2_lp_delta}{" "}
                  Lounge LP
                </span>
              )}
              {playerColor !== "spectator" && (
                <RematchControls type="chess" sourceId={game.id} />
              )}
            </MatchResult>
          )}
        </div>

        {/* Right: Sidebar */}
        <div className="match-panel flex min-h-[640px] max-h-[850px] flex-col overflow-hidden">
          {drawOfferedBy &&
            drawOfferedBy !== playerColor &&
            playerColor !== "spectator" &&
            gameStatus === "in_progress" && (
              <section
                className="border-b border-border bg-primary/5 p-5"
                aria-label="Draw offer"
              >
                <p className="text-sm font-bold">
                  Your opponent offered a draw
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Accept to end the match as a draw, or decline to keep playing.
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={handleDeclineDraw}
                    className="match-button match-button-secondary flex-1"
                  >
                    Decline
                  </button>
                  <button
                    onClick={handleAcceptDraw}
                    className="match-button match-button-primary flex-1"
                  >
                    Accept draw
                  </button>
                </div>
              </section>
            )}
          {/* Match controls */}
          <div className="p-4 border-b border-border bg-muted/30">
            <div
              className="font-bold text-center mb-3 text-lg"
              aria-live="polite"
            >
              {gameStatus === "waiting" ? (
                <span className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 size={16} className="animate-spin" /> Waiting for
                  Opponent
                </span>
              ) : gameStatus === "white_won" ? (
                derivedGameOver?.title
              ) : gameStatus === "black_won" ? (
                derivedGameOver?.title
              ) : gameStatus === "draw" ? (
                "Game Drawn"
              ) : (chess.turn() === "w" && playerColor === "white") ||
                (chess.turn() === "b" && playerColor === "black") ? (
                "Your Turn"
              ) : playerColor === "spectator" ? (
                `${chess.turn() === "w" ? game.white?.full_name || "White" : game.black?.full_name || "Black"}’s turn`
              ) : (
                "Opponent’s turn"
              )}
            </div>
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={() => setShowNotation((visible) => !visible)}
                className="match-button match-button-secondary"
                aria-pressed={showNotation}
              >
                <Settings2 size={13} />{" "}
                {showNotation ? "Hide coordinates" : "Show coordinates"}
              </button>
            </div>

            {gameStatus === "waiting" && playerColor !== "spectator" && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={async () => {
                    try {
                      await cancelChessGame(game.id);
                      router.push("/office-lounge");
                    } catch (e: any) {
                      if (e.message === "NEXT_REDIRECT") throw e;
                      toast("Failed to cancel: " + e.message);
                    }
                  }}
                  className="match-button match-button-secondary flex-1"
                >
                  <XIcon size={14} /> Cancel Game
                </button>
              </div>
            )}

            {gameStatus === "in_progress" && playerColor !== "spectator" && (
              <div className="flex gap-2">
                <button
                  onClick={handleResign}
                  disabled={resigning}
                  className="match-button match-button-danger flex-1"
                >
                  <Flag size={14} /> Resign match
                </button>
                <button
                  onClick={handleOfferDraw}
                  className="match-button match-button-secondary flex-1"
                >
                  <Handshake size={14} /> Offer draw
                </button>
              </div>
            )}

            {gameStatus === "in_progress" && playerColor !== "spectator" && (
              <div className="mt-3 flex items-center justify-center gap-2 text-[11px] font-bold text-muted-foreground">
                <span
                  className={`h-2 w-2 rounded-full ${isOpponentConnected ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`}
                />
                {isOpponentConnected
                  ? "Opponent online"
                  : "Opponent offline or reconnecting"}
              </div>
            )}

            {drawOfferedBy &&
              drawOfferedBy === playerColor &&
              gameStatus === "in_progress" && (
                <div className="mt-2 text-center text-xs text-muted-foreground italic animate-pulse">
                  Draw offer sent to opponent...
                </div>
              )}
          </div>

          {/* Spectators */}
          {spectators.length > 0 && (
            <div className="bg-muted/50 p-2 text-xs flex flex-col gap-1 border-b border-border">
              <div className="flex items-center gap-2 font-bold text-muted-foreground">
                <Eye size={14} /> {spectators.length} Spectator
                {spectators.length !== 1 ? "s" : ""}
              </div>
              <div className="flex flex-wrap gap-2 mt-1">
                {spectators.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 bg-background border border-border px-2 py-1 rounded-full shadow-sm"
                  >
                    {s.avatar_url ? (
                      <img
                        src={s.avatar_url}
                        alt={`${s.full_name || "Spectator"} avatar`}
                        className="w-4 h-4 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-secondary flex items-center justify-center text-[8px]">
                        <User size={8} />
                      </div>
                    )}
                    <span className="font-medium truncate max-w-[80px]">
                      {s.full_name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 className="text-sm font-bold">Move history</h2>
            <span className="text-xs text-muted-foreground">
              {movePairs.length} turn{movePairs.length === 1 ? "" : "s"}
            </span>
          </div>
          {/* Move History */}
          <div
            className="flex-1 overflow-y-auto bg-background p-0"
            ref={historyScrollRef}
          >
            {movePairs.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                Opening moves will appear here.
              </p>
            )}
            <table
              aria-label="Move history"
              className="w-full text-sm text-left border-collapse"
            >
              <tbody className="divide-y divide-border/50">
                {movePairs.map((pair, i) => (
                  <tr key={i} className="even:bg-muted/20">
                    <td className="py-2 px-4 text-muted-foreground font-mono w-12 border-r border-border/50 text-center bg-muted/10">
                      {i + 1}.
                    </td>
                    <td className="py-2 px-4 font-semibold">{pair[0]}</td>
                    <td className="py-2 px-4 font-semibold">{pair[1] || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Chat Box */}
          <div className="h-[220px] shrink-0 flex flex-col border-t border-border">
            <h2 className="px-4 pt-4 text-sm font-bold">Match chat</h2>
            <div
              className="flex-1 p-3 overflow-y-auto bg-muted/10 flex flex-col gap-2"
              ref={chatScrollRef}
            >
              {chatMessages.length === 0 && (
                <div className="text-xs text-muted-foreground text-center mt-4">
                  Say hello to your opponent.
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className="text-sm">
                  <span className="font-bold opacity-75">{msg.sender}: </span>
                  <span>{msg.text}</span>
                </div>
              ))}
            </div>
            {playerColor !== "spectator" && (
              <form
                onSubmit={handleSendChat}
                className="p-2 bg-card border-t border-border flex gap-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  aria-label="Match chat message"
                  maxLength={500}
                  placeholder="Send a message..."
                  className="min-w-0 flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="submit"
                  aria-label="Send match message"
                  disabled={!chatInput.trim()}
                  className="match-button match-button-primary px-3"
                >
                  <Send size={14} />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
