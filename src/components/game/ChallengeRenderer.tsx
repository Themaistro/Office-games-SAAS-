'use client';
import type { ComponentType } from 'react';
import type { GameProps } from '@/types/game';
import Logic from './types/LogicGame';
import Word from './types/WordGame';
import Memory from './types/MemoryGame';
import Reaction from './types/ReactionGame';
import Stroop from './types/StroopGame';
import Sequence from './types/SequenceGame';
import Cards from './types/CardMatchGame';
import Sudoku from './types/SudokuLiteGame';
import Odd from './types/OddObjectGame';
import Unscramble from './types/UnscrambleGame';
import Typing from './types/TypingGame';
import MathGame from './types/MentalMathGame';
import Target from './types/TargetNumberGame';
import Missing from './types/MissingLettersGame';
const renderers:Record<string,ComponentType<GameProps>>={logic:Logic,word:Word,memory:Memory,reaction:Reaction,stroop:Stroop,sequence:Sequence,card_match:Cards,'card-match':Cards,sudoku_lite:Sudoku,'sudoku-lite':Sudoku,odd_object:Odd,'odd-object':Odd,unscramble:Unscramble,'word-unscramble':Unscramble,typing:Typing,'typing-challenge':Typing,mental_math:MathGame,'mental-math':MathGame};
export default function ChallengeRenderer(props:GameProps){const q=props.question;const Game=q.game_type.slug==='math'?Target:q.game_type.slug==='word'&&q.content?.wordWithBlanks?Missing:renderers[q.game_type.slug];return Game?<Game {...props}/>:<p className="text-muted-foreground">This challenge cannot be played in this format.</p>;}
