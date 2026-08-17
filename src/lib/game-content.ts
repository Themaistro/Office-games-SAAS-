// ==========================================
// GAME CONTENT & PUZZLE GENERATION LIBRARY
// ==========================================

export const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
export const shuffle = <T>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

type Difficulty = 'easy' | 'medium' | 'hard';

const getSlice = (bank: any[], count: number, dayOfYear: number) => {
  if (!bank || bank.length === 0) return [];
  if (count >= bank.length) return [...bank]; // Prevent repeating the same questions to fill count
  const items = [];
  for(let i=0; i<count; i++) {
    items.push(bank[(dayOfYear * count + i) % bank.length]);
  }
  return items;
};

const TYPING_QUOTES = {
  easy: [
    "Knowledge is power.",
    "Time is money.",
    "Keep it simple.",
    "Less is more.",
    "Stay foolish.",
    "Make it happen.",
    "Dream big today.",
    "Focus on now.",
    "Actions speak louder.",
    "Practice makes perfect.",
    "Think before you act.",
    "Never give up.",
    "Stay hungry and humble.",
    "Work hard in silence.",
    "Be the change.",
    "Trust the process.",
    "Learn from mistakes.",
    "Keep moving forward.",
    "Live and learn.",
    "Aim for the stars.",
    "Fortune favors the bold.",
    "Quality over quantity.",
    "Patience is a virtue.",
    "Stay calm and focus.",
    "Believe in yourself.",
    "One step at a time.",
    "Create your own luck.",
    "Think outside the box.",
    "Rise and grind daily.",
    "Start where you are.",
    "Do what matters most.",
    "Find joy in work.",
    "Embrace every challenge.",
    "Dare to be great.",
    "Fail fast learn faster.",
    "Choose progress daily.",
    "Seek first to understand.",
    "Better late than never.",
    "Short and sweet wins.",
    "Small steps big results.",
    "Every moment matters now.",
    "Ideas change the world.",
    "Teamwork makes the dream.",
    "Respect earns respect.",
    "Courage starts within you.",
    "Kindness costs nothing.",
    "Silence speaks volumes.",
    "Adapt and overcome.",
    "Lead by example always.",
    "Growth requires discomfort."
  ],
  medium: [
    "The only way to do great work is to love what you do.",
    "In the middle of difficulty lies opportunity.",
    "Simplicity is the ultimate sophistication.",
    "Life is what happens when you are busy making other plans.",
    "A journey of a thousand miles begins with a single step.",
    "That which does not kill us makes us stronger.",
    "The best time to plant a tree was twenty years ago.",
    "An investment in knowledge pays the best interest.",
    "The mind is everything. What you think you become.",
    "Strive not to be a success but rather to be of value.",
    "It does not matter how slowly you go as long as you do not stop.",
    "You miss one hundred percent of the shots you never take.",
    "Whether you think you can or you think you cannot you are right.",
    "The only impossible journey is the one you never begin.",
    "Creativity is intelligence having fun with the world around it.",
    "If you want to lift yourself up lift up someone else first.",
    "A person who never made a mistake never tried anything new.",
    "The greatest glory in living lies not in never falling but in rising.",
    "Tell me and I forget. Teach me and I remember. Involve me and I learn.",
    "Do not judge each day by the harvest you reap but by the seeds you plant.",
    "The future belongs to those who believe in the beauty of their dreams.",
    "It is during our darkest moments that we must focus to see the light.",
    "Whoever is happy will make others happy too. It is a chain reaction.",
    "You only live once but if you do it right once is all you need.",
    "In three words I can sum up everything I learned about life. It goes on.",
    "Life is really simple but we insist on making it too complicated.",
    "The purpose of our lives is to be happy and to help others find joy.",
    "Get busy living or get busy dying. The choice is always yours to make.",
    "Many of life's failures are people who did not realize how close they were.",
    "If you look at what you have in life you will always have even more.",
    "If you set your goals ridiculously high and it is a failure you will fail above everyone.",
    "Life is never fair and perhaps it is a good thing for most of us that it is not.",
    "The only person you are destined to become is the person you decide to be.",
    "Go confidently in the direction of your dreams and live the life you imagined.",
    "When you reach the end of your rope tie a knot in it and hang on tight.",
    "Always remember that you are absolutely unique just like everyone else here.",
    "The secret of getting ahead is simply getting started on the right path today.",
    "It is not the years in your life that count but the life in your years.",
    "Everything you have ever wanted is on the other side of fear and doubt.",
    "We cannot solve our problems with the same thinking we used to create them.",
    "Innovation distinguishes between a leader and a follower in every field.",
    "Stay close to anything that makes you glad you are alive and breathing.",
    "The only limit to our realization of tomorrow will be our doubts of today.",
    "What lies behind us and what lies before us are tiny matters compared to what lies within.",
    "Education is the most powerful weapon which you can use to change the entire world.",
    "Happiness is not something ready made. It comes from your own daily actions.",
    "You will face many defeats in life but never let yourself be truly defeated.",
    "The way to get started is to quit talking and begin doing something meaningful.",
    "Not everything that is faced can be changed but nothing can be changed until it is faced.",
    "The greatest weapon against stress is our ability to choose one thought over another."
  ],
  hard: [
    "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    "The pessimist sees difficulty in every opportunity. The optimist sees opportunity in every difficulty.",
    "Do not go where the path may lead, go instead where there is no path and leave a trail.",
    "I have learned that people will forget what you said, people will forget what you did, but people will never forget how you made them feel.",
    "Twenty years from now you will be more disappointed by the things that you did not do than by the ones you did do. So throw off the bowlines and sail away from the safe harbor.",
    "It is not the critic who counts, not the man who points out how the strong man stumbles or where the doer of deeds could have done them better. The credit belongs to the man who is actually in the arena.",
    "If you want to build a ship do not drum up the men to gather wood divide the work and give orders. Instead teach them to yearn for the vast and endless sea.",
    "We are what we repeatedly do. Excellence then is not an act but a habit that we cultivate through consistent practice and dedication every single day.",
    "The only thing we have to fear is fear itself. Nameless unreasoning unjustified terror which paralyzes needed efforts to convert retreat into advance.",
    "In the long run men hit only what they aim at. Therefore though they should fail immediately they had better aim at something high and worthy of their time.",
    "The question is not whether we will be extremists but what kind of extremists we will be. Will we be extremists for hate or for love? Will we be extremists for the preservation of injustice or for the extension of justice?",
    "Darkness cannot drive out darkness; only light can do that. Hate cannot drive out hate; only love can do that. This is the ultimate truth of human existence.",
    "Our deepest fear is not that we are inadequate. Our deepest fear is that we are powerful beyond measure. It is our light not our darkness that most frightens us.",
    "Two roads diverged in a wood and I took the one less traveled by and that has made all the difference in my journey through this incredible life.",
    "The world as we have created it is a process of our thinking. It cannot be changed without changing our thinking first and then taking bold decisive action.",
    "We must be willing to let go of the life we planned so as to have the life that is waiting for us beyond the boundaries of our comfortable daily routine.",
    "A human being is a part of the whole called by us the universe, a part limited in time and space. We experience ourselves our thoughts and feelings as something separate from the rest.",
    "The measure of intelligence is the ability to change. Those who cannot change their minds cannot change anything in the world around them no matter how hard they try.",
    "People often say that motivation does not last. Well neither does bathing. That is why we recommend it daily as a practice for maintaining momentum and drive.",
    "You can never cross the ocean until you have the courage to lose sight of the shore. Every great achievement started with the decision to try something completely new.",
    "The difference between a successful person and others is not a lack of strength not a lack of knowledge but rather a lack of will and the persistence to keep going.",
    "I am not a product of my circumstances. I am a product of my decisions and the actions I take every single day to move closer to the person I want to become.",
    "Your time is limited so do not waste it living someone else's life. Do not be trapped by dogma which is living with the results of other people's thinking.",
    "The greatest discovery of all time is that a person can change their future by merely changing their attitude toward life and the challenges it presents.",
    "If you genuinely want something do not wait for it. Teach yourself to be impatient. The world is not going to give you what you want simply because you deserve it.",
    "We delight in the beauty of the butterfly but rarely admit the changes it has gone through to achieve that beauty. Growth requires transformation and patience.",
    "The best and most beautiful things in the world cannot be seen or even touched. They must be felt with the heart and experienced through genuine human connection.",
    "If you are working on something that you really care about you do not have to be pushed. The vision pulls you forward with an unstoppable force and energy.",
    "It had long since come to my attention that people of accomplishment rarely sat back and let things happen to them. They went out and happened to things instead.",
    "Life is ten percent what happens to you and ninety percent how you react to it. Your attitude determines your altitude in every area of your personal and professional journey.",
    "You cannot swim for new horizons until you have the courage to lose sight of the shore behind you. Adventure begins at the edge of your comfort zone and pushes you further.",
    "The most common way people give up their power is by thinking they do not have any. Every person has the ability to create meaningful change in their life and community.",
    "Everything negative including pressure and challenges is all an opportunity for me to rise. I see adversity as a stepping stone rather than a stumbling block on my path.",
    "Start by doing what is necessary then do what is possible and suddenly you are doing the impossible. Great achievements are built one intentional step at a time.",
    "I can accept failure because everyone fails at something. But I cannot accept not trying because that means I have already given up before the game even started.",
    "Logic will get you from point A to point B. Imagination will take you everywhere else in this vast universe of infinite possibilities waiting to be explored.",
    "Challenges are what make life interesting and overcoming them is what makes life meaningful. Every obstacle you face is an opportunity to grow stronger and wiser.",
    "The best revenge is massive success. Living well and achieving your dreams is the most powerful response to anyone who ever doubted your ability to make it.",
    "I attribute my success to this: I never gave and never took any excuse. I held myself accountable for my actions and results every single day without exception.",
    "What you get by achieving your goals is not as important as what you become by achieving your goals. The journey transforms you more than the destination ever could."
  ]
};

