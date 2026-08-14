// ==========================================
// GAME CONTENT & PUZZLE GENERATION LIBRARY
// ==========================================

export const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
export const shuffle = <T>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

type Difficulty = 'easy' | 'medium' | 'hard';

const getSlice = (bank: any[], count: number, dayOfYear: number) => {
  if (!bank || bank.length === 0) return [];
  const items = [];
  for(let i=0; i<count; i++) {
    items.push(bank[(dayOfYear * count + i) % bank.length]);
  }
  return items;
};

// ------------------------------------------
// 1. TYPING CHALLENGE CONTENT
// ------------------------------------------
export const generateTypingChallenge = (masterBank: any[], count: number = 5, difficulty: Difficulty = 'medium', dayOfYear: number = 1) => {
  const bank = masterBank.filter(b => b.difficulty === difficulty);
  const sliced = getSlice(bank.length > 0 ? bank : masterBank, count, dayOfYear);
  
  return sliced.map((t) => ({
    correctAnswer: "type-exactly",
    content: { text: t.prompt_text },
    options: []
  }));
};

// ------------------------------------------
// 2. WORD UNSCRAMBLE
// ------------------------------------------
export const generateWordUnscramble = (masterBank: any[], count: number = 5, difficulty: Difficulty = 'medium', dayOfYear: number = 1) => {
  const bank = masterBank.filter(b => b.difficulty === difficulty);
  const validBank = bank.length > 0 ? bank : masterBank;
  const sliced = getSlice(validBank, count, dayOfYear);
  
  return sliced.map((w) => {
    const word = w.word;
    let scrambled = word;
    while (scrambled === word && word.length > 1) {
      scrambled = shuffle(word.split('')).join('');
    }
    const decoys = shuffle(masterBank.filter(b => b.word !== word)).slice(0, 3).map(b => b.word);
    
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

    if (op === '-' && b > a) [a, b] = [b, a]; // keep it positive for all difficulties!

    if (op === '+') answer = a + b;
    else if (op === '-') answer = a - b;
    else if (op === '*') answer = a * b;

    const equation = `${a} ${op} ${b} = ?`;
    
    const decoys = new Set<string>();
    let attempts = 0;
    while(decoys.size < 3 && attempts < 100) {
      const offset = Math.floor(Math.random() * 20) - 10;
      const decoy = answer + offset;
      if (decoy !== answer && decoy >= 0) decoys.add(decoy.toString());
      attempts++;
    }
    
    while (decoys.size < 3) {
      decoys.add((answer + Math.floor(Math.random() * 100) + 1).toString());
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
    const logicTypes = ['math', 'letter', 'analogy', 'deductive', 'time'];
    const type = logicTypes[Math.floor(Math.random() * logicTypes.length)];
    
    let answer = "";
    let text = "";
    const decoys = new Set<string>();

    if (type === 'math') {
      const seq: number[] = [];
      let numAnswer = 0;
      if (difficulty === 'easy') {
        const start = Math.floor(Math.random() * 10) + 1;
        const step = Math.floor(Math.random() * 5) + 2;
        for(let i=0; i<4; i++) seq.push(start + (step * i));
        numAnswer = start + (step * 4);
      } else if (difficulty === 'medium') {
        const start = Math.floor(Math.random() * 3) + 2;
        const mult = Math.floor(Math.random() * 3) + 2;
        for(let i=0; i<4; i++) seq.push(start * Math.pow(mult, i));
        numAnswer = start * Math.pow(mult, 4);
      } else {
        let a = Math.floor(Math.random() * 3) + 1;
        let b = Math.floor(Math.random() * 3) + 2;
        seq.push(a, b);
        for(let i=2; i<4; i++) {
          seq.push(seq[i-1] + seq[i-2]);
        }
        numAnswer = seq[3] + seq[2];
      }
      text = `${seq.join(', ')}, ?`;
      answer = numAnswer.toString();
      while(decoys.size < 3) {
        const decoy = numAnswer + Math.floor(Math.random() * 10) - 5;
        if (decoy !== numAnswer && decoy > 0) decoys.add(decoy.toString());
      }
    } else if (type === 'letter') {
      const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const step = difficulty === 'easy' ? 1 : (difficulty === 'medium' ? 2 : 3);
      const startIdx = Math.floor(Math.random() * (26 - (step * 4)));
      const seq = [];
      for(let i=0; i<4; i++) seq.push(alphabet[startIdx + (i * step)]);
      text = `${seq.join(', ')}, ?`;
      answer = alphabet[startIdx + (4 * step)];
      while(decoys.size < 3) {
        const decoy = alphabet[Math.floor(Math.random() * 26)];
        if (decoy !== answer) decoys.add(decoy);
      }
    } else if (type === 'analogy') {
      const analogies = [
        { a: "Ocean", b: "Water", c: "Desert", ans: "Sand", decoys: ["Sun", "Camel", "Heat"] },
        { a: "Bird", b: "Fly", c: "Fish", ans: "Swim", decoys: ["Water", "Gills", "Fins"] },
        { a: "Book", b: "Read", c: "Piano", ans: "Play", decoys: ["Music", "Keys", "Sound"] },
        { a: "Tree", b: "Forest", c: "Star", ans: "Galaxy", decoys: ["Sky", "Night", "Space"] },
        { a: "Fire", b: "Hot", c: "Ice", ans: "Cold", decoys: ["Freeze", "Water", "Snow"] },
        { a: "Clock", b: "Time", c: "Thermometer", ans: "Temperature", decoys: ["Heat", "Fever", "Weather"] },
        { a: "Author", b: "Write", c: "Chef", ans: "Cook", decoys: ["Food", "Eat", "Kitchen"] },
        { a: "Breeze", b: "Tornado", c: "Trickle", ans: "Flood", decoys: ["Water", "Rain", "River"] }
      ];
      const picked = analogies[Math.floor(Math.random() * analogies.length)];
      text = `${picked.a} : ${picked.b} :: ${picked.c} : ?`;
      answer = picked.ans;
      picked.decoys.forEach(d => decoys.add(d));
    } else if (type === 'deductive') {
      const templates = [
        () => {
          const names = shuffle(["Alice", "Bob", "Charlie", "David", "Eve"]).slice(0, 4);
          const [A, B, C, D] = names;
          // Logic: D > A > B > C
          const qType = Math.random();
          const target = qType > 0.66 ? { place: "first", ans: D } : (qType > 0.33 ? { place: "last", ans: C } : { place: "third", ans: B });
          return {
            text: `Four runners finish a race. ${A} finished before ${B}. ${C} finished after ${B}. ${D} finished before ${A}. Who finished in ${target.place} place?`,
            ans: target.ans,
            decoys: names.filter(n => n !== target.ans)
          };
        },
        () => {
          const names = shuffle(["Liam", "Noah", "Emma", "Olivia", "Ava"]).slice(0, 4);
          const [A, B, C, D] = names;
          // Logic: C, B, A, D (Left to Right)
          return {
            text: `Four friends sit in a row from left to right. ${A} is sitting next to ${B}. ${C} is not sitting next to ${A}. ${D} is sitting on the far right. Who is sitting on the far left?`,
            ans: C,
            decoys: [A, B, D]
          };
        },
        () => {
          const nouns = shuffle(["Glibbles", "Flobbles", "Snirks", "Borgles", "Zonks"]);
          const [A, B, C] = nouns;
          // All A are B. No B are C. -> No A are C.
          return {
            text: `All ${A} are ${B}. No ${B} are ${C}. Based on this, which statement MUST be true?`,
            ans: `No ${A} are ${C}.`,
            decoys: [`All ${C} are ${A}.`, `Some ${A} are ${C}.`, `All ${B} are ${A}.`]
          };
        },
        () => {
          const colors = shuffle(["Red", "Blue", "Green", "Yellow"]);
          const [C1, C2, C3, C4] = colors;
          // Logic: Box 1 is C3, Box 2 is C1, Box 3 is C4, Box 4 is C2
          return {
            text: `There are 4 boxes. The ${C1} box is directly to the left of the ${C4} box. The ${C2} box is on the far right. The ${C3} box is not next to the ${C4} box. What color is the far left box?`,
            ans: C3,
            decoys: [C1, C4, C2]
          };
        }
      ];
      
      const selected = templates[Math.floor(Math.random() * templates.length)]();
      text = selected.text;
      answer = selected.ans;
      selected.decoys.forEach(d => decoys.add(d));
    } else if (type === 'time') {
      const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      const currentDayIdx = Math.floor(Math.random() * 7);
      const isPast = Math.random() > 0.5;
      const offset = Math.floor(Math.random() * 4) + 2; // 2 to 5 days
      
      if (isPast) {
        text = `If today is ${days[currentDayIdx]}, what day was ${offset} days ago?`;
        answer = days[(currentDayIdx - offset + 14) % 7];
      } else {
        text = `If today is ${days[currentDayIdx]}, what day is ${offset} days from now?`;
        answer = days[(currentDayIdx + offset) % 7];
      }
      
      while(decoys.size < 3) {
        const d = days[Math.floor(Math.random() * 7)];
        if (d !== answer) decoys.add(d);
      }
    }

    // Ensure we have exactly 3 decoys for a 4-option multiple choice
    while (decoys.size < 3) {
      decoys.add(Math.floor(Math.random() * 100).toString());
    }

    return {
      correctAnswer: answer,
      content: { text },
      options: shuffle([answer, ...Array.from(decoys).slice(0, 3)])
    };
  });
};

// ------------------------------------------
// 5. ODD OBJECT GENERATOR
// ------------------------------------------
export const generateOddObject = (masterBank: any[], count: number = 5, difficulty: Difficulty = 'medium', dayOfYear: number = 1) => {
  const bank = masterBank.filter(b => b.difficulty === difficulty);
  const validBank = bank.length > 0 ? bank : masterBank;
  const sliced = getSlice(validBank, count * 2, dayOfYear); // need 2 themes per question
  
  return Array.from({ length: count }).map((_, i) => {
    const mainCat = sliced[i * 2];
    const oddCat = sliced[i * 2 + 1] || sliced[0];

    const mainItems = shuffle(mainCat.items || []).slice(0, 3);
    const oddItem = shuffle(oddCat.items || [])[0];
    
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
export const generateTrivia = (masterBank: any[], count: number = 20, difficulty: Difficulty = 'medium', dayOfYear: number = 1) => {
  const bank = masterBank.filter(b => b.difficulty === difficulty);
  const validBank = bank.length > 0 ? bank : masterBank;
  const sliced = getSlice(validBank, count, dayOfYear);
  
  return sliced.map((t) => {
    let decoys = t.decoys || [];
    if (typeof decoys === 'string') {
      try { decoys = JSON.parse(decoys); } catch(e) {}
    }

    return {
      correctAnswer: t.answer,
      content: { 
        question: t.question,
        department: t.department 
      },
      options: shuffle([t.answer, ...decoys])
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
// 8. MIXED MEMORY CHALLENGE
// ------------------------------------------
export const generateMemory = (count: number = 5, difficulty: Difficulty = 'medium') => {
  return Array.from({ length: count }).map(() => {
    let length = 5;
    if (difficulty === 'medium') length = 7;
    if (difficulty === 'hard') length = 9;

    const mode = Math.random();
    const numbers = "0123456789";
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const symbols = "!@#$%&*?";
    
    let charSet = numbers;
    if (mode > 0.66) {
      charSet = letters; // Pure Letters
    } else if (mode > 0.33) {
      charSet = numbers + letters + symbols; // Mixed
    }

    let seq = "";
    for (let j = 0; j < length; j++) {
      seq += charSet[Math.floor(Math.random() * charSet.length)];
    }
    return {
      correctAnswer: seq,
      content: { text: seq },
      options: []
    };
  });
};
