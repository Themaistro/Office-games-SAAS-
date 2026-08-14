// ==========================================
// GAME CONTENT & PUZZLE GENERATION LIBRARY
// ==========================================

export const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
export const shuffle = <T>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

type Difficulty = 'easy' | 'medium' | 'hard';

// ------------------------------------------
// 1. TYPING CHALLENGE CONTENT
// ------------------------------------------
const TYPING_PROMPTS = {
  easy: [
    "Welcome to the team.",
    "Please check your email.",
    "The meeting is at noon.",
    "Let's schedule a quick call.",
    "Have a great weekend."
  ],
  medium: [
    "Synergy is key to our organizational success and long-term viability.",
    "Please ensure the Q3 quarterly report is submitted by end of day.",
    "Let's touch base on the deliverable tomorrow before the standup.",
    "We need to pivot our strategy to align with the new KPIs.",
    "The onboarding process has been streamlined for new hires."
  ],
  hard: [
    "const initializeApp = async () => { await db.connect(); };",
    "function factorial(n) { return n <= 1 ? 1 : n * factorial(n-1); }",
    "SELECT * FROM users WHERE status = 'active' ORDER BY created_at DESC;",
    "git commit -m 'fix: resolve race condition in authentication flow'",
    "Array.from({ length: 10 }).map((_, i) => i * Math.PI);"
  ]
};

export const generateTypingChallenge = (count: number = 5, difficulty: Difficulty = 'medium') => {
  const bank = TYPING_PROMPTS[difficulty];
  const shuffled = shuffle(bank);
  return Array.from({ length: count }).map((_, i) => {
    const text = i < shuffled.length ? shuffled[i] : getRandomItem(bank);
    return {
      correctAnswer: "type-exactly",
      content: { text },
      options: []
    };
  });
};

// ------------------------------------------
// 2. WORD UNSCRAMBLE
// ------------------------------------------
const WORD_BANK = [
  "OFFICE", "MEETING", "PROJECT", "COFFEE", "SYNERGY", "DEADLINE", "MANAGER", "LEADER", 
  "SUCCESS", "LAPTOP", "KEYBOARD", "MONITOR", "NETWORK", "SERVER", "DATABASE", "FRONTEND", 
  "BACKEND", "DESIGN", "DEVELOPER", "INNOVATION", "STRATEGY", "AGILE", "SCRUM", "SPRINT",
  "METRICS", "ANALYTICS", "REVENUE", "GROWTH", "BUDGET", "FINANCE", "MARKETING", "SALES",
  "CUSTOMER", "SUPPORT", "PRODUCT", "FEATURE", "RELEASE", "VERSION", "DEPLOYMENT", "INFRASTRUCTURE"
];

export const generateWordUnscramble = (count: number = 5, difficulty: Difficulty = 'medium') => {
  let filteredBank = WORD_BANK;
  if (difficulty === 'easy') filteredBank = WORD_BANK.filter(w => w.length <= 5);
  if (difficulty === 'medium') filteredBank = WORD_BANK.filter(w => w.length > 5 && w.length <= 8);
  if (difficulty === 'hard') filteredBank = WORD_BANK.filter(w => w.length > 8);
  
  if (filteredBank.length === 0) filteredBank = WORD_BANK;

  const shuffledBank = shuffle(filteredBank);
  return Array.from({ length: count }).map((_, i) => {
    const word = i < shuffledBank.length ? shuffledBank[i] : getRandomItem(filteredBank);
    let scrambled = word;
    while (scrambled === word) {
      scrambled = shuffle(word.split('')).join('');
    }
    const decoys = shuffle(WORD_BANK.filter(w => w !== word)).slice(0, 3);
    
    return {
      correctAnswer: word,
      content: { scrambled },
      options: shuffle([word, ...decoys])
    };
  });
};

