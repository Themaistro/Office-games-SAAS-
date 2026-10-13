import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || "postgresql://brain_arena:change-me-local-only@localhost:5433/daily_brain_arena" });

const decode = (value) => value
  .replace(/&quot;/g, '"')
  .replace(/&#039;/g, "'")
  .replace(/&amp;/g, "&")
  .replace(/&eacute;/g, "é")
  .replace(/&rsquo;/g, "’")
  .replace(/&ldquo;|&rdquo;/g, '"')
  .replace(/&ndash;|&mdash;/g, "-");
const clean = (value) => decode(value).replace(/\s+/g, " ").trim();

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchComputerQuestions(difficulty) {
  const questions = [];
  // The public source has a small per-request inventory. Smaller batches let
  // us collect the validated items it actually has instead of failing an
  // entire import when it cannot provide 50 of one difficulty at once.
  for (let batch = 0; batch < 5; batch += 1) {
    let body;
    for (let retry = 0; retry < 3; retry += 1) {
      const response = await fetch(`https://opentdb.com/api.php?amount=10&category=18&difficulty=${difficulty}&type=multiple`);
      if (!response.ok) throw new Error(`Computer question source returned ${response.status}`);
      body = await response.json();
      if (body.response_code !== 5) break;
      await pause(6000);
    }
    if (body?.response_code === 1) break;
    if (body?.response_code !== 0) throw new Error(`Computer question source returned code ${body?.response_code}`);
    questions.push(...(body.results || []));
    await pause(6000);
  }
  return questions.map((item) => ({
    question: clean(item.question),
    answer: clean(item.correct_answer),
    decoys: item.incorrect_answers.map(clean),
    difficulty,
  })).filter((item) => (
    item.question.length >= 15 &&
    item.answer.length > 0 &&
    item.decoys.length === 3 &&
    new Set([item.answer, ...item.decoys].map((value) => value.toLowerCase())).size === 4
  ));
}

try {
  const batches = [];
  for (const difficulty of ["easy", "medium", "hard"]) {
    batches.push(...await fetchComputerQuestions(difficulty));
  }

  const seen = new Set();
  const unique = batches.filter((item) => {
    const key = item.question.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  await pool.query("BEGIN");
  let imported = 0;
  for (const item of unique) {
    const existing = await pool.query(
      "SELECT 1 FROM master_trivia_bank WHERE lower(question) = lower($1) LIMIT 1",
      [item.question]
    );
    if (existing.rowCount) continue;
    await pool.query(
      "INSERT INTO master_trivia_bank (question, answer, decoys, department, difficulty) VALUES ($1,$2,$3::jsonb,$4,$5)",
      [item.question, item.answer, JSON.stringify(item.decoys), "Engineering", item.difficulty]
    );
    imported += 1;
  }
  await pool.query("COMMIT");
  console.log(`Imported ${imported} validated Coding questions (${unique.length} unique source questions).`);
} catch (error) {
  await pool.query("ROLLBACK");
  throw error;
} finally {
  await pool.end();
}
