export function typingTimeLimit(text: string, difficulty: string = "medium") {
  const targetWpm =
    difficulty === "easy" ? 25 : difficulty === "hard" ? 35 : 30;
  return Math.max(20, Math.ceil((text.trim().length / 5 / targetWpm) * 60) + 5);
}
