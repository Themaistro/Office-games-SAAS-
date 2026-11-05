type Candidate = {
  id: string;
  difficulty: string;
  content?: Record<string, any>;
};
export function freshCandidatesFirst<T extends Candidate>(
  questions: T[],
  seenIds: Set<string>,
  seenKeys: Set<string>,
): T[] {
  const identities = new Set<string>();
  const unique = questions.filter((question) => {
    const content = question.content ?? {};
    const identity = content.text
      ? `text:${String(content.text).trim().toLowerCase()}`
      : content.sourceKey || content.seed || JSON.stringify(content);
    const key = `${question.difficulty}:${identity}`;
    if (identities.has(key)) return false;
    identities.add(key);
    return true;
  });
  const fresh: T[] = [],
    repeated: T[] = [];
  for (const question of unique) {
    const key = question.content?.sourceKey || question.content?.seed;
    (seenIds.has(question.id) || (key && seenKeys.has(key))
      ? repeated
      : fresh
    ).push(question);
  }
  const shuffle = (items: T[]) => {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  };
  return [...shuffle(fresh), ...shuffle(repeated)];
}
