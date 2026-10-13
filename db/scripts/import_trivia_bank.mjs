import fs from "node:fs/promises";
import pg from "pg";

const inputPath = new URL("../seeds/all_trivia.json", import.meta.url);
const records = JSON.parse(await fs.readFile(inputPath, "utf8"));
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || "postgresql://brain_arena:change-me-local-only@localhost:5433/daily_brain_arena" });

try {
  await pool.query("BEGIN");
  for (const record of records) {
    await pool.query(
      `INSERT INTO master_trivia_bank (id, question, answer, decoys, department, difficulty)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6)
       ON CONFLICT (id) DO UPDATE SET question = EXCLUDED.question, answer = EXCLUDED.answer,
         decoys = EXCLUDED.decoys, department = EXCLUDED.department, difficulty = EXCLUDED.difficulty`,
      [record.id, record.question.trim(), record.answer.trim(), JSON.stringify(record.decoys || []), record.department || "General", record.difficulty || "medium"]
    );
  }
  await pool.query("COMMIT");
  console.log(`Imported ${records.length} Trivia records into master_trivia_bank.`);
} catch (error) {
  await pool.query("ROLLBACK");
  throw error;
} finally {
  await pool.end();
}
