export type PartyFormat = 'trivia' | 'mixed';
export type PartyMode = 'duel' | 'group';
export const partyLabel = (format: PartyFormat, mode: PartyMode) => `${format === 'trivia' ? 'Trivia' : 'Mixed Challenges'} ${mode === 'duel' ? 'Duel' : 'Group'}`;
export const isUuid = (id: unknown): id is string => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
export const SUPPORTED_PARTY_SLUGS = ['trivia','logic','word','memory','reaction','stroop','sequence','card_match','card-match','sudoku_lite','sudoku-lite','odd_object','odd-object','unscramble','word-unscramble','typing','typing-challenge','mental_math','mental-math','math','coding'];

export function partyChoicePrompt(question: { game_type: { slug: string }; content: Record<string, unknown>; options: unknown[] }): string | null {
  const prompt = question.content.question || (question.game_type.slug === 'coding' ? question.content.text || question.content.prompt : null);
  return typeof prompt === 'string' && prompt.trim() && question.options?.length > 1 && question.options.every(option=>typeof option==='string') ? prompt : null;
}

export function partyRoundDuration(slug: string, difficulty: string): number {
  if(['sudoku-lite','sudoku_lite'].includes(slug))return 120;
  // Two seconds allow normal delivery/submit latency after a challenge's own
  // timer ends. This is a round-close window, not extra interaction time.
  if(['card-match','card_match'].includes(slug))return (difficulty==='easy'?63:difficulty==='medium'?53:48)+2;
  if(slug==='stroop')return 10; // round window; the stimulus itself has a shorter difficulty timer
  if(['odd-object','odd_object','mental_math','mental-math'].includes(slug))return 17;
  if(slug==='sequence')return 22; // five-second memorization + fifteen-second attempt + delivery
  if(['typing','typing-challenge'].includes(slug))return 37; // five-second preparation + thirty-second attempt + delivery
  if(['logic','math','word','unscramble','word-unscramble'].includes(slug))return 32;
  return 60;
}

export function partyPerformanceFeedback(slug: string, correct: boolean): string {
  if(slug==='reaction')return correct?'Good catch!':'Missed the green flash';
  if(['typing','typing-challenge'].includes(slug))return correct?'Passage completed accurately':'Passage not completed accurately in time';
  if(['card_match','card-match'].includes(slug))return correct?'All pairs found!':'Not all pairs found in time';
  if(slug==='memory'||slug==='sequence')return correct?'Sequence remembered!':'Sequence not recalled correctly';
  if(['sudoku_lite','sudoku-lite'].includes(slug))return correct?'Puzzle solved!':'Puzzle not completed';
  return correct?'Challenge cleared!':'Challenge not cleared';
}