export const generateTypingChallenge = (masterBank: any[], count: number = 5, difficulty: Difficulty = 'medium', dayOfYear: number = 1) => {
  const quotes = shuffle([...(TYPING_QUOTES[difficulty] || TYPING_QUOTES.medium)]);
  const challenges = [];
  
  for (let i = 0; i < count; i++) {
    // Cycle through the shuffled quotes, wrapping around if count > quotes.length
    const quote = quotes[i % quotes.length];
    
    challenges.push({
      correctAnswer: "type-exactly",
      content: { text: quote, language: 'en' },
      options: []
    });
  }
  
  return challenges;
};

export function generateCardMatch(count: number, difficulty: string): any[] {
  // Generate random pairs of emojis for memory matching
  const themes = [
    ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮'],
    ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑'],
    ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚'],
    ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓']
  ];
  
  const results = [];
  for (let i = 0; i < count; i++) {
    // Number of pairs based on difficulty
    let numPairs = 6; // easy = 12 cards
    if (difficulty === 'medium') numPairs = 7; // 14 cards
    if (difficulty === 'hard') numPairs = 8; // 16 cards
    
    const theme = themes[Math.floor(Math.random() * themes.length)];
    const shuffledTheme = [...theme].sort(() => 0.5 - Math.random());
    const selectedEmojis = shuffledTheme.slice(0, numPairs);
    
    // Duplicate and shuffle
    const cards = [...selectedEmojis, ...selectedEmojis]
      .sort(() => 0.5 - Math.random())
      .map((emoji, index) => ({ id: index.toString(), emoji }));
      
    results.push({
      content: { cards },
      options: [],
      correctAnswer: "completed",
      explanation: "Find all matching pairs to win."
    });
  }
  return results;
}

