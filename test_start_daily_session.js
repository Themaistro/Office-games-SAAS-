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

async function testSession() {
  const today = new Date().toISOString().split('T')[0];
  const user_id = '00000000-0000-0000-0000-000000000000'; // dummy
  
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  
  let todaysQuestions = [];
  let page = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from("questions")
      .select("id, game_type_id, difficulty, content, options, base_xp, game_types (id, name, slug, is_active)")
      .gte("created_at", twoHoursAgo)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) throw error;
    if (data) todaysQuestions.push(...data);
    if (!data || data.length < pageSize) break;
    page++;
  }

  console.log("Total questions fetched:", todaysQuestions.length);

  const questionsByGame = {};
  for (const q of todaysQuestions) {
    if (!questionsByGame[q.game_type_id]) {
      questionsByGame[q.game_type_id] = [];
    }
    questionsByGame[q.game_type_id].push(q);
  }

  let incompleteGames = 0;
  for (const gameId in questionsByGame) {
    const easyQs = questionsByGame[gameId].filter(q => q.difficulty === 'easy');
    const medQs = questionsByGame[gameId].filter(q => q.difficulty === 'medium');
    const hardQs = questionsByGame[gameId].filter(q => q.difficulty === 'hard');
    
    if (easyQs.length === 0 || medQs.length === 0 || hardQs.length === 0) {
      console.log(`Game ${gameId} missing difficulty! E:${easyQs.length}, M:${medQs.length}, H:${hardQs.length}`);
      incompleteGames++;
    }
  }
  console.log("Games missing difficulties:", incompleteGames);
}

testSession();
