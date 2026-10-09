"use client";

import { useState, useEffect } from "react";
import { SessionQuestion } from "@/types/game";
import LogicGame from "./types/LogicGame";
import TriviaGame from "./types/TriviaGame";
import WordGame from "./types/WordGame";
import MemoryGame from "./types/MemoryGame";
import ReactionGame from "./types/ReactionGame";
import StroopGame from "./types/StroopGame";
import SequenceGame from "./types/SequenceGame";
import CardMatchGame from "./types/CardMatchGame";
import SudokuLiteGame from "./types/SudokuLiteGame";
import OddObjectGame from "./types/OddObjectGame";
import UnscrambleGame from "./types/UnscrambleGame";
import TypingGame from "./types/TypingGame";
import MentalMathGame from "./types/MentalMathGame";
import TargetNumberGame from "./types/TargetNumberGame";
import CompanyTriviaGame from "./types/CompanyTriviaGame";
import MissingLettersGame from "./types/MissingLettersGame";
import { Trophy, CheckCircle, Flame, Target, XCircle, ArrowRight, Lightbulb, Zap, Star, SkipForward, Brain } from "lucide-react";
import { useRouter } from "next/navigation";
import { submitAnswer } from "@/app/play/actions";
import { useGameTutorial } from "@/hooks/useTutorials";
import { useVfx } from "@/hooks/useVfx";
import clsx from "clsx";
import GameShell from "./GameShell";

interface GameEngineProps {
  sessionQuestions: SessionQuestion[];
  onComplete: () => void;
}

interface ScoreBreakdown {
  base: number;
  speed: number;
  noHint: number;
  perfect: number;
  combo: number;
}

interface FeedbackState {
  isCorrect: boolean;
  xpEarned: number;
  correctAnswer: string;
  isPerformance?: boolean;
  breakdown?: ScoreBreakdown;
  isSkipped?: boolean;
}

function getPerformanceMessage(slug: string, isCorrect: boolean) {
  const messages: Record<string, [string, string]> = {
    reaction: ["Great catch!", "You caught the green flash.",],
    stroop: ["Sharp focus!", "You matched the ink color correctly."],
    typing: ["Clean typing!", "You completed the passage with good accuracy."],
    "typing-challenge": ["Clean typing!", "You completed the passage with good accuracy."],
    sequence: ["Sequence cracked!", "You remembered the pattern."],
    memory: ["Memory unlocked!", "You recalled the hidden pattern."],
    sudoku_lite: ["Puzzle solved!", "You completed the grid."],
    "sudoku-lite": ["Puzzle solved!", "You completed the grid."],
    "card-match": ["All matched!", "You found the pairs."],
    card_match: ["All matched!", "You found the pairs."],
    odd_object: ["Great eye!", "You spotted the odd object."],
    "odd-object": ["Great eye!", "You spotted the odd object."],
    mental_math: ["Quick maths!", "You solved the calculation."],
    "mental-math": ["Quick maths!", "You solved the calculation."],
    math: ["Number cruncher!", "You found the right result."],
    logic: ["Logic locked in!", "You solved the reasoning challenge."],
    word: ["Word wizard!", "You found the right word."],
    unscramble: ["Word unscrambled!", "You put the letters in order."],
    "word-unscramble": ["Word unscrambled!", "You put the letters in order."],
  };
  const [success, failure] = messages[slug] || ["Nice work!", "You completed the challenge."];
  if (isCorrect) return { title: success, detail: failure };

  const failures: Record<string, [string, string]> = {
    reaction: ["You missed the flash", "You were not fast enough. Wait for green and react as quickly as you can."],
    stroop: ["Focus slipped", "The ink color and word were designed to conflict. Trust the ink color next time."],
    typing: ["Keep practicing", "The passage was not completed accurately before time ran out."],
    "typing-challenge": ["Keep practicing", "The passage was not completed accurately before time ran out."],
    sequence: ["Sequence missed", "The pattern was not completed in the correct order."],
    memory: ["Memory slipped", "The sequence did not match. Take another moment to lock it in next time."],
    "card-match": ["Time ran out", "Not every pair was found before the countdown ended."],
    card_match: ["Time ran out", "Not every pair was found before the countdown ended."],
    sudoku_lite: ["Grid incomplete", "The Sudoku grid was not solved correctly."],
    "sudoku-lite": ["Grid incomplete", "The Sudoku grid was not solved correctly."],
    odd_object: ["Wrong object", "The odd object was not identified before the timer ended."],
    "odd-object": ["Wrong object", "The odd object was not identified before the timer ended."],
  };
  const [title, detail] = failures[slug] || ["Not this time", "The challenge was not completed successfully."];
  return { title, detail };
}

