const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');
const envVars = envFile.split('\n').reduce((acc, line) => {
  const [k, ...rest] = line.split('=');
  if (k && rest.length > 0) acc[k.trim()] = rest.join('=').trim();
  return acc;
}, {});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
);

const newTypingSentences = [
  { prompt_text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", difficulty: "hard" },
  { prompt_text: "The quick brown fox jumps over the lazy dog.", difficulty: "easy" },
  { prompt_text: "Innovation distinguishes between a leader and a follower.", difficulty: "medium" },
  { prompt_text: "To be yourself in a world that is constantly trying to make you something else is the greatest accomplishment.", difficulty: "hard" },
  { prompt_text: "The future belongs to those who believe in the beauty of their dreams.", difficulty: "medium" },
  { prompt_text: "A user interface is like a joke. If you have to explain it, it's not that good.", difficulty: "medium" },
  { prompt_text: "First, solve the problem. Then, write the code.", difficulty: "easy" },
  { prompt_text: "Simplicity is the soul of efficiency.", difficulty: "easy" },
  { prompt_text: "Make it work, make it right, make it fast.", difficulty: "easy" },
  { prompt_text: "Experience is the name everyone gives to their mistakes.", difficulty: "medium" },
  { prompt_text: "In the middle of difficulty lies opportunity.", difficulty: "medium" },
  { prompt_text: "Programming isn't about what you know; it's about what you can figure out.", difficulty: "hard" },
  { prompt_text: "The best way to predict the future is to invent it.", difficulty: "medium" },
  { prompt_text: "Code is read more often than it is written.", difficulty: "easy" },
  { prompt_text: "It's not a bug. It's an undocumented feature!", difficulty: "easy" },
  { prompt_text: "Sometimes it pays to stay in bed on Monday, rather than spending the rest of the week debugging Monday's code.", difficulty: "hard" }
];

async function fix() {
  console.log("1. Deactivating duplicate games...");
  await supabase.from('game_types').update({ is_active: false }).in('slug', ['math', 'word', 'coding']);

  console.log("2. Deduplicating master_trivia_bank...");
  let page = 0;
  const pageSize = 1000;
  let allTrivia = [];
  while (true) {
    const { data } = await supabase.from('master_trivia_bank').select('id, question').range(page * pageSize, (page + 1) * pageSize - 1);
    if (!data || data.length === 0) break;
    allTrivia.push(...data);
    page++;
  }
  
  const seen = new Set();
  const toDelete = [];
  for (const t of allTrivia) {
    if (seen.has(t.question)) {
      toDelete.push(t.id);
    } else {
      seen.add(t.question);
    }
  }

  if (toDelete.length > 0) {
    console.log(`Found ${toDelete.length} duplicates. Deleting...`);
    // Delete in chunks of 500
    for(let i=0; i<toDelete.length; i+=500) {
      await supabase.from('master_trivia_bank').delete().in('id', toDelete.slice(i, i+500));
    }
  } else {
    console.log("No duplicates found in trivia.");
  }

  console.log("3. Seeding new typing sentences...");
  await supabase.from('master_typing_bank').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('master_typing_bank').insert(newTypingSentences);
  
  console.log("Done!");
}

fix();