// ------------------------------------------
// 3. MENTAL MATH GENERATOR
// ------------------------------------------
export const generateMentalMath = (count: number = 5, difficulty: Difficulty = 'medium') => {
  return Array.from({ length: count }).map(() => {
    let a = 0, b = 0, answer = 0;
    let op = '+';

    if (difficulty === 'easy') {
      op = getRandomItem(['+', '-']);
      a = Math.floor(Math.random() * 20) + 1;
      b = Math.floor(Math.random() * 20) + 1;
      if (op === '-' && b > a) [a, b] = [b, a]; // keep it positive
    } else if (difficulty === 'medium') {
      op = getRandomItem(['+', '-', '*']);
      if (op === '*') {
        a = Math.floor(Math.random() * 10) + 2;
        b = Math.floor(Math.random() * 10) + 2;
      } else {
        a = Math.floor(Math.random() * 50) + 20;
        b = Math.floor(Math.random() * 50) + 10;
      }
    } else {
      op = getRandomItem(['+', '-', '*']);
      if (op === '*') {
        a = Math.floor(Math.random() * 15) + 5;
        b = Math.floor(Math.random() * 15) + 5;
      } else {
        a = Math.floor(Math.random() * 500) + 100;
        b = Math.floor(Math.random() * 500) + 50;
      }
    }

    if (op === '+') answer = a + b;
    else if (op === '-') answer = a - b;
    else if (op === '*') answer = a * b;

    const equation = `${a} ${op} ${b} = ?`;
    
    const decoys = new Set<string>();
    while(decoys.size < 3) {
      const offset = Math.floor(Math.random() * 10) - 5;
      const decoy = answer + offset;
      if (decoy !== answer && decoy > 0) decoys.add(decoy.toString());
    }

    return {
      correctAnswer: answer.toString(),
      content: { text: equation },
      options: shuffle([answer.toString(), ...Array.from(decoys)])
    };
  });
};

// ------------------------------------------
// 4. LOGIC & SEQUENCE GENERATOR
// ------------------------------------------
export const generateSequence = (count: number = 5, difficulty: Difficulty = 'medium') => {
  return Array.from({ length: count }).map(() => {
    const seq: number[] = [];
    let answer = 0;

    if (difficulty === 'easy') {
      const start = Math.floor(Math.random() * 10) + 1;
      const step = Math.floor(Math.random() * 5) + 2;
      for(let i=0; i<4; i++) seq.push(start + (step * i));
      answer = start + (step * 4);
    } else if (difficulty === 'medium') {
      const start = Math.floor(Math.random() * 3) + 2;
      const mult = Math.floor(Math.random() * 3) + 2;
      for(let i=0; i<4; i++) seq.push(start * Math.pow(mult, i));
      answer = start * Math.pow(mult, 4);
    } else {
      let a = Math.floor(Math.random() * 3) + 1;
      let b = Math.floor(Math.random() * 3) + 2;
      seq.push(a, b);
      for(let i=2; i<4; i++) {
        const next = seq[i-1] + seq[i-2];
        seq.push(next);
      }
      answer = seq[3] + seq[2];
    }

    const text = `${seq.join(', ')}, ?`;
    
    const decoys = new Set<string>();
    while(decoys.size < 3) {
      const decoy = answer + Math.floor(Math.random() * 10) - 5;
      if (decoy !== answer && decoy > 0) decoys.add(decoy.toString());
    }

    return {
      correctAnswer: answer.toString(),
      content: { text },
      options: shuffle([answer.toString(), ...Array.from(decoys)])
    };
  });
};

// ------------------------------------------
// 5. ODD OBJECT GENERATOR
// ------------------------------------------
const CATEGORIES_EASY = [
  { theme: 'Fruits', items: ['Apple', 'Banana', 'Orange', 'Mango', 'Grape', 'Pear'] },
  { theme: 'Cars', items: ['Toyota', 'Ford', 'Honda', 'Chevrolet', 'Nissan'] },
  { theme: 'Animals', items: ['Dog', 'Cat', 'Elephant', 'Lion', 'Tiger', 'Bear'] }
];

