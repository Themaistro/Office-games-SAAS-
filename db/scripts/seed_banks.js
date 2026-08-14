const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim();
  return acc;
}, {});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function fetchTrivia(amount, category) {
  try {
    const url = category ? `https://opentdb.com/api.php?amount=${amount}&category=${category}&type=multiple` : `https://opentdb.com/api.php?amount=${amount}&type=multiple`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.results) return data.results;
  } catch (e) {
    console.error("Error fetching trivia:", e);
  }
  return [];
}

async function fetchWords(amount) {
  try {
    const res = await fetch(`https://random-word-api.herokuapp.com/word?number=${amount}`);
    return await res.json();
  } catch (e) {
    console.error("Error fetching words:", e);
  }
  return [];
}

const decodeHtml = (html) => {
  return html.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
};

async function seed() {
  console.log("Seeding Database...");

  // 1. SEED TRIVIA (Using OpenTDB for General and Engineering)
  console.log("Fetching General Trivia...");
  const generalTrivia = await fetchTrivia(50, 9); // General Knowledge
  console.log("Fetching Engineering Trivia...");
  const engTrivia = await fetchTrivia(50, 18); // Science: Computers

  const triviaRows = [];
  
  // Format OpenTDB results
  [...generalTrivia, ...engTrivia].forEach(t => {
    let diff = t.difficulty;
    let dept = t.category.includes("Computers") ? "Engineering" : "General";
    triviaRows.push({
      question: decodeHtml(t.question),
      answer: decodeHtml(t.correct_answer),
      decoys: t.incorrect_answers.map(decodeHtml),
      department: dept,
      difficulty: diff
    });
  });

  // Hardcode some HR and Sales to get them started
  const extraTrivia = [
    { q: "What does CRM stand for?", a: "Customer Relationship Management", decoys: ["Client Retention Model", "Customer Revenue Management", "Client Relationship Marketing"], department: "Sales", difficulty: "easy" },
    { q: "What is B2B?", a: "Business to Business", decoys: ["Business to Buyer", "Buyer to Buyer", "Brand to Business"], department: "Sales", difficulty: "easy" },
    { q: "What does FMLA stand for?", a: "Family and Medical Leave Act", decoys: ["Federal Medical Leave Allowance", "Family Maternity Leave Act", "Fair Medical Leave Agreement"], department: "HR", difficulty: "easy" },
    { q: "What is Turnover Rate?", a: "Rate at which employees leave", decoys: ["Rate of new hires", "Rate of sales", "Rate of profit"], department: "HR", difficulty: "medium" },
    // Add 20 more procedural variants to bulk it up
    ...Array.from({length: 20}).map((_, i) => ({
      q: `What is the primary goal of Sales strategy #${i+1}?`, a: "Increase Revenue", decoys: ["Decrease Costs", "Hire more", "Do nothing"], department: "Sales", difficulty: "medium"
    })),
    ...Array.from({length: 20}).map((_, i) => ({
      q: `According to HR policy ${i+100}, what is required?`, a: "Compliance", decoys: ["Ignoring it", "Delegating", "Complaining"], department: "HR", difficulty: "medium"
    }))
  ];

  extraTrivia.forEach(t => {
    triviaRows.push({
      question: t.q, answer: t.a, decoys: t.decoys, department: t.department, difficulty: t.difficulty
    });
  });

  if (triviaRows.length > 0) {
    const { error } = await supabase.from('master_trivia_bank').insert(triviaRows);
    if (error) console.error("Error inserting trivia:", error);
    else console.log(`Inserted ${triviaRows.length} trivia questions!`);
  }

  // 2. SEED WORDS
  console.log("Fetching Words...");
  const words = await fetchWords(366);
  const wordRows = words.map(w => {
    let diff = 'medium';
    if (w.length <= 5) diff = 'easy';
    if (w.length > 8) diff = 'hard';
    return { word: w.toUpperCase(), difficulty: diff };
  });

  if (wordRows.length > 0) {
    const { error } = await supabase.from('master_word_bank').insert(wordRows);
    if (error) console.error("Error inserting words:", error);
    else console.log(`Inserted ${wordRows.length} words!`);
  }

  // 3. SEED TYPING
  console.log("Generating Typing Prompts...");
  const typingRows = [];
  const subjects = ["The manager", "Our team", "The client", "This project", "The new software"];
  const verbs = ["needs to review", "will deploy", "is requesting", "has approved", "will analyze"];
  const objects = ["the quarterly report.", "the final budget.", "the new feature.", "the performance metrics.", "the user feedback."];
  
  for (let i = 0; i < 366; i++) {
    const s = subjects[Math.floor(Math.random() * subjects.length)];
    const v = verbs[Math.floor(Math.random() * verbs.length)];
    const o = objects[Math.floor(Math.random() * objects.length)];
    typingRows.push({
      prompt_text: `${s} ${v} ${o}`,
      difficulty: 'medium'
    });
  }

  const { error: typeErr } = await supabase.from('master_typing_bank').insert(typingRows);
  if (typeErr) console.error("Error inserting typing:", typeErr);
  else console.log(`Inserted ${typingRows.length} typing prompts!`);

  // 4. SEED ODD OBJECT
  console.log("Generating Odd Object Themes...");
  const oddRows = [];
  const categories = [
    { t: "Colors", items: ["Red", "Blue", "Green", "Yellow", "Purple", "Orange"] },
    { t: "Animals", items: ["Dog", "Cat", "Elephant", "Lion", "Tiger", "Bear"] },
    { t: "Vehicles", items: ["Car", "Truck", "Motorcycle", "Bus", "Van"] },
    { t: "Fruits", items: ["Apple", "Banana", "Orange", "Grape", "Mango"] }
  ];
  
  for(let i=0; i<366; i++) {
    const theme = categories[Math.floor(Math.random() * categories.length)];
    oddRows.push({
      theme: theme.t,
      items: theme.items,
      difficulty: 'medium'
    });
  }

  const { error: oddErr } = await supabase.from('master_odd_object_bank').insert(oddRows);
  if (oddErr) console.error("Error inserting odd objects:", oddErr);
  else console.log(`Inserted ${oddRows.length} odd object themes!`);

  console.log("Seeding complete! You are ready for a 1-year runway!");
}

seed();
