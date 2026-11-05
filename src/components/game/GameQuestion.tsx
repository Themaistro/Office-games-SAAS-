"use client";
import type { GameProps } from "@/types/game";
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

export default function GameQuestion({
  question,
  onAnswer,
  isSubmitting,
  showHint,
}: GameProps) {
  if (
    question.content &&
    question.content.question &&
    question.options &&
    question.options.length > 0
  ) {
    if (question.content.isCompanyTrivia) {
      return (
        <CompanyTriviaGame
          key={question.id}
          question={question}
          onAnswer={onAnswer}
          isSubmitting={isSubmitting}
          showHint={showHint}
        />
      );
    }
    return (
      <TriviaGame
        key={question.id}
        question={question}
        onAnswer={onAnswer}
        isSubmitting={isSubmitting}
        showHint={showHint}
      />
    );
  }

  switch (question.game_type.slug) {
    case "logic":
      return (
        <LogicGame
          key={question.id}
          question={question}
          onAnswer={onAnswer}
          isSubmitting={isSubmitting}
          showHint={showHint}
        />
      );
    case "word":
      return question.content?.wordWithBlanks ? (
        <MissingLettersGame
          key={question.id}
          question={question}
          onAnswer={onAnswer}
          isSubmitting={isSubmitting}
          showHint={showHint}
        />
      ) : (
        <WordGame
          key={question.id}
          question={question}
          onAnswer={onAnswer}
          isSubmitting={isSubmitting}
        />
      );
    case "unscramble":
    case "word-unscramble":
      return (
        <UnscrambleGame
          key={question.id}
          question={question}
          onAnswer={onAnswer}
          isSubmitting={isSubmitting}
          showHint={showHint}
        />
      );
    case "memory":
      return (
        <MemoryGame
          key={question.id}
          question={question}
          onAnswer={onAnswer}
          isSubmitting={isSubmitting}
          showHint={showHint}
        />
      );
    case "sequence":
      return (
        <SequenceGame
          key={question.id}
          question={question}
          onAnswer={onAnswer}
          isSubmitting={isSubmitting}
          showHint={showHint}
        />
      );
    case "reaction":
      return (
        <ReactionGame
          key={question.id}
          question={question}
          onAnswer={onAnswer}
          isSubmitting={isSubmitting}
          showHint={showHint}
        />
      );
    case "stroop":
      return (
        <StroopGame
          key={question.id}
          question={question}
          onAnswer={onAnswer}
          isSubmitting={isSubmitting}
          showHint={showHint}
        />
      );
    case "card_match":
    case "card-match":
      return (
        <CardMatchGame
          key={question.id}
          question={question}
          onAnswer={onAnswer}
          isSubmitting={isSubmitting}
          showHint={showHint}
        />
      );
    case "sudoku_lite":
    case "sudoku-lite":
      return (
        <SudokuLiteGame
          key={question.id}
          question={question}
          onAnswer={onAnswer}
          isSubmitting={isSubmitting}
          showHint={showHint}
        />
      );
    case "odd_object":
    case "odd-object":
      return (
        <OddObjectGame
          key={question.id}
          question={question}
          onAnswer={onAnswer}
          isSubmitting={isSubmitting}
          showHint={showHint}
        />
      );
    case "typing":
    case "typing-challenge":
      return (
        <TypingGame
          key={question.id}
          question={question}
          onAnswer={onAnswer}
          isSubmitting={isSubmitting}
          showHint={showHint}
        />
      );
    case "mental_math":
    case "mental-math":
      return (
        <MentalMathGame
          key={question.id}
          question={question}
          onAnswer={onAnswer}
          isSubmitting={isSubmitting}
          showHint={showHint}
        />
      );
    case "math":
      return question.content?.target !== undefined ? (
        <TargetNumberGame
          key={question.id}
          question={question}
          onAnswer={onAnswer}
          isSubmitting={isSubmitting}
          showHint={showHint}
        />
      ) : (
        <TriviaGame
          key={question.id}
          question={question}
          onAnswer={onAnswer}
          isSubmitting={isSubmitting}
          showHint={showHint}
        />
      );
    case "trivia":
    case "company_trivia":
      return (
        <TriviaGame
          key={question.id}
          question={question}
          onAnswer={onAnswer}
          isSubmitting={isSubmitting}
          showHint={showHint}
        />
      );
    default:
      return (
        <TriviaGame
          key={question.id}
          question={question}
          onAnswer={onAnswer}
          isSubmitting={isSubmitting}
          showHint={showHint}
        />
      );
  }
}