const CATEGORIES_MEDIUM = [
  { theme: 'Compiled Languages', items: ['C', 'C++', 'Rust', 'Go', 'Java'] },
  { theme: 'Interpreted Languages', items: ['Python', 'JavaScript', 'Ruby', 'PHP'] },
  { theme: 'Relational DBs', items: ['PostgreSQL', 'MySQL', 'Oracle', 'SQL Server'] },
  { theme: 'NoSQL DBs', items: ['MongoDB', 'Cassandra', 'Redis', 'DynamoDB'] }
];

const CATEGORIES_HARD = [
  { theme: 'React Hooks', items: ['useState', 'useEffect', 'useContext', 'useMemo'] },
  { theme: 'React Component Methods', items: ['componentDidMount', 'render', 'shouldComponentUpdate'] },
  { theme: 'CSS Layout', items: ['flex', 'grid', 'block', 'inline'] },
  { theme: 'CSS Typography', items: ['font-size', 'line-height', 'letter-spacing', 'text-align'] }
];

export const generateOddObject = (count: number = 5, difficulty: Difficulty = 'medium') => {
  return Array.from({ length: count }).map(() => {
    let activeCats = CATEGORIES_MEDIUM;
    if (difficulty === 'easy') activeCats = CATEGORIES_EASY;
    if (difficulty === 'hard') activeCats = CATEGORIES_HARD;

    const shuffledCats = shuffle(activeCats);
    const mainCat = shuffledCats[0];
    const oddCat = shuffledCats[1];

    const mainItems = shuffle(mainCat.items).slice(0, 3);
    const oddItem = shuffle(oddCat.items)[0];
    
    return {
      correctAnswer: oddItem,
      content: { text: "Find the odd one out." },
      options: shuffle([...mainItems, oddItem])
    };
  });
};

// ------------------------------------------
// 6. TRIVIA BANK
// ------------------------------------------
export const TRIVIA_BANK = [
  // General
  { q: "What planet is known as the Red Planet?", a: "Mars", decoys: ["Venus", "Jupiter", "Saturn"], department: "General", difficulty: "easy" },
  { q: "What is the capital of Australia?", a: "Canberra", decoys: ["Sydney", "Melbourne", "Perth"], department: "General", difficulty: "medium" },
  { q: "In what year was the first iPhone released?", a: "2007", decoys: ["2005", "2008", "2010"], department: "General", difficulty: "medium" },
  { q: "What is the powerhouse of the cell?", a: "Mitochondria", decoys: ["Nucleus", "Ribosome", "Endoplasmic Reticulum"], department: "General", difficulty: "easy" },
  { q: "Which element has the chemical symbol 'Au'?", a: "Gold", decoys: ["Silver", "Argon", "Aluminum"], department: "General", difficulty: "hard" },
  { q: "Who painted the Mona Lisa?", a: "Leonardo da Vinci", decoys: ["Vincent van Gogh", "Pablo Picasso", "Claude Monet"], department: "General", difficulty: "hard" },
  
  // Engineering
  { q: "What does HTML stand for?", a: "Hyper Text Markup Language", decoys: ["Home Tool Markup Language", "Hyperlinks and Text Markup Language", "Hyper Tool Multi Language"], department: "Engineering", difficulty: "easy" },
  { q: "Which company created React?", a: "Facebook (Meta)", decoys: ["Google", "Microsoft", "Twitter"], department: "Engineering", difficulty: "easy" },
  { q: "Which programming language is known as the mother of all languages?", a: "C", decoys: ["Java", "Assembly", "Python"], department: "Engineering", difficulty: "medium" },
  { q: "What does API stand for?", a: "Application Programming Interface", decoys: ["Advanced Program Integration", "Automated Programming Interface", "Application Process Integration"], department: "Engineering", difficulty: "medium" },
  { q: "In Git, what command saves your changes to the local repository?", a: "git commit", decoys: ["git push", "git save", "git store"], department: "Engineering", difficulty: "hard" },

  // HR
  { q: "What does FMLA stand for?", a: "Family and Medical Leave Act", decoys: ["Federal Medical Leave Allowance", "Family Maternity Leave Act", "Fair Medical Leave Agreement"], department: "HR", difficulty: "easy" },
  { q: "In HR, what is the term for the rate at which employees leave a workforce?", a: "Turnover Rate", decoys: ["Attrition Factor", "Departure Index", "Retention Loss"], department: "HR", difficulty: "medium" },
  { q: "What does KPI stand for in performance management?", a: "Key Performance Indicator", decoys: ["Key Process Index", "Knowledge Performance Index", "Key Productivity Indicator"], department: "HR", difficulty: "medium" },
  { q: "Which act established the minimum wage in the US?", a: "Fair Labor Standards Act", decoys: ["Equal Pay Act", "Civil Rights Act", "National Labor Relations Act"], department: "HR", difficulty: "hard" },
  { q: "What is the process of integrating a new employee into an organization called?", a: "Onboarding", decoys: ["Induction", "Orientation", "Assimilation"], department: "HR", difficulty: "easy" },

  // Sales
  { q: "What does CRM stand for?", a: "Customer Relationship Management", decoys: ["Client Retention Model", "Customer Revenue Management", "Client Relationship Marketing"], department: "Sales", difficulty: "easy" },
  { q: "In sales, what does B2B stand for?", a: "Business to Business", decoys: ["Business to Buyer", "Buyer to Buyer", "Brand to Business"], department: "Sales", difficulty: "easy" },
  { q: "What is the term for a potential customer who has shown interest in a product?", a: "Lead", decoys: ["Prospect", "Target", "Suspect"], department: "Sales", difficulty: "medium" },
  { q: "What does ROI stand for?", a: "Return on Investment", decoys: ["Revenue on Investment", "Return on Income", "Rate of Interest"], department: "Sales", difficulty: "medium" },
  { q: "What is the final step of the sales process called?", a: "Closing", decoys: ["Pitching", "Prospecting", "Negotiating"], department: "Sales", difficulty: "hard" }
];

