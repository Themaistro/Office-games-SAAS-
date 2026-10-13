import pg from "pg";
import crypto from "node:crypto";

const words = `adapt agile anchor balance beacon bridge bright budget canvas clarify compass create culture curious decide design discover dynamic effort engage evolve explore focus friendly growth habit improve insight journey launch listen method mission momentum notice observe office pattern people playful practice progress puzzle reason reflect reliable rhythm solve strategy support think thrive teamwork train vision wonder`.split(" ");
const typing = [
  "Small ideas become strong habits when we practice them consistently.",
  "A thoughtful pause can turn a difficult problem into a clear next step.",
  "Great teams make room for curiosity, feedback, and focused progress.",
  "The best solution is usually the one that is simple, useful, and kind.",
  "Take a short break, reset your attention, and return with fresh energy.",
  "Every challenge is a chance to learn something that helps the whole team.",
  "Clear communication makes collaboration faster, calmer, and more effective.",
  "Progress is built from small decisions repeated with care over time.",
  "A good question often reveals more than a quick answer.",
  "Notice the details, trust the process, and keep moving forward."
];
const oddThemes = [
  ["circle", "circle", "circle", "triangle"], ["red", "red", "blue", "red"],
  ["star", "star", "diamond", "star"], ["apple", "apple", "pear", "apple"],
  ["square", "square", "square", "hexagon"], ["north", "south", "east", "north"],
  ["cat", "cat", "cat", "dog"], ["one", "one", "two", "one"],
  ["calm", "calm", "calm", "bright"], ["book", "book", "lamp", "book"]
];

const id = (value) => crypto.createHash("sha256").update(value).digest("hex").slice(0, 32).replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || "postgresql://brain_arena:change-me-local-only@localhost:5433/daily_brain_arena" });

try {
  await pool.query("BEGIN");
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    await pool.query(`INSERT INTO master_word_bank (id, word, difficulty) VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING`, [id(`word:${word}`), word, i % 3 === 0 ? "easy" : i % 3 === 1 ? "medium" : "hard"]);
  }
  for (let i = 0; i < 120; i++) {
    const prompt = typing[i % typing.length];
    const variant = i < typing.length ? prompt : `${prompt} ${words[i % words.length]}.`;
    await pool.query(`INSERT INTO master_typing_bank (id, prompt_text, difficulty) VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING`, [id(`typing:${variant}`), variant, i % 3 === 0 ? "easy" : i % 3 === 1 ? "medium" : "hard"]);
  }
  for (let i = 0; i < 120; i++) {
    const items = oddThemes[i % oddThemes.length];
    const rotated = [...items.slice(i % 4), ...items.slice(0, i % 4)];
    await pool.query(`INSERT INTO master_odd_object_bank (id, theme, items, difficulty) VALUES ($1,$2,$3::jsonb,$4) ON CONFLICT (id) DO NOTHING`, [id(`odd:${i}:${rotated.join("|")}`), `pattern-${i + 1}`, JSON.stringify(rotated), i % 3 === 0 ? "easy" : i % 3 === 1 ? "medium" : "hard"]);
  }
  await pool.query("COMMIT");
  const result = await pool.query(`SELECT 'word' AS bank, count(*)::int FROM master_word_bank UNION ALL SELECT 'typing', count(*)::int FROM master_typing_bank UNION ALL SELECT 'odd_object', count(*)::int FROM master_odd_object_bank`);
  console.table(result.rows);
} catch (error) {
  await pool.query("ROLLBACK");
  throw error;
} finally {
  await pool.end();
}
