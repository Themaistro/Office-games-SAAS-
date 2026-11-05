/** Shared serializable payload. Game-specific fields are optional until narrowed. */
export interface QuestionContent {
  text?: string;
  question?: string;
  seed?: string;
  sourceKey?: string;
  generated?: boolean;
  isCompanyTrivia?: boolean;
  companyTriviaId?: string;
  wordWithBlanks?: string;
  scrambled?: string;
  target?: number;
  cards?: { id: number; emoji: string }[];
  even?: string;
  odd?: string;
}

/** New games can require their own fields without widening every component. */
type Metadata = Pick<
  QuestionContent,
  "seed" | "sourceKey" | "generated" | "isCompanyTrivia" | "companyTriviaId"
>;
type ChoicePayload = Metadata & Pick<QuestionContent, "question" | "text">;
export type ChallengePayloads = {
  trivia: ChoicePayload;
  company_trivia: ChoicePayload;
  coding: ChoicePayload;
  logic: ChoicePayload;
  word: Metadata & Pick<QuestionContent, "text">;
  missing_letters: Metadata & Pick<QuestionContent, "wordWithBlanks">;
  memory: Metadata & Pick<QuestionContent, "text">;
  typing: Metadata & Pick<QuestionContent, "text">;
  unscramble: Metadata & Pick<QuestionContent, "scrambled">;
  math: Metadata & Pick<QuestionContent, "target">;
  mental_math: Metadata;
  reaction: Metadata;
  stroop: Metadata;
  sequence: Metadata;
  card_match: Metadata & Pick<QuestionContent, "cards">;
  sudoku_lite: Metadata;
  odd_object: Metadata & Pick<QuestionContent, "even" | "odd">;
};

export function parseAnswerOptions(value: unknown): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string"))
    throw new Error("Question options must be strings");
  return value;
}

export function parseQuestionContent(value: unknown): QuestionContent {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Question content must be an object");
  const record = value as Record<string, unknown>;
  for (const key of [
    "text",
    "question",
    "sourceKey",
    "companyTriviaId",
    "wordWithBlanks",
    "scrambled",
    "even",
    "odd",
  ])
    if (record[key] !== undefined && typeof record[key] !== "string")
      throw new Error(`Invalid question field: ${key}`);
  for (const key of ["generated", "isCompanyTrivia"])
    if (record[key] !== undefined && typeof record[key] !== "boolean")
      throw new Error(`Invalid question field: ${key}`);
  if (record.seed !== undefined && typeof record.seed !== "string")
    throw new Error("Invalid question seed");
  if (
    record.target !== undefined &&
    (typeof record.target !== "number" || !Number.isFinite(record.target))
  )
    throw new Error("Invalid question target");
  if (
    record.cards !== undefined &&
    (!Array.isArray(record.cards) ||
      !record.cards.every(
        (item) =>
          item &&
          typeof item === "object" &&
          typeof item.id === "number" &&
          typeof item.emoji === "string",
      ))
  )
    throw new Error("Invalid question cards");
  return record as QuestionContent;
}