// BugHunt removed

export function generateTargetNumber(count: number, difficulty: string): any[] {
  const results = [];
  for (let i = 0; i < count; i++) {
    // Scale target based on difficulty
    let target = Math.floor(Math.random() * 50) + 20; // 20 to 69 (easy)
    if (difficulty === 'medium') {
      target = Math.floor(Math.random() * 100) + 50; // 50 to 149
    } else if (difficulty === 'hard') {
      target = Math.floor(Math.random() * 300) + 100; // 100 to 399
    }
    
    const createEquation = (t: number) => {
      const ops = ['+', '-', '×'];
      // Limit operators on easy
      if (difficulty === 'easy' && ops.length === 3) ops.pop(); 

      const op = ops[Math.floor(Math.random() * ops.length)];
      if (op === '+') {
        const a = Math.floor(Math.random() * (t - 1)) + 1;
        return `${a} + ${t - a}`;
      } else if (op === '-') {
        const a = Math.floor(Math.random() * (difficulty === 'hard' ? 200 : 50)) + t;
        return `${a} - ${a - t}`;
      } else {
        const factors = [];
        for (let f = 2; f <= Math.sqrt(t); f++) {
          if (t % f === 0) {
            factors.push(f);
            factors.push(t / f);
          }
        }
        if (factors.length > 0) {
          const a = factors[Math.floor(Math.random() * factors.length)];
          return `${a} × ${t / a}`;
        }
        // Fallback if prime
        return `${t - 2} + 2`;
      }
    };
    
    const correctEq = createEquation(target);
    const wrongEqs = new Set<string>();
    while(wrongEqs.size < 3) {
      // Harder difficulties have closer wrong options
      const variance = difficulty === 'hard' ? 4 : 12;
      let wrongTarget = target + (Math.floor(Math.random() * (variance * 2)) - variance);
      if (wrongTarget === target) wrongTarget += 1;
      
      if (wrongTarget > 0) {
        wrongEqs.add(createEquation(wrongTarget));
      }
    }
    
    const options = [correctEq, ...Array.from(wrongEqs)].sort(() => 0.5 - Math.random());
    results.push({
      content: { target },
      options: options,
      correctAnswer: correctEq,
      explanation: `${correctEq} = ${target}`
    });
  }
  return results;
}