export default function GameEngine({ sessionQuestions, onComplete }: GameEngineProps) {
  useGameTutorial();
  const { triggerConfetti, triggerShake } = useVfx();
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(() => {
    const firstUnanswered = sessionQuestions.findIndex(q => !q.is_completed);
    return firstUnanswered >= 0 ? firstUnanswered : 0;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [answerResults, setAnswerResults] = useState<Array<boolean | "skipped" | null>>(() => sessionQuestions.map(() => null));
  
  // Advanced State
  const [currentCombo, setCurrentCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [wasHintUsed, setWasHintUsed] = useState(false);
  const [hintsLeft, setHintsLeft] = useState(3); // Max 3 hints per session

  // Difficulty & Overlay State
  const [currentDifficulty, setCurrentDifficulty] = useState(sessionQuestions[currentIndex]?.question?.difficulty || 'medium');
  const [showLevelUp, setShowLevelUp] = useState(false);
  
  // Auto-proceed logic
  const [autoProceedCountdown, setAutoProceedCountdown] = useState<number | null>(null);

  // Stats tracking
  const [stats, setStats] = useState({
    totalScore: 0,
    totalXp: 0,
    correctAnswers: 0,
  });

  const currentSessionQuestion = sessionQuestions[currentIndex];

  useEffect(() => {
    const nextDiff = sessionQuestions[currentIndex]?.question?.difficulty;
    
    // Only show level up animation if difficulty goes from easy->med or med->hard
    // We can just check if nextDiff is 'medium' or 'hard' and it's different from the previous.
    if (nextDiff && currentDifficulty !== nextDiff && (nextDiff === 'medium' || nextDiff === 'hard')) {
      setShowLevelUp(true);
      setTimeout(() => setShowLevelUp(false), 1500);
    }
    setCurrentDifficulty(nextDiff || 'medium');
    
    const start = Date.now();
    setQuestionStartTime(start);
    setWasHintUsed(false); // Reset hint for new question

    // Track elapsed time when component unmounts (e.g. user goes to dashboard)
    return () => {
      const qId = sessionQuestions[currentIndex]?.question?.id;
      if (qId) {
        const elapsed = Date.now() - start;
        const accumulated = parseInt(sessionStorage.getItem(`question_accumulated_${qId}`) || '0');
        sessionStorage.setItem(`question_accumulated_${qId}`, (accumulated + elapsed).toString());
      }
    };
  }, [currentIndex, sessionQuestions, currentDifficulty]);
  
  useEffect(() => {
    if (feedback && currentIndex < sessionQuestions.length - 1) {
      const currentQ = sessionQuestions[currentIndex];
      const nextQ = sessionQuestions[currentIndex + 1];
      
      if (currentQ?.question?.game_type?.slug === nextQ?.question?.game_type?.slug) {
        setAutoProceedCountdown(3);
      } else {
        setAutoProceedCountdown(null);
      }
    } else {
      setAutoProceedCountdown(null);
    }
  }, [feedback, currentIndex, sessionQuestions]);

  const currentSlug = currentSessionQuestion?.question?.game_type?.slug || '';
  const noHintSlugs = ['reaction', 'stroop', 'typing', 'typing-challenge', 'sequence'];
  const canUseHint = !noHintSlugs.includes(currentSlug);
  
  const handleAnswer = async (
    answer: string, 
    optionsOrIsCorrect?: boolean | { customIsCorrect?: boolean, customTimeSpent?: number, isPerfect?: boolean, isSkipped?: boolean, customScoreModifiers?: any, dynamicCorrectAnswer?: string }, 
    legacyTimeSpent?: number
  ) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    let customIsCorrect: boolean | undefined;
    let customTimeSpent: number | undefined;
    let isPerfect: boolean | undefined;
    let isSkipped: boolean | undefined;
    let customScoreModifiers: any;
    let dynamicCorrectAnswer: string | undefined;

    if (typeof optionsOrIsCorrect === 'boolean') {
      customIsCorrect = optionsOrIsCorrect;
      customTimeSpent = legacyTimeSpent;
    } else if (optionsOrIsCorrect) {
      customIsCorrect = optionsOrIsCorrect.customIsCorrect;
      customTimeSpent = optionsOrIsCorrect.customTimeSpent;
      isPerfect = optionsOrIsCorrect.isPerfect;
      isSkipped = optionsOrIsCorrect.isSkipped;
      customScoreModifiers = optionsOrIsCorrect.customScoreModifiers;
      dynamicCorrectAnswer = optionsOrIsCorrect.dynamicCorrectAnswer;
    }

    const accumulated = parseInt(sessionStorage.getItem(`question_accumulated_${currentSessionQuestion?.question?.id}`) || '0');
    const timeSpent = customTimeSpent !== undefined ? customTimeSpent : Math.floor(((Date.now() - questionStartTime) + accumulated) / 1000);
    const sq = currentSessionQuestion;

    // Clear accumulated time for this question
    sessionStorage.removeItem(`question_accumulated_${sq?.question?.id}`);

    try {
      const result = await submitAnswer(sq.id, answer, timeSpent, {
        customIsCorrect: customIsCorrect,
        wasHintUsed,
        isPerfect: isPerfect,
        currentCombo,
        isSkipped,
        customScoreModifiers
      });
      
      // Correctness is always decided by the server. Game-specific clients may
      // send telemetry (for example typing accuracy or card-match mistakes),
      // but must never be able to override the scored result shown to players.
      const isCorrect = result.success === true && result.isCorrect === true;
      const xpEarned = result.success ? (result.xpEarned || 0) : 0;
      
      const dbCorrectAnswer = result.success ? result.correctAnswer : sq.question.correct_answer;
      // Only action/performance games should avoid a textual answer. Logic,
      // word, math, and unscramble games still have a meaningful answer to
      // teach the player after an incorrect submission.
      const interactionSlugs = ['reaction', 'stroop', 'typing', 'typing-challenge', 'sequence', 'card-match', 'card_match', 'sudoku_lite', 'sudoku-lite', 'odd_object', 'odd-object', 'memory'];
      const isInteractionChallenge = interactionSlugs.includes(sq.question.game_type.slug);
      const hasTextualAnswer = typeof (dynamicCorrectAnswer || dbCorrectAnswer) === "string" && Boolean((dynamicCorrectAnswer || dbCorrectAnswer)?.trim());
      const displayCorrectAnswer = isInteractionChallenge ? "This challenge is scored from your performance." : dynamicCorrectAnswer || (hasTextualAnswer ? dbCorrectAnswer : "No textual answer is available for this challenge.");

      if (isCorrect && !isSkipped) {
        setCurrentCombo(prev => {
          const next = prev + 1;
          setMaxCombo(max => Math.max(max, next));
          return next;
        });
      } else {
        setCurrentCombo(0);
      }

      const newStats = {
        totalScore: stats.totalScore + (isCorrect && !isSkipped ? 100 : (isSkipped ? -50 : 0)),
        totalXp: stats.totalXp + xpEarned,
        correctAnswers: stats.correctAnswers + (isCorrect && !isSkipped ? 1 : 0),
      };
      
      setStats(newStats);
      
      if (!result.success) {
        setFeedback({
          isCorrect: false,
          xpEarned: 0,
          correctAnswer: result.error || "We couldn't save that answer. Please try again.",
          isSkipped: false,
        });
        setIsSubmitting(false);
        return;
      }

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
        isSkipped: isSkipped || false
      };
      if (!feedbackData.isCorrect && !feedbackData.isSkipped) {
        triggerShake("game-engine-container");
      }
      setFeedback(feedbackData);
      setIsSubmitting(false);
    } catch (e) {
      console.error(e);
      setIsSubmitting(false);
    }
  };

  const handleNextChallenge = () => {
    setFeedback(null);
    setWasHintUsed(false); // Synchronously reset hint state before next render
    if (currentIndex < sessionQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      triggerConfetti();
      setIsSessionComplete(true);
      onComplete();
    }
  };

  useEffect(() => {
    if (autoProceedCountdown === null) return;
    if (autoProceedCountdown <= 0) {
      handleNextChallenge();
      return;
    }
    const timer = setTimeout(() => {
      setAutoProceedCountdown(prev => prev! - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [autoProceedCountdown]);

  const handleUseHint = () => {
    if (wasHintUsed || feedback !== null || hintsLeft <= 0) return;
    setWasHintUsed(true);
    setHintsLeft(prev => prev - 1);
  };

  const handleSkip = () => {
    if (isSubmitting || feedback !== null) return;
    handleAnswer("Skipped", { customIsCorrect: false, isSkipped: true });
  };

  if (isSessionComplete) {
    const completedCount = Math.min(sessionQuestions.length, currentIndex + 1);
    const accuracy = Math.round((stats.correctAnswers / (completedCount || 1)) * 100) || 0;
    
    return (
      <div className="w-full max-w-md mx-auto text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-primary/10 p-6 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
          <CheckCircle className="text-primary w-12 h-12" />
        </div>
        
        <div>
          <h2 className="text-3xl font-bold mb-2">Mission Complete! 🎉</h2>
          <p className="text-muted-foreground">You completed {completedCount} challenges in this sprint.</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 bg-card border border-border p-6 rounded-2xl shadow-sm">
          <div className="flex flex-col items-center p-3">
            <span className="text-muted-foreground text-sm font-medium uppercase tracking-wider mb-1">Score</span>
            <span className="text-2xl font-bold">{stats.totalScore}</span>
          </div>
          <div className="flex flex-col items-center p-3">
            <span className="text-muted-foreground text-sm font-medium uppercase tracking-wider mb-1">XP Earned</span>
            <span className="text-2xl font-bold text-accent">{stats.totalXp > 0 ? '+' : ''}{stats.totalXp}</span>
          </div>
          <div className="flex flex-col items-center p-3">
            <span className="text-muted-foreground text-sm font-medium uppercase tracking-wider mb-1">Accuracy</span>
            <div className="flex items-center gap-1">
              <Target size={18} className="text-primary" />
              <span className="text-2xl font-bold">{accuracy}%</span>
            </div>
          </div>
          <div className="flex flex-col items-center p-3">
            <span className="text-muted-foreground text-sm font-medium uppercase tracking-wider mb-1">Max Combo</span>
            <div className="flex items-center gap-1">
              <Flame size={18} className="text-orange-500" />
              <span className="text-2xl font-bold text-orange-500">{maxCombo}</span>
            </div>
          </div>
        </div>

        <button 
          onClick={() => router.push('/dashboard')}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-xl shadow-md transition-transform active:scale-95 text-lg"
        >
          VIEW LEADERBOARD
        </button>
      </div>
    );
  }

  if (!currentSessionQuestion) return null;

  const renderGame = () => {
    if (feedback) {
      const performanceGameSlugs = ['reaction', 'stroop', 'typing', 'typing-challenge', 'sequence', 'card-match', 'card_match', 'sudoku_lite', 'sudoku-lite', 'odd_object', 'odd-object', 'memory'];
      const isPerformanceGame = performanceGameSlugs.includes(currentSessionQuestion.question.game_type.slug);
      const performanceMessage = isPerformanceGame ? getPerformanceMessage(currentSessionQuestion.question.game_type.slug, feedback.isCorrect) : null;
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
                  <span className="text-4xl font-black text-primary drop-shadow-[0_4px_4px_rgba(0,0,0,0.25)] stroke-white" style={{ WebkitTextStroke: '2px white' }}>
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
            {feedback.isSkipped ? "Skipped!" : (
              feedback.isCorrect 
                ? (performanceMessage?.title || "Correct!")
                : "Not this time"
            )}
          </h2>
          {performanceMessage && <p className="mb-5 max-w-sm text-sm font-medium text-muted-foreground">{performanceMessage.detail}</p>}
          
          {(feedback.isCorrect || feedback.isSkipped) && feedback.breakdown ? (
            <div className="w-full bg-card border border-border rounded-2xl p-5 mb-6 shadow-sm text-sm font-medium">
              <div className="flex justify-between items-center py-2 border-b border-border/30">
                <span className="text-muted-foreground flex items-center gap-2">
                  {feedback.isSkipped ? <SkipForward size={16}/> : <CheckCircle size={16}/>} 
                  {feedback.isSkipped ? "Skip Penalty" : "Base XP"}
                </span>
                <span className={feedback.isSkipped ? "text-destructive font-bold text-lg" : "font-bold text-lg"}>
                  {feedback.breakdown.base > 0 ? '+' : ''}{feedback.breakdown.base}
                </span>
              </div>
              {!feedback.isSkipped && feedback.breakdown.speed > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-border/30 text-blue-500">
                  <span className="flex items-center gap-2"><Zap size={16}/> Speed Bonus</span>
                  <span className="font-bold text-lg">+{feedback.breakdown.speed}</span>
                </div>
              )}
              {!feedback.isSkipped && feedback.breakdown.noHint > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-border/30 text-green-500">
                  <span className="flex items-center gap-2"><Lightbulb size={16}/> No Hint Bonus</span>
                  <span className="font-bold text-lg">+{feedback.breakdown.noHint}</span>
                </div>
              )}
              {!feedback.isSkipped && feedback.breakdown.perfect > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-border/30 text-purple-500">
                  <span className="flex items-center gap-2"><Star size={16}/> Perfect Score</span>
                  <span className="font-bold text-lg">+{feedback.breakdown.perfect}</span>
                </div>
              )}
              {!feedback.isSkipped && feedback.breakdown.combo > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-border/30 text-orange-500">
                  <span className="flex items-center gap-2"><Flame size={16}/> Combo Bonus</span>
                  <span className="font-bold text-lg">+{feedback.breakdown.combo}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-4 mt-2 font-black text-xl text-primary">
                <span>Total Earned</span>
                <span className={feedback.isSkipped ? "text-destructive" : ""}>
                  {feedback.xpEarned > 0 ? '+' : ''}{feedback.xpEarned} XP
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
                <p className="text-xl font-bold break-words">{feedback.isPerformance ? "Your result was based on speed, accuracy, and completion." : feedback.correctAnswer}</p>
              </div>
              <div className="flex justify-between items-center pt-2 font-black text-xl text-muted-foreground">
                <span>Total Earned</span>
                <span>+0 XP</span>
              </div>
            </div>
          ) : null}
          
          <button 
            onClick={handleNextChallenge}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-xl shadow-md transition-transform active:scale-95 text-lg"
          >
            {currentIndex < sessionQuestions.length - 1 ? (autoProceedCountdown !== null ? `NEXT CHALLENGE (${autoProceedCountdown}s)` : "NEXT CHALLENGE") : "FINISH MISSION"}
            <ArrowRight size={20} />
          </button>
        </div>
      );
    }

    const question = currentSessionQuestion.question;
    if (question.content && question.content.question && question.options && question.options.length > 0) {
      if (question.content.isCompanyTrivia) {
        return <CompanyTriviaGame key={question.id} question={question} onAnswer={handleAnswer} isSubmitting={isSubmitting} showHint={wasHintUsed} />;
      }
      return <TriviaGame key={question.id} question={question} onAnswer={handleAnswer} isSubmitting={isSubmitting} showHint={wasHintUsed} />;
    }

    switch (question.game_type.slug) {
      case 'logic':
        return <LogicGame key={question.id} question={question} onAnswer={handleAnswer} isSubmitting={isSubmitting} showHint={wasHintUsed} />;
      case 'word':
        return question.content?.wordWithBlanks
          ? <MissingLettersGame key={question.id} question={question} onAnswer={handleAnswer} isSubmitting={isSubmitting} showHint={wasHintUsed} />
          : <WordGame key={question.id} question={question} onAnswer={handleAnswer} isSubmitting={isSubmitting} />;
      case 'unscramble':
      case 'word-unscramble':
        return <UnscrambleGame key={question.id} question={question} onAnswer={handleAnswer} isSubmitting={isSubmitting} showHint={wasHintUsed} />;
      case 'memory':
        return <MemoryGame key={question.id} question={question} onAnswer={handleAnswer} isSubmitting={isSubmitting} showHint={wasHintUsed} />;
      case 'sequence':
        return <SequenceGame key={question.id} question={question} onAnswer={handleAnswer} isSubmitting={isSubmitting} showHint={wasHintUsed} />;
      case 'reaction':
        return <ReactionGame key={question.id} question={question} onAnswer={handleAnswer} isSubmitting={isSubmitting} showHint={wasHintUsed} />;
      case 'stroop':
        return <StroopGame key={question.id} question={question} onAnswer={handleAnswer} isSubmitting={isSubmitting} showHint={wasHintUsed} />;
      case 'card_match':
      case 'card-match':
        return <CardMatchGame key={question.id} question={question} onAnswer={handleAnswer} isSubmitting={isSubmitting} showHint={wasHintUsed} />;
      case 'sudoku_lite':
      case 'sudoku-lite':
        return <SudokuLiteGame key={question.id} question={question} onAnswer={handleAnswer} isSubmitting={isSubmitting} showHint={wasHintUsed} />;
      case 'odd_object':
      case 'odd-object':
        return <OddObjectGame key={question.id} question={question} onAnswer={handleAnswer} isSubmitting={isSubmitting} showHint={wasHintUsed} />;
      case 'typing':
      case 'typing-challenge':
        return <TypingGame key={question.id} question={question} onAnswer={handleAnswer} isSubmitting={isSubmitting} showHint={wasHintUsed} />;
      case 'mental_math':
      case 'mental-math':
        return <MentalMathGame key={question.id} question={question} onAnswer={handleAnswer} isSubmitting={isSubmitting} showHint={wasHintUsed} />;
      case 'math':
        return question.content?.target !== undefined
          ? <TargetNumberGame key={question.id} question={question} onAnswer={handleAnswer} isSubmitting={isSubmitting} showHint={wasHintUsed} />
          : <TriviaGame key={question.id} question={question} onAnswer={handleAnswer} isSubmitting={isSubmitting} showHint={wasHintUsed} />;
      case 'trivia':
      case 'company_trivia':
        return <TriviaGame key={question.id} question={question} onAnswer={handleAnswer} isSubmitting={isSubmitting} showHint={wasHintUsed} />;
      default:
        return <TriviaGame key={question.id} question={question} onAnswer={handleAnswer} isSubmitting={isSubmitting} showHint={wasHintUsed} />; 
    }
  };

  return (
    <div id="game-engine-container" className="w-full flex flex-col items-center">
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
                {currentDifficulty === 'easy' && <span className="bg-green-500/20 text-green-500 px-2 py-0.5 rounded-sm text-[10px] flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500" /> EASY</span>}
                {currentDifficulty === 'medium' && <span className="bg-yellow-500/20 text-yellow-600 px-2 py-0.5 rounded-sm text-[10px] flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-yellow-500" /> MEDIUM</span>}
                {currentDifficulty === 'hard' && <span className="bg-red-500/20 text-red-500 px-2 py-0.5 rounded-sm text-[10px] flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> HARD</span>}
              </span>
            </div>
            <span className="font-bold text-lg flex items-baseline gap-2">
              Challenge #{currentIndex + 1}
              <span className="text-xs text-muted-foreground font-medium">of {sessionQuestions.length}</span>
            </span>
            {currentSessionQuestion?.question?.content?.isCompanyTrivia && (
              <span className="mt-1 bg-purple-500 text-white px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm w-fit">
                <Star size={12} className="fill-white" />
                Company Bonus
              </span>
            )}
          </div>
          
          <div className="flex max-w-full flex-wrap items-center justify-end gap-2 mt-2 sm:mt-0">
            <div className="hidden sm:flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full font-bold shadow-sm" aria-label={`XP earned ${stats.totalXp}`}>
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
                  wasHintUsed || hintsLeft <= 0 ? 'bg-muted text-muted-foreground opacity-50' : 'bg-primary/10 text-primary hover:bg-primary/20 active:scale-95'
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
                feedback !== null ? 'bg-muted text-muted-foreground opacity-50' : 'bg-destructive/10 text-destructive hover:bg-destructive/20 active:scale-95'
              }`}
            >
              <SkipForward size={16} />
              <span className="text-sm hidden sm:inline">Skip</span>
            </button>
          </div>
        </div>

        {/* New Segmented Progress Bar */}
        <div className="w-full mt-2 relative px-2">
          <div className="w-full flex gap-1.5" aria-label="Mission answer results">
            {sessionQuestions.map((_, index) => {
              const result = index === currentIndex && feedback
                ? (feedback.isSkipped ? "skipped" : feedback.isCorrect)
                : answerResults[index];
              const isCurrent = index === currentIndex && !feedback;
              return <div key={index} title={result === true ? `Challenge ${index + 1}: correct` : result === false ? `Challenge ${index + 1}: incorrect` : result === "skipped" ? `Challenge ${index + 1}: skipped` : `Challenge ${index + 1}: not answered`} className={clsx("h-3 w-3 shrink-0 rounded-full border transition-all", result === true && "border-emerald-500 bg-emerald-500", result === false && "border-red-500 bg-red-500", result === "skipped" && "border-amber-500 bg-amber-400", result === null && (isCurrent ? "border-primary bg-primary/20 ring-2 ring-primary/20" : "border-border bg-secondary"))} />;
            })}
          </div>
          <div 
            className="absolute top-1/2 -translate-y-1/2 z-20 transition-all duration-500 ease-out drop-shadow-lg"
            style={{ left: `calc(${((currentIndex + (feedback ? 1 : 0)) / sessionQuestions.length) * 100}% - 10px)` }}
          >
            <div className="bg-card p-1.5 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.1)] border border-primary/20">
              <Brain size={22} className="text-primary animate-pulse" />
            </div>
          </div>
        </div>
      </div>
      
      <div className="w-full animate-in fade-in slide-in-from-right-4 duration-300">
        <GameShell>{renderGame()}</GameShell>
      </div>
    </div>
  );
}

