// ==========================================
// GAME CONTENT & PUZZLE GENERATION LIBRARY
// ==========================================

export const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
export const shuffle = <T>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

// ------------------------------------------
// 1. TYPING CHALLENGE CONTENT
// ------------------------------------------
export const TYPING_PROMPTS = [
  // Office & Business
  "Synergy is key to our organizational success and long-term viability.",
  "Please ensure the Q3 quarterly report is submitted by end of day.",
  "Let's touch base on the deliverable tomorrow before the standup.",
  "We need to pivot our strategy to align with the new KPIs.",
  "The onboarding process has been streamlined for new hires.",
  // Coding & Technical
  "const initializeApp = async () => { await db.connect(); };",
  "function factorial(n) { return n <= 1 ? 1 : n * factorial(n-1); }",
  "Always remember to properly close your HTML tags and format CSS.",
  "SELECT * FROM users WHERE status = 'active' ORDER BY created_at DESC;",
  "git commit -m 'fix: resolve race condition in authentication flow'",
  // Literature & Quotes
  "The quick brown fox jumps over the lazy dog near the river bank.",
  "To be, or not to be, that is the question that haunts us all.",
  "All that glitters is not gold, but it certainly catches the eye.",
  "Success is not final, failure is not fatal: it is the courage to continue that counts."
];

export const generateTypingChallenge = (count: number = 15) => {
  const shuffled = shuffle(TYPING_PROMPTS);
  return Array.from({ length: count }).map((_, i) => {
    const text = i < shuffled.length ? shuffled[i] : getRandomItem(TYPING_PROMPTS);
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
export const WORD_BANK = [
  "OFFICE", "MEETING", "PROJECT", "COFFEE", "SYNERGY", "DEADLINE", "MANAGER", "LEADER", 
  "SUCCESS", "LAPTOP", "KEYBOARD", "MONITOR", "NETWORK", "SERVER", "DATABASE", "FRONTEND", 
  "BACKEND", "DESIGN", "DEVELOPER", "INNOVATION", "STRATEGY", "AGILE", "SCRUM", "SPRINT",
  "METRICS", "ANALYTICS", "REVENUE", "GROWTH", "BUDGET", "FINANCE", "MARKETING", "SALES",
  "CUSTOMER", "SUPPORT", "PRODUCT", "FEATURE", "RELEASE", "VERSION", "DEPLOYMENT", "INFRASTRUCTURE"
];

export const generateWordUnscramble = (count: number = 15) => {
  const shuffledBank = shuffle(WORD_BANK);
  return Array.from({ length: count }).map((_, i) => {
    const word = i < shuffledBank.length ? shuffledBank[i] : getRandomItem(WORD_BANK);
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
export const generateMentalMath = (count: number = 15) => {
  return Array.from({ length: count }).map(() => {
    const operations = ['+', '-', '*'];
    const op = getRandomItem(operations);
    let a = 0, b = 0, answer = 0;

    if (op === '+') {
      a = Math.floor(Math.random() * 50) + 10;
      b = Math.floor(Math.random() * 50) + 10;
      answer = a + b;
    } else if (op === '-') {
      a = Math.floor(Math.random() * 50) + 30;
      b = Math.floor(Math.random() * 30) + 1;
      answer = a - b;
    } else {
      a = Math.floor(Math.random() * 12) + 2;
      b = Math.floor(Math.random() * 12) + 2;
      answer = a * b;
    }

    const equation = `${a} ${op} ${b} = ?`;
    
    const decoys = new Set<string>();
    while(decoys.size < 3) {
      const offset = Math.floor(Math.random() * 10) - 5;
      const decoy = answer + offset;
      if (decoy !== answer && decoy > 0) {
        decoys.add(decoy.toString());
      }
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
export const generateSequence = (count: number = 15) => {
  return Array.from({ length: count }).map(() => {
    const types = ['arithmetic', 'geometric', 'fibonacci'];
    const type = getRandomItem(types);
    const seq: number[] = [];
    let answer = 0;

    if (type === 'arithmetic') {
      const start = Math.floor(Math.random() * 10) + 1;
      const step = Math.floor(Math.random() * 5) + 2;
      for(let i=0; i<4; i++) seq.push(start + (step * i));
      answer = start + (step * 4);
    } else if (type === 'geometric') {
      const start = Math.floor(Math.random() * 3) + 2;
      const mult = Math.floor(Math.random() * 2) + 2;
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
const CATEGORIES = [
  { theme: 'Fruits', items: ['Apple', 'Banana', 'Orange', 'Mango', 'Grape', 'Pear'] },
  { theme: 'Vegetables', items: ['Carrot', 'Broccoli', 'Spinach', 'Potato', 'Onion'] },
  { theme: 'Languages', items: ['Python', 'JavaScript', 'Java', 'C++', 'Ruby', 'Go'] },
  { theme: 'Databases', items: ['PostgreSQL', 'MongoDB', 'Redis', 'MySQL', 'Cassandra'] },
  { theme: 'Cities', items: ['London', 'Tokyo', 'New York', 'Paris', 'Berlin', 'Sydney'] },
  { theme: 'Animals', items: ['Dog', 'Cat', 'Elephant', 'Lion', 'Tiger', 'Bear'] }
];

export const generateOddObject = (count: number = 15) => {
  return Array.from({ length: count }).map(() => {
    const shuffledCats = shuffle(CATEGORIES);
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
  {
    q: "What does HTML stand for?",
    a: "Hyper Text Markup Language",
    decoys: ["Home Tool Markup Language", "Hyperlinks and Text Markup Language", "Hyper Tool Multi Language"]
  },
  {
    q: "Which company created React?",
    a: "Facebook (Meta)",
    decoys: ["Google", "Microsoft", "Twitter"]
  },
  {
    q: "In what year was the first iPhone released?",
    a: "2007",
    decoys: ["2005", "2008", "2010"]
  },
  {
    q: "What is the powerhouse of the cell?",
    a: "Mitochondria",
    decoys: ["Nucleus", "Ribosome", "Endoplasmic Reticulum"]
  },
  {
    q: "Which planet is known as the Red Planet?",
    a: "Mars",
    decoys: ["Venus", "Jupiter", "Saturn"]
  },
  {
    q: "What is the capital of Australia?",
    a: "Canberra",
    decoys: ["Sydney", "Melbourne", "Perth"]
  },
  {
    q: "Which programming language is known as the mother of all languages?",
    a: "C",
    decoys: ["Java", "Assembly", "Python"]
  }
];

export const generateTrivia = (count: number = 15) => {
  const shuffled = shuffle(TRIVIA_BANK);
  return Array.from({ length: count }).map((_, i) => {
    const trivia = i < shuffled.length ? shuffled[i] : getRandomItem(TRIVIA_BANK);
    return {
      correctAnswer: trivia.a,
      content: { question: trivia.q },
      options: shuffle([trivia.a, ...trivia.decoys])
    };
  });
};

// ------------------------------------------
// 7. SUDOKU LITE
// ------------------------------------------
export const generateSudokuLite = (count: number = 15) => {
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
export const generateMemory = (count: number = 15) => {
  return Array.from({ length: count }).map(() => {
    const length = Math.floor(Math.random() * 3) + 5; // 5 to 7 digits
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