export function generateMissingLetters(masterBank: any[], count: number, difficulty: string, offset: number = 0): any[] {
  const slice = getSlice(masterBank, count, offset);
  
  return slice.map((item: any) => {
    let word = item.word.toUpperCase();
    
    // For medium and hard, combine two words
    if (difficulty === 'medium' || difficulty === 'hard') {
      const secondWord = masterBank[Math.floor(Math.random() * masterBank.length)].word.toUpperCase();
      word = `${word} ${secondWord}`;
    }
    
    // Harder difficulty = more missing letters across the two words
    const blanksCount = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 3 : 5;
    
    // Ensure we don't blank out the space character
    let validIndices: number[] = [];
    for (let i = 0; i < word.length; i++) {
      if (word[i] !== ' ') validIndices.push(i);
    }
    
    const actualBlanks = Math.min(blanksCount, validIndices.length - 1);
    const indices = shuffle(validIndices).slice(0, actualBlanks).sort((a,b) => a - b);
    
    let wordWithBlanks = word;
    let missingLetters = [];
    
    for(let i=0; i<indices.length; i++) {
      let idx = indices[i];
      missingLetters.push(word[idx]);
      wordWithBlanks = wordWithBlanks.substring(0, idx) + '_' + wordWithBlanks.substring(idx + 1);
    }
    
    const correctOpt = missingLetters.join(', ');
    const wrongOptions = new Set<string>();
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    
    while(wrongOptions.size < 3) {
      let optLetters = [];
      for(let i=0; i<actualBlanks; i++) {
        optLetters.push(alphabet[Math.floor(Math.random() * alphabet.length)]);
      }
      const opt = optLetters.join(', ');
      
      if (opt !== correctOpt) {
        wrongOptions.add(opt);
      }
    }
    
    const options = [correctOpt, ...Array.from(wrongOptions)].sort(() => 0.5 - Math.random());
    
    return {
      content: { wordWithBlanks },
      options: options,
      correctAnswer: correctOpt,
      explanation: `The full sequence is ${word}`
    };
  });
}

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
  const sliced = getSlice(validBank, count, dayOfYear);
  
  return sliced.map((slice) => {
    const pair = slice.items;
    
    // Randomly assign one to be base and one to be odd
    const isReversed = Math.random() > 0.5;
    const even = isReversed ? pair[1] : pair[0];
    const odd = isReversed ? pair[0] : pair[1];
    
    return {
      correctAnswer: odd,
      content: { odd, even },
      options: []
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
