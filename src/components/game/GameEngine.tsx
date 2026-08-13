"use client";

import { useState, useEffect } from "react";
import { SessionQuestion } from "@/components/game/types/game";
import LogicGame from "./types/LogicGame";
import TriviaGame from "./types/TriviaGame";
import WordGame from "./types/WordGame";
import MemoryGame from "./types/MemoryGame";
import { Trophy, CheckCircle, Flame, Target } from "lucide-react";
import { useRouter } from "next/navigation";
import { submitAnswer } from "@/app/play/actions";

interface GameEngineProps {
  sessionQuestions: SessionQuestion[];
  onComplete: () => void;
}

export default function GameEngine({ sessionQuestions, onComplete }: GameEngineProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  
  // Stats tracking
  const [stats, setStats] = useState({
    totalScore: 0,
    totalXp: 0,
    correctAnswers: 0,
  });

  const currentSessionQuestion = sessionQuestions[currentIndex];

  useEffect(() => {
    setQuestionStartTime(Date.now());
  }, [currentIndex]);
  
  const handleAnswer = async (answer: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
    const sq = currentSessionQuestion;

    try {
      const result = await submitAnswer(sq.id, answer, timeSpent);
      
      const isCorrect = result.success ? result.isCorrect : false;
      const xpEarned = result.success ? result.xpEarned : 0;

      const newStats = {
        totalScore: stats.totalScore + (isCorrect ? 100 : 0),
        totalXp: stats.totalXp + (xpEarned || 0),
        correctAnswers: stats.correctAnswers + (isCorrect ? 1 : 0),
      };
      
      setStats(newStats);

      if (currentIndex < sessionQuestions.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setIsSubmitting(false);
      } else {
        // Session complete
        setIsSessionComplete(true);
        onComplete(); // Tells parent to trigger endSession
      }

    } catch (e) {
      console.error(e);
      setIsSubmitting(false);
    }
  };

  if (isSessionComplete) {
    const accuracy = Math.round((stats.correctAnswers / sessionQuestions.length) * 100) || 0;
    
    return (
      <div className="w-full max-w-md mx-auto text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-primary/10 p-6 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
          <CheckCircle className="text-primary w-12 h-12" />
        </div>
        
        <div>
          <h2 className="text-3xl font-bold mb-2">Today's Mission Complete 🎉</h2>
          <p className="text-muted-foreground">Come back tomorrow for your next mission.</p>
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
            <span className="text-muted-foreground text-sm font-medium uppercase tracking-wider mb-1">Streak</span>
            <div className="flex items-center gap-1">
              <Flame size={18} className="text-orange-500" />
              <span className="text-2xl font-bold text-orange-500">🔥 +1</span>
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
    const question = currentSessionQuestion.question;
    const props = { question, onAnswer: handleAnswer, isSubmitting };

    switch (question.game_type.slug) {
      case 'logic':
        return <LogicGame {...props} />;
      case 'word':
        return <WordGame {...props} />;
      case 'memory':
        return <MemoryGame {...props} />;
      case 'trivia':
      case 'company_trivia':
        return <TriviaGame {...props} />;
      default:
        return <TriviaGame {...props} />; 
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full mb-8 flex items-center justify-between">
        <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
          Challenge {currentIndex + 1} of {sessionQuestions.length}
        </span>
        <div className="flex gap-1">
          {sessionQuestions.map((_, i) => (
            <div 
              key={i} 
              className={`h-2 w-8 rounded-full transition-colors ${
                i < currentIndex ? 'bg-primary' : 
                i === currentIndex ? 'bg-primary/50' : 'bg-muted'
              }`} 
            />
          ))}
        </div>
      </div>
      
      <div className="w-full animate-in fade-in slide-in-from-right-4 duration-300">
        {renderGame()}
      </div>
    </div>
  );
}
