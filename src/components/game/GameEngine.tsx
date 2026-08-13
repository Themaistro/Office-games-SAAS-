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
import { Trophy, CheckCircle, Flame, Target, XCircle, ArrowRight, Lightbulb, Zap, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { submitAnswer } from "@/app/play/actions";

interface GameEngineProps {
  sessionQuestions: SessionQuestion[];
  onComplete: () => void;
}

// ... (Skipping unchanged type definitions)

// We inject the new routes into the switch block
// We do this by doing a multi replace on the file


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
  breakdown?: ScoreBreakdown;
}

export default function GameEngine({ sessionQuestions, onComplete }: GameEngineProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  
  // Advanced State
  const [currentCombo, setCurrentCombo] = useState(0);
  const [wasHintUsed, setWasHintUsed] = useState(false);

  // Stats tracking
  const [stats, setStats] = useState({
    totalScore: 0,
    totalXp: 0,
    correctAnswers: 0,
  });

  const currentSessionQuestion = sessionQuestions[currentIndex];

  useEffect(() => {
    setQuestionStartTime(Date.now());
    setWasHintUsed(false); // Reset hint for new question
  }, [currentIndex]);
  
  const handleAnswer = async (
    answer: string, 
    optionsOrIsCorrect?: boolean | { customIsCorrect?: boolean, customTimeSpent?: number, isPerfect?: boolean }, 
    legacyTimeSpent?: number
  ) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    let customIsCorrect: boolean | undefined;
    let customTimeSpent: number | undefined;
    let isPerfect: boolean | undefined;

    if (typeof optionsOrIsCorrect === 'boolean') {
      customIsCorrect = optionsOrIsCorrect;
      customTimeSpent = legacyTimeSpent;
    } else if (optionsOrIsCorrect) {
      customIsCorrect = optionsOrIsCorrect.customIsCorrect;
      customTimeSpent = optionsOrIsCorrect.customTimeSpent;
      isPerfect = optionsOrIsCorrect.isPerfect;
    }

    const timeSpent = customTimeSpent !== undefined ? customTimeSpent : Math.floor((Date.now() - questionStartTime) / 1000);
    const sq = currentSessionQuestion;

    try {
      const result = await submitAnswer(sq.id, answer, timeSpent, {
        customIsCorrect: customIsCorrect,
        wasHintUsed,
        isPerfect: isPerfect,
        currentCombo
      });
      
      const isCorrect = customIsCorrect !== undefined ? customIsCorrect : (result.success ? result.isCorrect : false);
      const xpEarned = result.success ? (result.xpEarned || 0) : 0;
      
      const correctAnswer = result.success ? result.correctAnswer : sq.question.correct_answer;
      const displayCorrectAnswer = correctAnswer || "Completed Successfully";

      if (isCorrect) {
        setCurrentCombo(prev => prev + 1);
      } else {
        setCurrentCombo(0);
      }

      const newStats = {
        totalScore: stats.totalScore + (isCorrect ? 100 : 0),
        totalXp: stats.totalXp + xpEarned,
        correctAnswers: stats.correctAnswers + (isCorrect ? 1 : 0),
      };
      
      setStats(newStats);
      
      setFeedback({
        isCorrect,
        xpEarned,
        correctAnswer: displayCorrectAnswer,
        breakdown: result.breakdown
      });
      
      setIsSubmitting(false);
    } catch (e) {
      console.error(e);
      setIsSubmitting(false);
    }
  };

  const handleNextChallenge = () => {
    setFeedback(null);
    if (currentIndex < sessionQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsSessionComplete(true);
      onComplete();
    }
  };

  if (isSessionComplete) {
    const accuracy = Math.round((stats.correctAnswers / (currentIndex || 1)) * 100) || 0;
    
    return (
      <div className="w-full max-w-md mx-auto text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-primary/10 p-6 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
          <CheckCircle className="text-primary w-12 h-12" />
        </div>
        
        <div>
          <h2 className="text-3xl font-bold mb-2">Time's Up! 🎉</h2>
          <p className="text-muted-foreground">You completed {currentIndex} challenges in this sprint.</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 bg-card border border-border p-6 rounded-2xl shadow-sm">
          <div className="flex flex-col items-center p-3">
            <span className="text-muted-foreground text-sm font-medium uppercase tracking-wider mb-1">Score</span>
            <span className="text-2xl font-bold">{stats.totalScore}</span>
          </div>
          <div className="flex flex-col items-center p-3">
            <span className="text-muted-foreground text-sm font-medium uppercase tracking-wider mb-1">XP Earned</span>
            <span className="text-2xl font-bold text-accent">+{stats.totalXp}</span>
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
              <span className="text-2xl font-bold text-orange-500">{currentCombo}</span>
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
      return (
        <div className="w-full flex flex-col items-center text-center animate-in zoom-in-95 duration-300 py-4 max-w-sm mx-auto">
          {feedback.isCorrect ? (
            <div className="bg-green-100 dark:bg-green-900/30 p-6 rounded-full mb-4">
              <CheckCircle className="w-16 h-16 text-green-600 dark:text-green-400" />
            </div>
          ) : (
            <div className="bg-red-100 dark:bg-red-900/30 p-6 rounded-full mb-4">
              <XCircle className="w-16 h-16 text-red-600 dark:text-red-400" />
            </div>
          )}
          
          <h2 className="text-3xl font-bold mb-2">
            {feedback.isCorrect ? "Correct!" : "Incorrect"}
          </h2>
          
          {feedback.isCorrect && feedback.breakdown ? (
            <div className="w-full bg-card border border-border rounded-xl p-4 mb-6 shadow-sm text-sm font-medium">
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-muted-foreground flex items-center gap-2"><CheckCircle size={16}/> Correct Answer</span>
                <span>+{feedback.breakdown.base}</span>
              </div>
              {feedback.breakdown.speed > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-border/50 text-blue-500">
                  <span className="flex items-center gap-2"><Zap size={16}/> Speed Bonus</span>
                  <span>+{feedback.breakdown.speed}</span>
                </div>
              )}
              {feedback.breakdown.noHint > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-border/50 text-green-500">
                  <span className="flex items-center gap-2"><Lightbulb size={16}/> No Hint</span>
                  <span>+{feedback.breakdown.noHint}</span>
                </div>
              )}
              {feedback.breakdown.perfect > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-border/50 text-purple-500">
                  <span className="flex items-center gap-2"><Star size={16}/> Perfect Puzzle</span>
                  <span>+{feedback.breakdown.perfect}</span>
                </div>
              )}
              {feedback.breakdown.combo > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-border/50 text-orange-500">
                  <span className="flex items-center gap-2"><Flame size={16}/> Combo Bonus</span>
                  <span>+{feedback.breakdown.combo}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-2 mt-2 font-bold text-lg text-primary">
                <span>Total XP Earned</span>
                <span>+{feedback.xpEarned} XP</span>
              </div>
            </div>
          ) : (
            <div className="mb-8">
              <p className="text-muted-foreground mb-1">The correct answer was:</p>
              <p className="text-xl font-bold">{feedback.correctAnswer}</p>
            </div>
          )}
          
          <button 
            onClick={handleNextChallenge}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-xl shadow-md transition-transform active:scale-95 text-lg"
          >
            {currentIndex < sessionQuestions.length - 1 ? "NEXT CHALLENGE" : "FINISH MISSION"}
            <ArrowRight size={20} />
          </button>
        </div>
      );
    }

    const question = currentSessionQuestion.question;
    const props = { question, onAnswer: handleAnswer, isSubmitting };

    switch (question.game_type.slug) {
      case 'logic':
        return <LogicGame {...props} />;
      case 'word':
        return <WordGame {...props} />;
      case 'memory':
        return <MemoryGame {...props} />;
      case 'reaction':
        return <ReactionGame {...props} />;
      case 'stroop':
        return <StroopGame {...props} />;
      case 'sequence':
        return <SequenceGame {...props} />;
      case 'card_match':
        return <CardMatchGame {...props} />;
      case 'sudoku_lite':
        return <SudokuLiteGame {...props} />;
      case 'odd_object':
        return <OddObjectGame {...props} />;
      case 'unscramble':
        return <UnscrambleGame {...props} />;
      case 'typing':
        return <TypingGame {...props} />;
      case 'mental_math':
        return <MentalMathGame {...props} />;
      case 'trivia':
      case 'company_trivia':
      case 'math':
      case 'coding':
        return <TriviaGame {...props} />;
      default:
        return <TriviaGame {...props} />; 
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full mb-6 flex items-center justify-between bg-card border border-border px-6 py-3 rounded-2xl shadow-sm">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Sprint Progress
          </span>
          <span className="font-bold text-lg">
            Challenge #{currentIndex + 1}
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-orange-500/10 text-orange-500 px-3 py-1 rounded-full font-bold">
            <Flame size={16} />
            <span>x{currentCombo}</span>
          </div>
          <button 
            onClick={() => setWasHintUsed(true)}
            disabled={wasHintUsed || feedback !== null}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-bold transition-colors ${
              wasHintUsed ? 'bg-muted text-muted-foreground opacity-50' : 'bg-primary/10 text-primary hover:bg-primary/20'
            }`}
          >
            <Lightbulb size={16} />
            <span className="text-sm">Hint</span>
          </button>
        </div>
      </div>
      
      <div className="w-full animate-in fade-in slide-in-from-right-4 duration-300">
        {renderGame()}
      </div>
    </div>
  );
}
