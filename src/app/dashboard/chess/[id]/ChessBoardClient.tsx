"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Chess, Square } from "chess.js";
import { Chessboard, defaultArrowOptions } from "react-chessboard";
import type { Arrow } from "react-chessboard";
import * as Ably from "ably";
import { getGameChannelName } from "@/lib/realtime";
import { updateChessGameState, resignChessGame, drawChessGame, declareChessTimeout, cancelChessGame } from "../actions";
import { Loader2, Flag, Handshake, Send, Eye, User, X as XIcon, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useVfx } from "@/hooks/useVfx";
import { useToast } from "@/components/ui/ToastProvider";

const darkSquareStyle = { backgroundColor: "#739552" };
const lightSquareStyle = { backgroundColor: "#ebecd0" };

const playSound = (type?: string) => {
  try {
    const audio = new Audio('/sounds/wood-click.mp3');
    audio.play().catch(e => console.warn('Audio play failed:', e));
  } catch (e) {}
};

export default function ChessBoardClient({ 
  game, 
  currentUserId, 
  currentUserProfile, 
  playerColor 
}: { 
  game: any, 
  currentUserId: string, 
  currentUserProfile: { full_name: string, avatar_url?: string },
  playerColor: "white" | "black" | "spectator" 
}) {
  const [chess] = useState(new Chess());
  const [fen, setFen] = useState(game.fen && game.fen !== "start" ? game.fen : chess.fen());
  const [gameStatus, setGameStatus] = useState(game.status);
  const [isMounted, setIsMounted] = useState(false);
  const [isOpponentConnected, setIsOpponentConnected] = useState(false);
  const [connectionIssue, setConnectionIssue] = useState(false);
  const [spectators, setSpectators] = useState<any[]>([]);
  const { triggerConfetti } = useVfx();

  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    if (gameStatus === 'finished' && game.winner_id === currentUserId) {
      triggerConfetti();
    }
  }, [gameStatus, game.winner_id, currentUserId, triggerConfetti]);
  
  const getCalculatedTime = (baseTime: number, isMyTurn: boolean, lastMoveStamp: string | null, status: string) => {
    if (status === 'in_progress' && isMyTurn && lastMoveStamp) {
      const elapsed = Date.now() - new Date(lastMoveStamp).getTime();
      return Math.max(0, baseTime - elapsed);
    }
    return baseTime || 600000;
  };

  const [whiteTimeMs, setWhiteTimeMs] = useState(() => getCalculatedTime(game.white_time_ms || 600000, chess.turn() === 'w', game.last_move_timestamp, game.status));
  const [blackTimeMs, setBlackTimeMs] = useState(() => getCalculatedTime(game.black_time_ms || 600000, chess.turn() === 'b', game.last_move_timestamp, game.status));
  const [drawOfferedBy, setDrawOfferedBy] = useState<string | null>(null);
  
  // Chat State
  const [chatMessages, setChatMessages] = useState<{sender: string, text: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Modal State
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [dismissedGameOver, setDismissedGameOver] = useState(false);

  const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null);
  const [showNotation, setShowNotation] = useState(true);

  const router = useRouter();
  const { toast } = useToast();
  const channelRef = useRef<{ send: (payload: unknown) => void } | null>(null);
  const pollInFlightRef = useRef(false);
  const eventCursorRef = useRef<string | null>(game.updated_at || null);

  const sendChessEvent = useCallback((payload: any) => {
    const eventType = payload?.event === "chat" ? "chat" : payload?.event === "offer_draw" ? "offer_draw" : payload?.event === "decline_draw" ? "decline_draw" : null;
    if (!eventType) return;
    void fetch(`/api/chess/${game.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventType, payload: payload.payload || {} }) });
  }, [game.id]);

  useEffect(() => { channelRef.current = { send: sendChessEvent }; return () => { channelRef.current = null; }; }, [sendChessEvent]);

  // Material Calculation
  const getMaterialAdvantage = (fenString: string) => {
    const values = { p: 1, n: 3, b: 3, r: 5, q: 9 };
    const pieces = fenString.split(" ")[0];
    let w = 0; let b = 0;
    for (const char of pieces) {
      if (Object.keys(values).includes(char.toLowerCase())) {
        const val = values[char.toLowerCase() as keyof typeof values];
        if (char === char.toUpperCase()) w += val;
        else b += val;
      }
    }
    return { white: Math.max(0, w - b), black: Math.max(0, b - w) };
  };
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
      historyScrollRef.current.scrollTop = historyScrollRef.current.scrollHeight;
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
    
    if (game.status && game.status !== gameStatus) {
      setGameStatus(game.status);
    }
    
    if (game.white_time_ms !== undefined) {
      setWhiteTimeMs(getCalculatedTime(game.white_time_ms, chess.turn() === 'w', game.last_move_timestamp, game.status));
    }
    if (game.black_time_ms !== undefined) {
      setBlackTimeMs(getCalculatedTime(game.black_time_ms, chess.turn() === 'b', game.last_move_timestamp, game.status));
    }
  }, [game, chess, gameStatus]);

  useEffect(() => {
    if (gameStatus !== "in_progress") return;

    const interval = setInterval(() => {
      const isWhiteTurn = chess.turn() === "w";
      if (isWhiteTurn) {
        setWhiteTimeMs((prev: number) => {
          const next = Math.max(0, prev - 100);
          if (next === 0 && prev > 0) setTimeout(() => declareChessTimeout(game.id), 0);
          return next;
        });
      } else {
        setBlackTimeMs((prev: number) => {
          const next = Math.max(0, prev - 100);
          if (next === 0 && prev > 0) setTimeout(() => declareChessTimeout(game.id), 0);
          return next;
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [gameStatus, fen, chess]);

  useEffect(() => {
    if (!game.id || ["white_won", "black_won", "draw"].includes(gameStatus)) return;
    const timer = window.setInterval(async () => {
      if (pollInFlightRef.current) return;
      pollInFlightRef.current = true;
      try {
        const eventQuery = eventCursorRef.current ? `?eventsSince=${encodeURIComponent(eventCursorRef.current)}` : "";
      const response = await fetch(`/api/chess/${game.id}${eventQuery}`, { cache: "no-store" });
      if (!response.ok) { setConnectionIssue(true); return; }
      const next = await response.json();
      setConnectionIssue(false);
      for (const event of next.events || []) {
        eventCursorRef.current = event.created_at;
        if (event.sender_id === currentUserId) continue;
        if (event.event_type === "chat" && event.payload?.text) setChatMessages((current) => [...current, { sender: event.full_name, text: event.payload.text }].slice(-100));
        if (event.event_type === "offer_draw") setDrawOfferedBy(event.sender_id === next.white_player_id ? "white" : "black");
        if (event.event_type === "decline_draw") setDrawOfferedBy(null);
      }
      setSpectators(next.spectators || []);
      if (next.status !== gameStatus) { setGameStatus(next.status); router.refresh(); }
      if (typeof next.white_time_ms === "number") setWhiteTimeMs(next.white_time_ms);
      if (typeof next.black_time_ms === "number") setBlackTimeMs(next.black_time_ms);
      if (next.pgn && next.pgn !== chess.pgn()) { chess.loadPgn(next.pgn); setFen(chess.fen()); }
      setIsOpponentConnected(Boolean(next.white_player_id && next.black_player_id));
      } catch {
        setConnectionIssue(true);
      } finally {
        pollInFlightRef.current = false;
      }
    }, 200);
    return () => window.clearInterval(timer);
  }, [game.id, gameStatus, router, chess, currentUserId]);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_ABLY_KEY;
    if (!key || !game.id) return;
    const realtime = new Ably.Realtime({ key, echoMessages: false });
    const channel = realtime.channels.get(getGameChannelName("chess", game.id));
    const handleMessage = (message: Ably.Message) => {
      const event = message.data as { type?: string; senderId?: string; payload?: Record<string, any> };
      if (!event || event.senderId === currentUserId) return;
      if (event.type === "move" && event.payload?.fen) {
        if (event.payload.pgn && event.payload.pgn !== chess.pgn()) chess.loadPgn(event.payload.pgn as string);
        setFen(event.payload.fen as string);
        if (event.payload.status) setGameStatus(event.payload.status as string);
        if (typeof event.payload.white_time_ms === "number") setWhiteTimeMs(event.payload.white_time_ms);
        if (typeof event.payload.black_time_ms === "number") setBlackTimeMs(event.payload.black_time_ms);
      }
      if (event.type === "chat" && event.payload?.text) setChatMessages((current) => [...current, { sender: "Opponent", text: String(event.payload?.text) }].slice(-100));
      if (event.type === "offer_draw") setDrawOfferedBy(playerColor === "white" ? "black" : "white");
      if (event.type === "decline_draw") setDrawOfferedBy(null);
      if (event.type === "game_finished" && event.payload?.status) setGameStatus(String(event.payload.status));
    };
    void channel.subscribe(handleMessage).catch(() => setConnectionIssue(true));
    return () => {
      try { channel.unsubscribe(handleMessage); } catch { /* Ably may already be closed during a fast refresh. */ }
      try { realtime.close(); } catch { /* Ably may already be closed during a fast refresh. */ }
    };
  }, [game.id, currentUserId, playerColor, chess]);

  const [moveFrom, setMoveFrom] = useState<string | null>(null);

  const choosePromotion = useCallback((promotion: "q" | "r" | "b" | "n") => {
    if (!pendingPromotion) return;
    try {
      const move = chess.move({ from: pendingPromotion.from, to: pendingPromotion.to, promotion });
      if (!move) return;
      setFen(chess.fen());
      setMoveFrom(null);
      setOptionSquares({});
      playSound(move.flags.includes("c") ? "capture" : "move");
      let nextStatus = "in_progress";
      if (chess.isGameOver()) nextStatus = chess.isCheckmate() ? (chess.turn() === "w" ? "black_won" : "white_won") : "draw";
      if (nextStatus !== "in_progress") setGameStatus(nextStatus as any);
      updateChessGameState(game.id, chess.pgn(), chess.fen(), nextStatus, chess.turn());
    } finally {
      setPendingPromotion(null);
    }
  }, [pendingPromotion, chess, game.id]);

  const onDrop = useCallback(({ sourceSquare, targetSquare }: { sourceSquare: string, targetSquare: string | null }) => {
    if (playerColor === "spectator" || gameStatus !== "in_progress") return false;
    if (!targetSquare) return false;

    // Only allow moving own pieces
    if (chess.turn() === "w" && playerColor !== "white") return false;
    if (chess.turn() === "b" && playerColor !== "black") return false;
    const movingPiece = chess.get(sourceSquare as Square);
    if (movingPiece?.type === "p" && (targetSquare.endsWith("1") || targetSquare.endsWith("8"))) {
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
        playSound('check');
      } else if (move.flags.includes('k') || move.flags.includes('q')) {
        playSound('castle');
      } else if (move.flags.includes('c') || move.flags.includes('e')) {
        playSound('capture');
      } else {
        playSound('move');
      }
      
      channelRef.current?.send({
        type: 'broadcast',
        event: 'move',
        payload: move
      });

      let nextStatus = "in_progress";
      if (chess.isGameOver()) {
        if (chess.isCheckmate()) nextStatus = chess.turn() === "w" ? "black_won" : "white_won";
        else nextStatus = "draw";
        setGameStatus(nextStatus as any);
      }

      updateChessGameState(game.id, chess.pgn(), chess.fen(), nextStatus, chess.turn());

      return true;
    } catch (e) {
      setMoveFrom(null);
      setOptionSquares({});
      return false;
    }
  }, [playerColor, gameStatus, chess, game.id]);

  const getMoveOptions = useCallback((square: Square) => {
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
  }, [chess]);

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
          if (piece && piece.type === 'k' && piece.color === chess.turn()) {
            styles[piece.square] = { 
              ...styles[piece.square],
              background: "radial-gradient(circle, rgba(255,51,51,0.9) 10%, rgba(255,51,51,0.4) 40%, rgba(255,51,51,0) 85%)",
              borderRadius: "50%"
            };
          }
        }
      }
    }
    return styles;
  }, [optionSquares, fen]);

  const onPieceDrag = useCallback(({ square }: { square: string | null }) => {
    if (playerColor === "spectator" || gameStatus !== "in_progress") return;
    if (square) {
      getMoveOptions(square as Square);
    }
  }, [playerColor, gameStatus, getMoveOptions]);

  const onSquareClick = useCallback(({ square }: { square: string | null }) => {
    if (!square) return;
    if (playerColor === "spectator" || gameStatus !== "in_progress") return;

    const isOurTurn = (chess.turn() === "w" && playerColor === "white") || (chess.turn() === "b" && playerColor === "black");
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
      if (movingPiece?.type === "p" && (square.endsWith("1") || square.endsWith("8"))) {
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
        playSound('check');
      } else if (move.flags.includes('k') || move.flags.includes('q')) {
        playSound('castle');
      } else if (move.flags.includes('c') || move.flags.includes('e')) {
        playSound('capture');
      } else {
        playSound('move');
      }
      
      channelRef.current?.send({
        type: 'broadcast',
        event: 'move',
        payload: move
      });

      let nextStatus = "in_progress";
      if (chess.isGameOver()) {
        if (chess.isCheckmate()) nextStatus = chess.turn() === "w" ? "black_won" : "white_won";
        else nextStatus = "draw";
        setGameStatus(nextStatus as any);
      }

      updateChessGameState(game.id, chess.pgn(), chess.fen(), nextStatus, chess.turn());
    } catch (e) {
      setMoveFrom(null);
      setOptionSquares({});
    }
  }, [playerColor, gameStatus, chess, moveFrom, getMoveOptions, game.id]);

  const handleResign = async () => {
    setShowResignConfirm(true);
  };

  const confirmResign = async () => {
    setShowResignConfirm(false);
    const res = await resignChessGame(game.id);
    if (res && !res.success) toast("Failed to resign: " + res.error);
  };

  const handleOfferDraw = () => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'offer_draw',
      payload: { color: playerColor }
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
      type: 'broadcast',
      event: 'decline_draw',
      payload: {}
    });
    setDrawOfferedBy(null);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const msg = { sender: playerColor === 'white' ? game.white?.full_name : game.black?.full_name, text: chatInput.trim() };
    setChatMessages(prev => [...prev, msg]);
    channelRef.current?.send({
      type: 'broadcast',
      event: 'chat',
      payload: msg
    });
    setChatInput("");
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const renderPlayerHeader = (color: 'white' | 'black') => {
    const p = color === 'white' ? game.white : game.black;
    const time = color === 'white' ? whiteTimeMs : blackTimeMs;
    const matAdvantage = color === 'white' ? material.white : material.black;
    
    const isLowTime = time <= 60000 && time > 0;
    
    return (
      <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-card/95 p-3 shadow-sm backdrop-blur">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 border-2 ${color === "white" ? "border-amber-300 bg-amber-50" : "border-slate-700 bg-slate-900"}`}>
            {p?.avatar_url ? <img src={p.avatar_url} alt={`${p.full_name || color} avatar`} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs font-black text-muted-foreground">{color === "white" ? "W" : "B"}</div>}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 font-bold text-sm">{p?.full_name || "Waiting..."} <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{color === "white" ? "WHITE" : "BLACK"}</span></div>
            <div className="flex items-center h-4 text-xs font-bold text-green-500">
              {matAdvantage > 0 ? `Material +${matAdvantage}` : "Even material"} <span className="ml-2 text-muted-foreground font-medium">ELO {p?.chess_elo ?? 1200}</span>
            </div>
          </div>
        </div>
        <div className={`font-mono text-2xl font-bold px-3 py-1 rounded shadow-sm transition-colors ${
          isLowTime ? "bg-red-500/20 text-red-500 border border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse" :
          gameStatus === "in_progress" && chess.turn() === color.charAt(0) ? "bg-primary/20 text-primary border border-primary/50" : 
          "bg-muted/80 text-muted-foreground"
        }`}>
          {isMounted ? formatTime(time) : "--:--"}
        </div>
      </div>
    );
  };

  let derivedGameOver: { title: string, reason: string } | null = null;
  if (gameStatus === "white_won") {
    derivedGameOver = { title: "White Wins!", reason: chess.isCheckmate() ? "by Checkmate" : "by Resignation / Timeout" };
  } else if (gameStatus === "black_won") {
    derivedGameOver = { title: "Black Wins!", reason: chess.isCheckmate() ? "by Checkmate" : "by Resignation / Timeout" };
  } else if (gameStatus === "draw") {
    derivedGameOver = { title: "Game Drawn", reason: "by Agreement or Stalemate" };
  }

  return (
    <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 relative rounded-[2rem] bg-gradient-to-br from-card/50 via-background to-secondary/30 p-2 sm:p-4">
      {connectionIssue && <div role="status" className="absolute left-4 right-4 top-4 z-20 rounded-xl border border-amber-500/30 bg-amber-500/90 px-4 py-2 text-center text-xs font-black text-amber-950 shadow-lg">Connection unstable — reconnecting to the match…</div>}
      
      {/* Left: Chess Board */}
      <div className="flex-1 max-w-[700px] flex flex-col gap-4">
        {/* Top Player (Opponent) */}
        {renderPlayerHeader(playerColor === 'white' ? 'black' : 'white')}

        {playerColor === "spectator" && <div className="flex items-center justify-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm font-bold text-violet-600 dark:text-violet-300"><Eye size={16} /> Spectator mode · watch the match live</div>}
        <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-[0_24px_70px_rgba(15,23,42,0.22)] border-[10px] border-slate-900/90 bg-slate-900 relative ring-1 ring-white/10">
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
              onArrowsChange: ({ arrows: nextArrows }) => setArrows(nextArrows),
              clearArrowsOnClick: true,
              arrowOptions: {
                ...defaultArrowOptions,
                colors: { default: "rgba(245, 190, 66, 0.9)", shift: "rgba(96, 165, 250, 0.9)", ctrl: "rgba(248, 113, 113, 0.9)", alt: "rgba(74, 222, 128, 0.9)", meta: "rgba(192, 132, 252, 0.9)" },
                opacity: 0.9,
                activeOpacity: 1,
              },
              showNotation,
              onPieceDrop: ({ sourceSquare, targetSquare }) => onDrop({ sourceSquare, targetSquare }),
              canDragPiece: () => {
                if (playerColor === "spectator" || gameStatus !== "in_progress") return false;
                const isOurTurn = (chess.turn() === "w" && playerColor === "white") || (chess.turn() === "b" && playerColor === "black");
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
              <div role="dialog" aria-modal="true" aria-label="Choose promotion piece" className="w-full max-w-xs rounded-2xl border border-border bg-card p-5 text-center shadow-2xl">
                <p className="text-lg font-black">Choose your promotion</p>
                <p className="mt-1 text-xs font-medium text-muted-foreground">Select the piece your pawn becomes.</p>
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {([["q", "♛", "Queen"], ["r", "♜", "Rook"], ["b", "♝", "Bishop"], ["n", "♞", "Knight"]] as const).map(([piece, symbol, label]) => <button key={piece} type="button" onClick={() => choosePromotion(piece)} className="rounded-xl border border-border bg-background p-3 transition hover:border-primary hover:bg-primary/10" aria-label={`Promote to ${label}`}><span className="block text-3xl leading-none">{symbol}</span><span className="mt-1 block text-[10px] font-bold text-muted-foreground">{label}</span></button>)}
                </div>
                <button type="button" onClick={() => setPendingPromotion(null)} className="mt-4 text-xs font-bold text-muted-foreground hover:text-foreground">Cancel move</button>
              </div>
            </div>
          )}

          {/* Game Over Overlay Modal */}
          {derivedGameOver && !dismissedGameOver && (
            <div className="absolute inset-0 z-[160] flex flex-col items-center justify-center bg-background/80 p-6 text-center backdrop-blur-sm animate-in fade-in duration-300">
              <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl max-w-sm w-full scale-in-90 animate-in zoom-in duration-300 delay-150">
                <h2 className="text-3xl font-black text-foreground mb-2">{derivedGameOver.title}</h2>
                <p className="text-muted-foreground font-medium mb-8">{derivedGameOver.reason}</p>
                <div className="flex flex-col gap-2">
<Link href="/office-lounge" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-95 shadow-lg">
                    Return to Dashboard
                  </Link>
                  <button onClick={() => setDismissedGameOver(true)} className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground py-3 rounded-xl font-bold transition-transform hover:scale-[1.02] active:scale-95 shadow-md">
                    Review Board
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Resign Confirmation Modal */}
          {showResignConfirm && (
            <div className="absolute inset-0 z-[160] flex items-center justify-center bg-background/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-card border border-border rounded-xl p-6 shadow-2xl max-w-xs w-full text-center scale-in-95 animate-in zoom-in duration-200">
                <h3 className="text-xl font-bold mb-2">Resign Game?</h3>
                <p className="text-sm text-muted-foreground mb-6">Are you sure you want to surrender?</p>
                <div className="flex gap-2">
                  <button onClick={() => setShowResignConfirm(false)} className="flex-1 bg-muted hover:bg-muted/80 text-foreground py-2 rounded-lg font-bold text-sm transition-colors">Cancel</button>
                  <button onClick={confirmResign} className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground py-2 rounded-lg font-bold text-sm transition-colors shadow-md">Resign</button>
                </div>
              </div>
            </div>
          )}

          {/* Draw Offer Overlay Modal */}
          {drawOfferedBy && drawOfferedBy !== playerColor && gameStatus === "in_progress" && (
            <div className="absolute inset-0 z-[160] flex items-center justify-center bg-background/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-card border border-primary/50 rounded-xl p-6 shadow-2xl max-w-xs w-full text-center scale-in-95 animate-in zoom-in duration-200">
                <h3 className="text-xl font-bold mb-2">Draw Offered</h3>
                <p className="text-sm text-muted-foreground mb-6">Your opponent has offered a draw.</p>
                <div className="flex gap-2">
                  <button onClick={handleDeclineDraw} className="flex-1 bg-muted hover:bg-muted/80 text-foreground py-2 rounded-lg font-bold text-sm transition-colors">Decline</button>
                  <button onClick={handleAcceptDraw} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground py-2 rounded-lg font-bold text-sm transition-colors shadow-md">Accept</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Player (You) */}
        {renderPlayerHeader(playerColor === 'white' ? 'white' : 'black')}
      </div>

      {/* Right: Sidebar */}
      <div className="w-full lg:w-[350px] flex flex-col min-h-[420px] lg:h-[700px] bg-card border border-border rounded-xl overflow-hidden shadow-lg">
        
        {/* Status / Controls Tab */}
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="font-bold text-center mb-3 text-lg" aria-live="polite">
            {gameStatus === "waiting" ? <span className="flex items-center justify-center gap-2 text-muted-foreground"><Loader2 size={16} className="animate-spin" /> Waiting for Opponent</span> : 
             gameStatus === "white_won" ? "White Wins!" : 
             gameStatus === "black_won" ? "Black Wins!" : 
             gameStatus === "draw" ? "Game Drawn" : 
             (chess.turn() === "w" && playerColor === "white") || (chess.turn() === "b" && playerColor === "black") ? "Your Turn" : "Opponent's Turn"}
          </div>
          <div className="mb-3 flex justify-end">
            <button type="button" onClick={() => setShowNotation((visible) => !visible)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-bold text-muted-foreground transition hover:bg-secondary hover:text-foreground" aria-pressed={showNotation}>
              <Settings2 size={13} /> {showNotation ? "Hide coordinates" : "Show coordinates"}
            </button>
          </div>
          
          {gameStatus === "waiting" && playerColor !== "spectator" && (
            <div className="flex gap-2 mt-2">
              <button 
                onClick={async () => {
                  try {
                    await cancelChessGame(game.id);
                    router.push('/dashboard');
                  } catch (e: any) {
                    if (e.message === "NEXT_REDIRECT") throw e;
                    toast("Failed to cancel: " + e.message);
                  }
                }}
                className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <XIcon size={14} /> Cancel Game
              </button>
            </div>
          )}

          {gameStatus === "in_progress" && playerColor !== "spectator" && (
            <div className="flex gap-2">
              <button onClick={handleResign} className="flex-1 bg-muted hover:bg-destructive hover:text-destructive-foreground text-foreground px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                <Flag size={14} /> Resign
              </button>
              <button onClick={handleOfferDraw} className="flex-1 bg-muted hover:bg-secondary hover:text-secondary-foreground text-foreground px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                <Handshake size={14} /> Draw
              </button>
            </div>
          )}

          {gameStatus === "in_progress" && playerColor !== "spectator" && (
            <div className="mt-3 flex items-center justify-center gap-2 text-[11px] font-bold text-muted-foreground">
              <span className={`h-2 w-2 rounded-full ${isOpponentConnected ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
              {isOpponentConnected ? "Opponent connected" : "Waiting for opponent"}
            </div>
          )}

          {drawOfferedBy && drawOfferedBy === playerColor && gameStatus === "in_progress" && (
            <div className="mt-2 text-center text-xs text-muted-foreground italic animate-pulse">
              Draw offer sent to opponent...
            </div>
          )}
        </div>

        {/* Spectators */}
        {spectators.length > 0 && (
          <div className="bg-muted/50 p-2 text-xs flex flex-col gap-1 border-b border-border">
            <div className="flex items-center gap-2 font-bold text-muted-foreground">
              <Eye size={14} /> {spectators.length} Spectator{spectators.length !== 1 ? 's' : ''}
            </div>
            <div className="flex flex-wrap gap-2 mt-1">
              {spectators.map((s, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-background border border-border px-2 py-1 rounded-full shadow-sm">
                  {s.avatar_url ? (
                    <img src={s.avatar_url} alt={`${s.full_name || "Spectator"} avatar`} className="w-4 h-4 rounded-full object-cover" />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-secondary flex items-center justify-center text-[8px]">
                      <User size={8} />
                    </div>
                  )}
                  <span className="font-medium truncate max-w-[80px]">{s.full_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Move History */}
        <div className="flex-1 overflow-y-auto bg-background p-0" ref={historyScrollRef}>
          <table className="w-full text-sm text-left border-collapse">
            <tbody className="divide-y divide-border/50">
              {movePairs.map((pair, i) => (
                <tr key={i} className="even:bg-muted/20">
                  <td className="py-2 px-4 text-muted-foreground font-mono w-12 border-r border-border/50 text-center bg-muted/10">{i + 1}.</td>
                  <td className="py-2 px-4 font-semibold">{pair[0]}</td>
                  <td className="py-2 px-4 font-semibold">{pair[1] || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Chat Box */}
        <div className="h-[200px] flex flex-col border-t border-border">
          <div className="flex-1 p-3 overflow-y-auto bg-muted/10 flex flex-col gap-2" ref={chatScrollRef}>
            {chatMessages.length === 0 && <div className="text-xs text-muted-foreground text-center mt-4">Welcome to chat!</div>}
            {chatMessages.map((msg, i) => (
              <div key={i} className="text-sm">
                <span className="font-bold opacity-75">{msg.sender}: </span>
                <span>{msg.text}</span>
              </div>
            ))}
          </div>
          {playerColor !== "spectator" && (
            <form onSubmit={handleSendChat} className="p-2 bg-card border-t border-border flex gap-2">
              <input 
                type="text" 
                value={chatInput} 
                onChange={e => setChatInput(e.target.value)} 
                placeholder="Send a message..." 
                className="flex-1 bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button type="submit" className="bg-primary text-primary-foreground p-2 rounded-md hover:opacity-90">
                <Send size={14} />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

