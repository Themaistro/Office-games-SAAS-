import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || "postgresql://brain_arena:change-me-local-only@localhost:5433/daily_brain_arena" });
const decode = (value) => value.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, "&").replace(/&eacute;/g, "é").replace(/&rsquo;/g, "’").replace(/&ldquo;|&rdquo;/g, '"').replace(/&ndash;|&mdash;/g, "-");
const clean = (value) => decode(value).replace(/\s+/g, " ").trim();
const batches = [];
const categories = [9, 10, 17, 18, 21, 22, 23];

for (const difficulty of ["easy", "medium", "hard"]) {
  for (const category of categories) {
    const response = await fetch(`https://opentdb.com/api.php?amount=50&category=${category}&difficulty=${difficulty}&type=multiple`);
    if (!response.ok) throw new Error(`Question source returned ${response.status}`);
    const body = await response.json();
    batches.push(...(body.results || []));
    await new Promise((resolve) => setTimeout(resolve, 5500));
  }
}

const valid = batches.map((item) => ({
  question: clean(item.question),
  answer: clean(item.correct_answer),
  decoys: item.incorrect_answers.map(clean),
  difficulty: item.difficulty === "easy" ? "easy" : item.difficulty === "hard" ? "hard" : "medium",
  category: clean(item.category),
})).filter((item) => item.question.length >= 15 && item.answer.length > 0 && item.decoys.length === 3 && new Set([item.answer, ...item.decoys].map((value) => value.toLowerCase())).size === 4);

const seen = new Set();
const unique = valid.filter((item) => {
  const key = item.question.toLowerCase();
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

try {
  const { rows } = await pool.query("SELECT id FROM game_types WHERE slug = 'trivia' LIMIT 1");
  if (!rows[0]) throw new Error("Trivia game type is missing");
  await pool.query("BEGIN");
  let imported = 0;
  for (const item of unique) {
    const exists = await pool.query("SELECT 1 FROM master_trivia_bank WHERE lower(question) = lower($1) LIMIT 1", [item.question]);
    if (exists.rowCount) continue;
    await pool.query(
      "INSERT INTO master_trivia_bank (question, answer, decoys, department, difficulty) VALUES ($1,$2,$3::jsonb,$4,$5)",
      [item.question, item.answer, JSON.stringify(item.decoys), "General", item.difficulty]
    );
    imported++;
  }
  await pool.query("COMMIT");
  console.log(`Imported ${imported} new general-knowledge questions (${unique.length} passed validation).`);
} catch (error) {
  await pool.query("ROLLBACK");
  throw error;
} finally {
  await pool.end();
}
