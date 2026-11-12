"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { SessionQuestion, type GameProps } from "@/types/game";
import {
  Trophy,
  CheckCircle,
  Flame,
  Target,
  Lightbulb,
  Zap,
  Star,
  SkipForward,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { submitAnswer, useMissionHint } from "@/app/play/actions";
import { useToast } from "@/components/ui/ToastProvider";
import { useGameTutorial } from "@/hooks/useTutorials";
import { useVfx } from "@/hooks/useVfx";
import clsx from "clsx";
import GameShell from "./GameShell";
import GameQuestion from "./GameQuestion";
import ChallengeFeedback from "./ChallengeFeedback";
import type { FeedbackState } from "@/features/missions/domain/feedback";
import { challengeClockOrigin } from "@/lib/countdown";
import {
  ChallengeClockScope,
  clearChallengeClock,
} from "@/hooks/useChallengeClock";

interface GameEngineProps {
  sessionQuestions: SessionQuestion[];
  onComplete: () => Promise<boolean> | boolean;
}

export default function GameEngine({
  sessionQuestions,
  onComplete,
}: GameEngineProps) {
  const { toast } = useToast();
  useGameTutorial();
  const { triggerConfetti, triggerShake } = useVfx();
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(() => {
    const firstUnanswered = sessionQuestions.findIndex((q) => !q.is_completed);
    return firstUnanswered >= 0 ? firstUnanswered : 0;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(
    Date.now(),
  );
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [answerResults, setAnswerResults] = useState<
    Array<boolean | "skipped" | null>
  >(() =>
    sessionQuestions.map((question) => {
      if (!question.is_completed) return null;
      if (question.outcome === "skipped") return "skipped";
      if (question.outcome) return question.outcome === "correct";
      // Historic attempts without a recorded outcome stay unknown.
      return null;
    }),
  );
  const submissionLock = useRef(false);

  // Advanced State
  const [currentCombo, setCurrentCombo] = useState(() => {
    let combo = 0;
    for (const question of sessionQuestions) {
      if (!question.is_completed) break;
      combo = question.outcome === "correct" ? combo + 1 : 0;
    }
    return combo;
  });
  const [maxCombo, setMaxCombo] = useState(() => {
    let combo = 0,
      best = 0;
    for (const question of sessionQuestions) {
      if (!question.is_completed) break;
      combo = question.outcome === "correct" ? combo + 1 : 0;
      best = Math.max(best, combo);
    }
    return best;
  });
  const [wasHintUsed, setWasHintUsed] = useState(false);
  const [hintsLeft, setHintsLeft] = useState(
    Math.max(
      0,
      3 - sessionQuestions.filter((question) => question.hint_used).length,
    ),
  );
  const [hintOptions, setHintOptions] = useState<string[]>([]);

  // Difficulty & Overlay State
  const [currentDifficulty, setCurrentDifficulty] = useState(
    sessionQuestions[currentIndex]?.question?.difficulty || "medium",
  );
  const [showLevelUp, setShowLevelUp] = useState(false);

  // Auto-proceed logic
  const [autoProceedCountdown, setAutoProceedCountdown] = useState<
    number | null
  >(null);

  // Stats tracking
  const [stats, setStats] = useState(() => ({
    totalScore: sessionQuestions.reduce(
      (sum, question) =>
        sum +
        (question.outcome === "correct"
          ? 100
          : question.outcome === "skipped"
            ? -50
            : 0),
      0,
    ),
    totalXp: sessionQuestions.reduce(
      (sum, question) => sum + Number(question.earned_xp || 0),
      0,
    ),
    correctAnswers: sessionQuestions.filter(
      (question) => question.outcome === "correct",
    ).length,
  }));

  const currentSessionQuestion = sessionQuestions[currentIndex];
  const activeQuestion = useMemo(
    () =>
      currentSessionQuestion
        ? { ...currentSessionQuestion.question, hint_options: hintOptions }
        : null,
    [currentSessionQuestion, hintOptions],
  );

  useEffect(() => {
    const nextDiff = sessionQuestions[currentIndex]?.question?.difficulty;

    // Only show level up animation if difficulty goes from easy->med or med->hard
    // We can just check if nextDiff is 'medium' or 'hard' and it's different from the previous.
    if (
      nextDiff &&
      currentDifficulty !== nextDiff &&
      (nextDiff === "medium" || nextDiff === "hard")
    ) {
      setShowLevelUp(true);
      setTimeout(() => setShowLevelUp(false), 1500);
    }
    setCurrentDifficulty(nextDiff || "medium");

    let start = Date.now();
    const attemptId = sessionQuestions[currentIndex]?.id;
    try {
      start = challengeClockOrigin(attemptId ?? null, start, sessionStorage);
    } catch {}
    setQuestionStartTime(start);
    setWasHintUsed(Boolean(sessionQuestions[currentIndex]?.hint_used));
    setHintOptions(sessionQuestions[currentIndex]?.question.hint_options || []);
  }, [currentIndex, sessionQuestions]);

  useEffect(() => {
    if (feedback && currentIndex < sessionQuestions.length - 1) {
      const currentQ = sessionQuestions[currentIndex];
      const nextQ = sessionQuestions[currentIndex + 1];

      if (
        currentQ?.question?.game_type?.slug === nextQ?.question?.game_type?.slug
      ) {
        setAutoProceedCountdown(3);
      } else {
        setAutoProceedCountdown(null);
      }
    } else {
      setAutoProceedCountdown(null);
    }
  }, [feedback, currentIndex, sessionQuestions]);

  const currentSlug = currentSessionQuestion?.question?.game_type?.slug || "";
  const noHintSlugs = [
    "reaction",
    "stroop",
    "typing",
    "typing-challenge",
    "sequence",
  ];
  const canUseHint = !noHintSlugs.includes(currentSlug);

  const handleAnswer: GameProps["onAnswer"] = async (answer, options = {}) => {
    if (isSubmitting || submissionLock.current) return;
    submissionLock.current = true;
    setIsSubmitting(true);

    const {
      customIsCorrect,
      customTimeSpent,
      isPerfect,
      isSkipped,
      customScoreModifiers,
      dynamicCorrectAnswer,
    } = options;

    const timeSpent =
      customTimeSpent !== undefined
        ? customTimeSpent
        : Math.floor((Date.now() - questionStartTime) / 1000);
    const sq = currentSessionQuestion;

    try {
      const result = await submitAnswer(sq.id, answer, timeSpent, {
        customIsCorrect: customIsCorrect,
        wasHintUsed,
        isPerfect: isPerfect,
        currentCombo,
        isSkipped,
        customScoreModifiers,
      });

      if (!result.success) {
        toast(
          result.error || "We couldn't save that answer. Please try again.",
        );
        submissionLock.current = false;
        setIsSubmitting(false);
        return;
      }

      // Correctness is always decided by the server. Game-specific clients may
      clearChallengeClock(sq.id);
      // send telemetry (for example typing accuracy or card-match mistakes),
      // but must never be able to override the scored result shown to players.
      const isCorrect = result.success === true && result.isCorrect === true;
      const xpEarned = result.success ? result.xpEarned || 0 : 0;

      const dbCorrectAnswer = result.success
        ? result.correctAnswer
        : sq.question.correct_answer;
      // Only action/performance games should avoid a textual answer. Logic,
      // word, math, and unscramble games still have a meaningful answer to
      // teach the player after an incorrect submission.
      const interactionSlugs = [
        "reaction",
        "stroop",
        "typing",
        "typing-challenge",
        "sequence",
        "card-match",
        "card_match",
        "sudoku_lite",
        "sudoku-lite",
        "odd_object",
        "odd-object",
        "memory",
      ];
      const isInteractionChallenge = interactionSlugs.includes(
        sq.question.game_type.slug,
      );
      const hasTextualAnswer =
        typeof (dynamicCorrectAnswer || dbCorrectAnswer) === "string" &&
        Boolean((dynamicCorrectAnswer || dbCorrectAnswer)?.trim());
      const displayCorrectAnswer = isInteractionChallenge
        ? "This challenge is scored from your performance."
        : dynamicCorrectAnswer ||
          (hasTextualAnswer
            ? dbCorrectAnswer
            : "No textual answer is available for this challenge.");

      if (isCorrect && !isSkipped) {
        setCurrentCombo((prev) => {
          const next = prev + 1;
          setMaxCombo((max) => Math.max(max, next));
          return next;
        });
      } else {
        setCurrentCombo(0);
      }

      const newStats = {
        totalScore:
          stats.totalScore +
          (isCorrect && !isSkipped ? 100 : isSkipped ? -50 : 0),
        totalXp: stats.totalXp + xpEarned,
        correctAnswers:
          stats.correctAnswers + (isCorrect && !isSkipped ? 1 : 0),
      };

      setStats(newStats);

      setAnswerResults((previous) => {
        const next = [...previous];
        next[currentIndex] = isSkipped ? "skipped" : isCorrect;
        return next;
      });

      const feedbackData: FeedbackState = {
        isCorrect: isCorrect || false,
        xpEarned: xpEarned,
        correctAnswer: displayCorrectAnswer,
        isPerformance: isInteractionChallenge,
        breakdown: result.success ? result.breakdown : undefined,
        isSkipped: isSkipped || false,
        failureReason: /wrong color|too early/i.test(answer)
          ? "early"
          : /timeout|time.?out|time's up|missed/i.test(answer)
            ? "timeout"
            : "incorrect",
      };
      if (!feedbackData.isCorrect && !feedbackData.isSkipped) {
        triggerShake("game-engine-container");
      }
      setFeedback(feedbackData);
      submissionLock.current = false;
      setIsSubmitting(false);
    } catch (e) {
      console.error(e);
      toast("Your answer wasn’t saved. Please try again.");
      submissionLock.current = false;
      setIsSubmitting(false);
    }
  };

  const answerHandlerRef = useRef(handleAnswer);
  const answerAttemptRef = useRef(currentSessionQuestion?.id);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    answerHandlerRef.current = handleAnswer;
    answerAttemptRef.current = currentSessionQuestion?.id;
  });
  const stableHandleAnswer = useCallback(
    (...args: Parameters<typeof handleAnswer>) => {
      if (
        mounted.current &&
        answerAttemptRef.current === currentSessionQuestion?.id
      )
        return answerHandlerRef.current(...args);
    },
    [currentSessionQuestion?.id],
  );

  const handleNextChallenge = async () => {
    if (submissionLock.current) return;
    setWasHintUsed(false); // Synchronously reset hint state before next render
    if (currentIndex < sessionQuestions.length - 1) {
      setFeedback(null);
      setCurrentIndex((prev) => prev + 1);
    } else {
      submissionLock.current = true;
      setIsSubmitting(true);
      try {
        if (await onComplete()) {
          triggerConfetti();
          setIsSessionComplete(true);
        }
      } finally {
        submissionLock.current = false;
        setIsSubmitting(false);
      }
    }
  };

  useEffect(() => {
    if (autoProceedCountdown === null) return;
    if (autoProceedCountdown <= 0) {
      handleNextChallenge();
      return;
    }
    const timer = setTimeout(() => {
      setAutoProceedCountdown((prev) => prev! - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [autoProceedCountdown]);

  const handleUseHint = async () => {
    if (wasHintUsed || feedback !== null || hintsLeft <= 0 || isSubmitting)
      return;
    try {
      const result = await useMissionHint(currentSessionQuestion.id);
      setHintOptions(result.eliminatedOptions);
      setWasHintUsed(true);
      setHintsLeft(result.remaining);
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Hint unavailable. Try again.",
      );
    }
  };

  const handleSkip = () => {
    if (isSubmitting || feedback !== null) return;
    handleAnswer("Skipped", { customIsCorrect: false, isSkipped: true });
  };

  if (isSessionComplete) {
    const completedCount = Math.min(sessionQuestions.length, currentIndex + 1);
    const accuracy =
      Math.round((stats.correctAnswers / (completedCount || 1)) * 100) || 0;

    return (
      <div className="w-full max-w-md mx-auto text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-primary/10 p-6 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
          <CheckCircle className="text-primary w-12 h-12" />
        </div>

        <div>
          <h2 className="text-3xl font-bold mb-2">Mission Complete! 🎉</h2>
          <p className="text-muted-foreground">
            You completed {completedCount} challenges in this sprint.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 bg-card border border-border p-6 rounded-2xl shadow-sm">
          <div className="flex flex-col items-center p-3">
            <span className="text-muted-foreground text-sm font-medium uppercase tracking-wider mb-1">
              Score
            </span>
            <span className="text-2xl font-bold">{stats.totalScore}</span>
          </div>
          <div className="flex flex-col items-center p-3">
            <span className="text-muted-foreground text-sm font-medium uppercase tracking-wider mb-1">
              XP Earned
            </span>
            <span className="text-2xl font-bold text-accent">
              {stats.totalXp > 0 ? "+" : ""}
              {stats.totalXp}
            </span>
          </div>
          <div className="flex flex-col items-center p-3">
            <span className="text-muted-foreground text-sm font-medium uppercase tracking-wider mb-1">
              Accuracy
            </span>
            <div className="flex items-center gap-1">
              <Target size={18} className="text-primary" />
              <span className="text-2xl font-bold">{accuracy}%</span>
            </div>
          </div>
          <div className="flex flex-col items-center p-3">
            <span className="text-muted-foreground text-sm font-medium uppercase tracking-wider mb-1">
              Max Combo
            </span>
            <div className="flex items-center gap-1">
              <Flame size={18} className="text-orange-500" />
              <span className="text-2xl font-bold text-orange-500">
                {maxCombo}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => router.push("/leaderboard")}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-xl shadow-md transition-transform active:scale-95 text-lg"
        >
          VIEW LEADERBOARD
        </button>
      </div>
    );
  }

  if (!currentSessionQuestion) return null;

  const renderGame = () => {
    if (feedback)
      return (
        <ChallengeFeedback
          feedback={feedback}
          slug={currentSessionQuestion.question.game_type.slug}
          currentIndex={currentIndex}
          questionCount={sessionQuestions.length}
          autoProceedCountdown={autoProceedCountdown}
          onNext={handleNextChallenge}
        />
      );

    return (
      <ChallengeClockScope.Provider
        key={currentSessionQuestion.id}
        value={currentSessionQuestion.id}
      >
        <GameQuestion
          question={activeQuestion!}
          onAnswer={stableHandleAnswer}
          isSubmitting={isSubmitting}
          showHint={wasHintUsed}
        />
      </ChallengeClockScope.Provider>
    );
  };

  return (
    <div
      id="game-engine-container"
      className="w-full flex flex-col items-center"
    >
      <div className="w-full mb-6 flex flex-col items-start gap-4 bg-card border border-border px-6 pt-4 pb-6 rounded-2xl shadow-sm relative overflow-visible">
        {showLevelUp && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-accent text-accent-foreground animate-in zoom-in duration-300 rounded-2xl">
            <div className="flex items-center gap-2 text-xl font-black tracking-widest uppercase">
              <Zap size={24} className="animate-pulse" />
              Difficulty Increased
              <Zap size={24} className="animate-pulse" />
            </div>
          </div>
        )}

        <div className="w-full flex flex-wrap justify-between items-start gap-4">
          <div className="flex flex-col pt-1">
            <div className="flex items-center gap-2 justify-between w-full mb-1">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                Sprint Progress
                {currentDifficulty === "easy" && (
                  <span className="bg-green-500/20 text-green-500 px-2 py-0.5 rounded-sm text-[10px] flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />{" "}
                    EASY
                  </span>
                )}
                {currentDifficulty === "medium" && (
                  <span className="bg-yellow-500/20 text-yellow-600 px-2 py-0.5 rounded-sm text-[10px] flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />{" "}
                    MEDIUM
                  </span>
                )}
                {currentDifficulty === "hard" && (
                  <span className="bg-red-500/20 text-red-500 px-2 py-0.5 rounded-sm text-[10px] flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />{" "}
                    HARD
                  </span>
                )}
              </span>
            </div>
            <span className="font-bold text-lg flex items-baseline gap-2">
              Challenge #{currentIndex + 1}
              <span className="text-xs text-muted-foreground font-medium">
                of {sessionQuestions.length}
              </span>
            </span>
            {currentSessionQuestion?.question?.content?.isCompanyTrivia && (
              <span className="mt-1 bg-purple-500 text-white px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm w-fit">
                <Star size={12} className="fill-white" />
                Company Bonus
              </span>
            )}
          </div>

          <div className="flex max-w-full flex-wrap items-center justify-end gap-2 mt-2 sm:mt-0">
            <div
              className="hidden sm:flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full font-bold shadow-sm"
              aria-label={`XP earned ${stats.totalXp}`}
            >
              <Trophy size={16} />
              <span>{Math.max(0, stats.totalXp)} XP</span>
            </div>
            <div className="flex items-center gap-1.5 bg-orange-500/10 text-orange-500 px-3 py-1.5 rounded-full font-bold shadow-sm">
              <Flame size={16} />
              <span>x{currentCombo}</span>
            </div>

            {canUseHint && (
              <button
                id="tour-hint-button"
                onClick={handleUseHint}
                disabled={wasHintUsed || feedback !== null || hintsLeft <= 0}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all",
                  wasHintUsed || hintsLeft <= 0
                    ? "bg-muted text-muted-foreground opacity-50"
                    : "bg-primary/10 text-primary hover:bg-primary/20 active:scale-95",
                )}
              >
                <Lightbulb size={16} />
                <span className="text-sm hidden sm:inline">Hint</span>
                <span className="text-sm">({hintsLeft})</span>
              </button>
            )}

            <button
              id="tour-skip-button"
              onClick={handleSkip}
              disabled={isSubmitting || feedback !== null}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold transition-transform shadow-sm ${
                feedback !== null
                  ? "bg-muted text-muted-foreground opacity-50"
                  : "bg-destructive/10 text-destructive hover:bg-destructive/20 active:scale-95"
              }`}
            >
              <SkipForward size={16} />
              <span className="text-sm hidden sm:inline">Skip</span>
            </button>
          </div>
        </div>

        {/* Mission progress */}
        <div className="mt-2 w-full rounded-2xl border border-border/60 bg-gradient-to-r from-secondary/50 via-background to-primary/[0.035] px-4 py-3.5 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                Mission path
              </span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary">
                {currentIndex + 1} / {sessionQuestions.length}
              </span>
            </div>
            <span className="text-[10px] font-bold text-muted-foreground">
              {sessionQuestions.length - currentIndex - (feedback ? 1 : 0)}{" "}
              remaining
            </span>
          </div>
          <div
            className="mt-3 flex w-full gap-1.5"
            aria-label="Mission answer results"
          >
            {sessionQuestions.map((_, index) => {
              const result =
                index === currentIndex && feedback
                  ? feedback.isSkipped
                    ? "skipped"
                    : feedback.isCorrect
                  : answerResults[index];
              const isCurrent = index === currentIndex && !feedback;
              return (
                <div
                  key={index}
                  className="group relative min-w-0 flex-1"
                  title={
                    result === true
                      ? `Challenge ${index + 1}: correct`
                      : result === false
                        ? `Challenge ${index + 1}: incorrect`
                        : result === "skipped"
                          ? `Challenge ${index + 1}: skipped`
                          : `Challenge ${index + 1}: not answered`
                  }
                >
                  <div
                    className={clsx(
                      "h-2.5 min-w-1 rounded-full transition-all duration-300",
                      result === true && "bg-emerald-500",
                      result === false && "bg-red-500",
                      result === "skipped" && "bg-amber-400",
                      result === null &&
                        (isCurrent
                          ? "bg-primary shadow-[0_0_0_3px_rgba(79,70,229,0.13)]"
                          : "bg-border/80"),
                    )}
                  />
                  {isCurrent && (
                    <span className="absolute left-1/2 top-4 -translate-x-1/2 whitespace-nowrap text-[9px] font-black uppercase tracking-wider text-primary">
                      Now
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-3 text-[10px] font-bold text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <i className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Correct
            </span>
            <span className="flex items-center gap-1.5">
              <i className="h-1.5 w-1.5 rounded-full bg-red-500" />
              Wrong
            </span>
            <span className="flex items-center gap-1.5">
              <i className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              Skipped
            </span>
          </div>
        </div>
      </div>

      <div className="w-full animate-in fade-in slide-in-from-right-4 duration-300">
        <GameShell>{renderGame()}</GameShell>
      </div>
    </div>
  );
}
