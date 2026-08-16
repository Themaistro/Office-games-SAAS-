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

const newWords = [
  // Easy (4-5 letters)
  { word: 'CLOUD', difficulty: 'easy' },
  { word: 'SMART', difficulty: 'easy' },
  { word: 'BRAIN', difficulty: 'easy' },
  { word: 'LOGIC', difficulty: 'easy' },
  { word: 'FOCUS', difficulty: 'easy' },
  { word: 'WATER', difficulty: 'easy' },
  { word: 'SPACE', difficulty: 'easy' },
  { word: 'MUSIC', difficulty: 'easy' },
  { word: 'LIGHT', difficulty: 'easy' },
  { word: 'POWER', difficulty: 'easy' },
  { word: 'VOICE', difficulty: 'easy' },
  { word: 'WORLD', difficulty: 'easy' },
  { word: 'TRUTH', difficulty: 'easy' },
  { word: 'CHAIR', difficulty: 'easy' },
  { word: 'BREAD', difficulty: 'easy' },
  
  // Medium (6-7 letters)
  { word: 'SYSTEM', difficulty: 'medium' },
  { word: 'DESIGN', difficulty: 'medium' },
  { word: 'SERVER', difficulty: 'medium' },
  { word: 'PUZZLE', difficulty: 'medium' },
  { word: 'PLANET', difficulty: 'medium' },
  { word: 'NATURE', difficulty: 'medium' },
  { word: 'ROCKET', difficulty: 'medium' },
  { word: 'LAPTOP', difficulty: 'medium' },
  { word: 'COFFEE', difficulty: 'medium' },
  { word: 'ANIMAL', difficulty: 'medium' },
  { word: 'STREET', difficulty: 'medium' },
  { word: 'MEMORY', difficulty: 'medium' },
  { word: 'SCREEN', difficulty: 'medium' },
  { word: 'WONDER', difficulty: 'medium' },
  { word: 'NETWORK', difficulty: 'medium' },
  
  // Hard (8-10 letters)
  { word: 'ALGORITHM', difficulty: 'hard' },
  { word: 'DATABASE', difficulty: 'hard' },
  { word: 'FRAMEWORK', difficulty: 'hard' },
  { word: 'KNOWLEDGE', difficulty: 'hard' },
  { word: 'INTERFACE', difficulty: 'hard' },
  { word: 'DEVELOPER', difficulty: 'hard' },
  { word: 'COMPUTING', difficulty: 'hard' },
  { word: 'CHALLENGE', difficulty: 'hard' },
  { word: 'BEAUTIFUL', difficulty: 'hard' },
  { word: 'STRUCTURE', difficulty: 'hard' },
  { word: 'AWARENESS', difficulty: 'hard' },
  { word: 'INVENTION', difficulty: 'hard' },
  { word: 'MOUNTAIN', difficulty: 'hard' },
  { word: 'DINOSAUR', difficulty: 'hard' },
  { word: 'DISCOVERY', difficulty: 'hard' }
];

async function seed() {
  console.log("Wiping old word bank...");
  const { error: delError } = await supabase.from('master_word_bank').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delError) {
    console.error("Error wiping:", delError);
    return;
  }
  
  console.log("Inserting new words...");
  const { error: insError } = await supabase.from('master_word_bank').insert(newWords);
  if (insError) {
    console.error("Error inserting:", insError);
    return;
  }
  
  console.log("Success! Inserted", newWords.length, "common words.");
}

seed();
