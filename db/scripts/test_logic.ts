import { generateSequence } from './src/lib/game-content';

const questions = generateSequence(10, 'medium');

console.log("Logic Generator Test Output:");
questions.forEach((q, i) => {
  console.log(`\nQ${i+1}: ${q.content.text}`);
  console.log(`Answer: ${q.correctAnswer}`);
  console.log(`Options: ${q.options.join(' | ')}`);
});