export const generateTrivia = (count: number = 20, difficulty: Difficulty = 'medium') => {
  const filteredBank = TRIVIA_BANK.filter(t => t.difficulty === difficulty);
  // Fallback to all if not enough questions in that difficulty yet
  const bankToUse = filteredBank.length > 0 ? filteredBank : TRIVIA_BANK;
  
  const shuffled = shuffle(bankToUse);
  return Array.from({ length: count }).map((_, i) => {
    const trivia = i < shuffled.length ? shuffled[i] : getRandomItem(bankToUse);
    return {
      correctAnswer: trivia.a,
      content: { 
        question: trivia.q,
        department: trivia.department 
      },
      options: shuffle([trivia.a, ...trivia.decoys])
    };
  });
};

// ------------------------------------------
// 7. SUDOKU LITE
// ------------------------------------------
export const generateSudokuLite = (count: number = 5, difficulty: Difficulty = 'medium') => {
  return Array.from({ length: count }).map(() => {
    const fullSet = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const grid = shuffle([...fullSet]);
    
    const missingIndex = Math.floor(Math.random() * 9);
    const missingAnswer = grid[missingIndex];
    
    const gridWithNull: (number | null)[] = [...grid];
    gridWithNull[missingIndex] = null;

    const decoys = new Set<string>();
    while(decoys.size < 3) {
      const d = Math.floor(Math.random() * 9) + 1;
      if (d !== missingAnswer) decoys.add(d.toString());
    }

    return {
      correctAnswer: missingAnswer.toString(),
      content: { grid: gridWithNull, missingIndex },
      options: shuffle([missingAnswer.toString(), ...Array.from(decoys)])
    };
  });
};

// ------------------------------------------
// 8. PURE NUMBER MEMORY
// ------------------------------------------
export const generateMemory = (count: number = 5, difficulty: Difficulty = 'medium') => {
  return Array.from({ length: count }).map(() => {
    let length = 5;
    if (difficulty === 'medium') length = 7;
    if (difficulty === 'hard') length = 9;

    let seq = "";
    for (let j = 0; j < length; j++) {
      seq += Math.floor(Math.random() * 10).toString();
    }
    return {
      correctAnswer: seq,
      content: { text: seq },
      options: []
    };
  });
};
