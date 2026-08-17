"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Chess, Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import { createClient } from "@/lib/supabase/client";
import { updateChessGameState, resignChessGame, drawChessGame, declareChessTimeout, cancelChessGame } from "../actions";
import { Loader2, Flag, Handshake, Send, Eye, User, X as XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const darkSquareStyle = { backgroundColor: "#739552" };
const lightSquareStyle = { backgroundColor: "#ebecd0" };

const playSound = (type?: string) => {
  try {
    const audio = new Audio('/sounds/wood-click.mp3');
    audio.play().catch(e => console.warn('Audio play failed:', e));
  } catch (e) {}
};

const customPieces = ["wP", "wN", "wB", "wR", "wQ", "wK", "bP", "bN", "bB", "bR", "bQ", "bK"].reduce((acc, p) => {
  acc[p] = ({ squareWidth }: any) => (
    <img
      src={`https://images.chesscomfiles.com/chess-themes/pieces/neo/150/${p.toLowerCase()}.png`}
      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      alt={p}
    />
  );
  return acc;
}, {} as Record<string, any>);

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
  const [fen, setFen] = useState(game.fen || chess.fen());
  const [gameStatus, setGameStatus] = useState(game.status);
  const [isOpponentConnected, setIsOpponentConnected] = useState(false);
  const [spectators, setSpectators] = useState<any[]>([]);
  
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

  const supabase = createClient();
  const channelRef = useRef<any>(null);
  const router = useRouter();

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
    if (!game.id) return;

    const channel = supabase.channel(`chess_game_${game.id}`, {
      config: { presence: { key: currentUserId } }
    });

    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        
        let opponentFound = false;
        const currentSpectators: any[] = [];
        
        Object.keys(state).forEach((key) => {
          const presenceState: any = state[key][0]; // latest presence for this user
          
          if (presenceState.user_id !== currentUserId) {
            if (presenceState.role === "white" || presenceState.role === "black") {
              opponentFound = true;
            } else if (presenceState.role === "spectator") {
              currentSpectators.push(presenceState);
            }
          }
        });
        
        setIsOpponentConnected(opponentFound);
        setSpectators(currentSpectators);

        if (Object.keys(state).length > 1 && gameStatus === "waiting") {
          router.refresh();
        }
      })
      .on("broadcast", { event: "move" }, (payload) => {
        const move = payload.payload;
        try {
          const res = chess.move(move);
          if (res) {
            setFen(chess.fen());
            playSound();
            if (chess.isGameOver()) {
              if (chess.isCheckmate()) setGameStatus(chess.turn() === "w" ? "black_won" : "white_won");
              else setGameStatus("draw");
            }
          }
        } catch (e) {
          // Ignore invalid moves (e.g. self-broadcasts)
        }
      })
      .on("broadcast", { event: "offer_draw" }, (payload) => {
        setDrawOfferedBy(payload.payload.color);
      })
      .on("broadcast", { event: "decline_draw" }, () => {
        setDrawOfferedBy(null);
      })
      .on("broadcast", { event: "chat" }, (payload) => {
        setChatMessages(prev => [...prev, payload.payload]);
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "chess_games",
        filter: `id=eq.${game.id}`
      }, (payload) => {
        const newRecord = payload.new;
        let needsRefresh = false;

        if (newRecord.status !== gameStatus) {
          setGameStatus(newRecord.status);
          needsRefresh = true;
        }

        if (newRecord.white_time_ms !== whiteTimeMs) setWhiteTimeMs(newRecord.white_time_ms);
        if (newRecord.black_time_ms !== blackTimeMs) setBlackTimeMs(newRecord.black_time_ms);

        if (newRecord.pgn && newRecord.pgn !== chess.pgn()) {
          chess.loadPgn(newRecord.pgn);
          setFen(chess.fen());
        }

        if (needsRefresh) {
          router.refresh();
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ 
            online_at: new Date().toISOString(),
            user_id: currentUserId,
            role: playerColor,
            full_name: currentUserProfile.full_name,
            avatar_url: currentUserProfile.avatar_url
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [game.id, currentUserId, supabase]);

  const [moveFrom, setMoveFrom] = useState<string | null>(null);

  const onDrop = useCallback(({ sourceSquare, targetSquare }: { sourceSquare: string, targetSquare: string | null }) => {
    if (playerColor === "spectator" || gameStatus !== "in_progress") return false;
    if (!targetSquare) return false;

    // Only allow moving own pieces
    if (chess.turn() === "w" && playerColor !== "white") return false;
    if (chess.turn() === "b" && playerColor !== "black") return false;

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
        styles[lastMove.from] = { background: "rgba(255, 255, 0, 0.4)" };
      }
      if (!styles[lastMove.to]) {
        styles[lastMove.to] = { background: "rgba(255, 255, 0, 0.4)" };
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
    if (res && !res.success) alert("Failed to resign: " + res.error);
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
    if (res && !res.success) alert("Failed to draw: " + res.error);
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
      <div className="flex items-center justify-between p-3 bg-card border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-muted overflow-hidden flex-shrink-0">
            {p?.avatar_url && <img src={p.avatar_url} alt="avatar" className="w-full h-full object-cover" />}
          </div>
          <div className="flex flex-col">
            <div className="font-bold text-sm">{p?.full_name || "Waiting..."} <span className="text-muted-foreground font-normal">({p?.chess_elo || 1200})</span></div>
            <div className="flex items-center h-4 text-xs font-bold text-green-500">
              {matAdvantage > 0 ? `+${matAdvantage}` : ""}
            </div>
          </div>
        </div>
        <div className={`font-mono text-2xl font-bold px-3 py-1 rounded shadow-sm transition-colors ${
          isLowTime ? "bg-red-500/20 text-red-500 border border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse" :
          gameStatus === "in_progress" && chess.turn() === color.charAt(0) ? "bg-primary/20 text-primary border border-primary/50" : 
          "bg-muted text-muted-foreground"
        }`}>
          {formatTime(time)}
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
    <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 relative">
      
      {/* Left: Chess Board */}
      <div className="flex-1 max-w-[700px] flex flex-col gap-4">
        {/* Top Player (Opponent) */}
        {renderPlayerHeader(playerColor === 'white' ? 'black' : 'white')}

        <div className="w-full aspect-square rounded-sm overflow-hidden shadow-2xl border-4 border-muted relative">
          <Chessboard 
            key={playerColor}
            options={{
              position: fen,
              boardOrientation: playerColor === "black" ? "black" : "white",
              darkSquareStyle,
              lightSquareStyle,
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
              onSquareClick: ({ square }) => onSquareClick({ square }),
              squareStyles: computedSquareStyles,
              pieces: customPieces
            }}
          />

          {/* Game Over Overlay Modal */}
          {derivedGameOver && !dismissedGameOver && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
              <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl max-w-sm w-full scale-in-90 animate-in zoom-in duration-300 delay-150">
                <h2 className="text-3xl font-black text-foreground mb-2">{derivedGameOver.title}</h2>
                <p className="text-muted-foreground font-medium mb-8">{derivedGameOver.reason}</p>
                <div className="flex flex-col gap-2">
                  <Link href="/dashboard" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-95 shadow-lg">
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
            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
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
            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
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
      <div className="w-full lg:w-[350px] flex flex-col h-[700px] bg-card border border-border rounded-xl overflow-hidden shadow-lg">
        
        {/* Status / Controls Tab */}
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="font-bold text-center mb-3 text-lg">
            {gameStatus === "waiting" ? <span className="flex items-center justify-center gap-2 text-muted-foreground"><Loader2 size={16} className="animate-spin" /> Waiting for Opponent</span> : 
             gameStatus === "white_won" ? "White Wins!" : 
             gameStatus === "black_won" ? "Black Wins!" : 
             gameStatus === "draw" ? "Game Drawn" : 
             (chess.turn() === "w" && playerColor === "white") || (chess.turn() === "b" && playerColor === "black") ? "Your Turn" : "Opponent's Turn"}
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
                    alert("Failed to cancel: " + e.message);
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
                    <img src={s.avatar_url} className="w-4 h-4 rounded-full object-cover" />
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
