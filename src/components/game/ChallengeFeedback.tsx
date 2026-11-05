"use client";
import {
  CheckCircle,
  XCircle,
  SkipForward,
  Zap,
  Lightbulb,
  Star,
  ArrowRight,
  Flame,
} from "lucide-react";
import {
  getPerformanceMessage,
  type FeedbackState,
} from "@/features/missions/domain/feedback";

export default function ChallengeFeedback({
  feedback,
  slug,
  currentIndex,
  questionCount,
  autoProceedCountdown,
  onNext,
}: {
  feedback: FeedbackState;
  slug: string;
  currentIndex: number;
  questionCount: number;
  autoProceedCountdown: number | null;
  onNext: () => void;
}) {
  const performanceGameSlugs = [
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
  const isPerformanceGame = performanceGameSlugs.includes(slug);
  const performanceMessage = isPerformanceGame
    ? getPerformanceMessage(slug, feedback.isCorrect, feedback.failureReason)
    : null;
  return (
    <div className="w-full flex flex-col items-center text-center animate-in zoom-in-95 duration-300 py-4 max-w-sm mx-auto">
      {feedback.isSkipped ? (
        <div className="bg-orange-100 dark:bg-orange-900/30 p-6 rounded-full mb-4">
          <SkipForward className="w-16 h-16 text-orange-600 dark:text-orange-400" />
        </div>
      ) : feedback.isCorrect ? (
        <div className="relative bg-green-100 dark:bg-green-900/30 p-6 rounded-full mb-4">
          <CheckCircle className="w-16 h-16 text-green-600 dark:text-green-400" />
          {feedback.xpEarned > 0 && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none animate-float-up z-50 flex items-center justify-center whitespace-nowrap">
              <span
                className="text-4xl font-black text-primary drop-shadow-[0_4px_4px_rgba(0,0,0,0.25)] stroke-white"
                style={{ WebkitTextStroke: "2px white" }}
              >
                +{feedback.xpEarned} XP
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-red-100 dark:bg-red-900/30 p-6 rounded-full mb-4">
          <XCircle className="w-16 h-16 text-red-600 dark:text-red-400" />
        </div>
      )}

      <h2 className="text-3xl font-bold mb-2">
        {feedback.isSkipped
          ? "Skipped!"
          : feedback.isCorrect
            ? performanceMessage?.title || "Correct!"
            : performanceMessage?.title || "Not this time"}
      </h2>
      {performanceMessage && (
        <p className="mb-5 max-w-sm text-sm font-medium text-muted-foreground">
          {performanceMessage.detail}
        </p>
      )}

      {(feedback.isCorrect || feedback.isSkipped) && feedback.breakdown ? (
        <div className="w-full bg-card border border-border rounded-2xl p-5 mb-6 shadow-sm text-sm font-medium">
          <div className="flex justify-between items-center py-2 border-b border-border/30">
            <span className="text-muted-foreground flex items-center gap-2">
              {feedback.isSkipped ? (
                <SkipForward size={16} />
              ) : (
                <CheckCircle size={16} />
              )}
              {feedback.isSkipped ? "Skip Penalty" : "Base XP"}
            </span>
            <span
              className={
                feedback.isSkipped
                  ? "text-destructive font-bold text-lg"
                  : "font-bold text-lg"
              }
            >
              {feedback.breakdown.base > 0 ? "+" : ""}
              {feedback.breakdown.base}
            </span>
          </div>
          {!feedback.isSkipped && feedback.breakdown.speed > 0 && (
            <div className="flex justify-between items-center py-2 border-b border-border/30 text-blue-500">
              <span className="flex items-center gap-2">
                <Zap size={16} /> Speed Bonus
              </span>
              <span className="font-bold text-lg">
                +{feedback.breakdown.speed}
              </span>
            </div>
          )}
          {!feedback.isSkipped && feedback.breakdown.noHint > 0 && (
            <div className="flex justify-between items-center py-2 border-b border-border/30 text-green-500">
              <span className="flex items-center gap-2">
                <Lightbulb size={16} /> No Hint Bonus
              </span>
              <span className="font-bold text-lg">
                +{feedback.breakdown.noHint}
              </span>
            </div>
          )}
          {!feedback.isSkipped && feedback.breakdown.perfect > 0 && (
            <div className="flex justify-between items-center py-2 border-b border-border/30 text-purple-500">
              <span className="flex items-center gap-2">
                <Star size={16} /> Perfect Score
              </span>
              <span className="font-bold text-lg">
                +{feedback.breakdown.perfect}
              </span>
            </div>
          )}
          {!feedback.isSkipped && feedback.breakdown.combo > 0 && (
            <div className="flex justify-between items-center py-2 border-b border-border/30 text-orange-500">
              <span className="flex items-center gap-2">
                <Flame size={16} /> Combo Bonus
              </span>
              <span className="font-bold text-lg">
                +{feedback.breakdown.combo}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center pt-4 mt-2 font-black text-xl text-primary">
            <span>Total Earned</span>
            <span className={feedback.isSkipped ? "text-destructive" : ""}>
              {feedback.xpEarned > 0 ? "+" : ""}
              {feedback.xpEarned} XP
            </span>
          </div>
        </div>
      ) : !feedback.isPerformance ? (
        <div className="mb-8 w-full bg-card border border-border rounded-2xl p-5 shadow-sm text-sm font-medium">
          <p className="text-muted-foreground mb-2">
            {feedback.isPerformance
              ? "Performance-based challenge:"
              : "The correct answer was:"}
          </p>
          <div className="bg-muted/50 p-4 rounded-xl border border-border/50 mb-6">
            <p className="text-xl font-bold break-words">
              {feedback.isPerformance
                ? "Your result was based on speed, accuracy, and completion."
                : feedback.correctAnswer}
            </p>
          </div>
          <div className="flex justify-between items-center pt-2 font-black text-xl text-muted-foreground">
            <span>Total Earned</span>
            <span>+0 XP</span>
          </div>
        </div>
      ) : null}

      <button
        onClick={onNext}
        className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-xl shadow-md transition-transform active:scale-95 text-lg"
      >
        {currentIndex < questionCount - 1
          ? autoProceedCountdown !== null
            ? `NEXT CHALLENGE (${autoProceedCountdown}s)`
            : "NEXT CHALLENGE"
          : "FINISH MISSION"}
        <ArrowRight size={20} />
      </button>
    </div>
  );
}
