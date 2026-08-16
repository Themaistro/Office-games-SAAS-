const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const supabaseUrl = urlMatch[1].trim();
const supabaseKey = keyMatch[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

const TRICKY_PAIRS = [
  ["😏", "😒"], ["😔", "😟"], ["😭", "😢"], ["🍎", "🍅"],
  ["🍊", "🍑"], ["🥑", "🍐"], ["🥞", "🧇"], ["🍨", "🍧"],
  ["🍩", "🥯"], ["🚗", "🚙"], ["🚌", "🚐"], ["🏠", "🏡"],
  ["🏢", "🏬"], ["🏦", "🏛️"], ["⌚", "⏰"], ["📱", "📲"],
  ["💻", "🖥️"], ["📖", "📕"], ["🔨", "🪓"], ["⚔️", "🗡️"],
  ["🛡️", "🚪"], ["🎈", "🏮"], ["🎀", "🧣"], ["🐶", "🐱"],
  ["🐻", "🐼"], ["🦊", "🐺"], ["🐸", "🐢"], ["🐝", "🪰"],
  ["🌸", "🌺"], ["☀️", "🌞"], ["🌙", "🌛"], ["☁️", "🌧️"]
];

async function seedEmojis() {
  // Clear the existing text data
  const { error: err1 } = await supabase.from('master_odd_object_bank').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Wiped master_odd_object_bank:', err1 || 'success');

  // Insert Tricky Pairs
  // We'll split them by difficulty
  const toInsert = TRICKY_PAIRS.map((pair, idx) => {
    let difficulty = 'easy';
    if (idx > 10) difficulty = 'medium';
    if (idx > 20) difficulty = 'hard';

    return {
      theme: 'Emoji Pair',
      items: pair,
      difficulty
    };
  });

  const { error: err2 } = await supabase.from('master_odd_object_bank').insert(toInsert);
  console.log('Inserted new emoji pairs into master_odd_object_bank:', err2 || 'success');
}

seedEmojis();
