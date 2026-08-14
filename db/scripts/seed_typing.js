const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
});

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envVars['SUPABASE_SERVICE_ROLE_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

const easyPhrases = [
  "A penny for your thoughts.",
  "Actions speak louder than words.",
  "Barking up the wrong tree.",
  "Birds of a feather flock together.",
  "Bite the bullet and do it.",
  "Break the ice with a smile.",
  "Call it a day and rest.",
  "Don't put all your eggs in one basket.",
  "Every cloud has a silver lining.",
  "Good things come to those who wait.",
  "Hit the nail on the head.",
  "Ignorance is bliss sometimes.",
  "It is a piece of cake.",
  "Let the cat out of the bag.",
  "No pain, no gain.",
  "On cloud nine right now.",
  "Once in a blue moon.",
  "Spill the beans about it.",
  "Take it with a grain of salt.",
  "The early bird catches the worm.",
  "The elephant in the room.",
  "There is no time like the present.",
  "Time flies when you are having fun.",
  "Under the weather today.",
  "We see eye to eye.",
  "You can't judge a book by its cover.",
  "A picture is worth a thousand words.",
  "Absence makes the heart grow fonder.",
  "All that glitters is not gold.",
  "An apple a day keeps the doctor away.",
  "Better late than never.",
  "Curiosity killed the cat.",
  "Don't count your chickens before they hatch.",
  "Familiarity breeds contempt.",
  "Fortune favors the bold.",
  "Honesty is the best policy.",
  "Hope for the best, prepare for the worst.",
  "If it ain't broke, don't fix it.",
  "Knowledge is power in this world.",
  "Laughter is the best medicine.",
  "Look before you leap into the unknown.",
  "Make hay while the sun shines.",
  "Necessity is the mother of invention.",
  "Never look a gift horse in the mouth.",
  "Out of sight, out of mind.",
  "Patience is a virtue to hold.",
  "Practice makes perfect in all things.",
  "Rome wasn't built in a day.",
  "Slow and steady wins the race.",
  "Strike while the iron is hot."
];

const mediumPhrases = [
  "The quick brown fox jumps over the lazy dog in the middle of the quiet forest.",
  "Technology is advancing at an unprecedented pace, changing how we interact with the world.",
  "The complexity of the human brain remains one of the greatest mysteries of modern science.",
  "Effective communication is essential for building strong relationships in both personal and professional life.",
  "The transition to renewable energy is crucial for combating climate change and protecting the planet.",
  "Artificial intelligence has the potential to revolutionize industries and improve everyday efficiency.",
  "Understanding different cultures fosters empathy and broadens our perspective on global issues.",
  "Reading regularly can significantly enhance vocabulary and improve cognitive function over time.",
  "The history of ancient civilizations provides valuable insights into human development and society.",
  "Balancing work and personal life is key to maintaining mental and physical well-being.",
  "The exploration of space continues to inspire awe and drive technological innovation.",
  "A healthy diet and regular exercise are fundamental components of a long and active life.",
  "Financial literacy is an important skill that empowers individuals to make informed decisions.",
  "The arts play a vital role in expressing human emotion and documenting cultural history.",
  "Learning a second language can open doors to new opportunities and cultural connections.",
  "The internet has transformed the way we access information and connect with others globally.",
  "Sustainable agricultural practices are necessary to ensure food security for future generations.",
  "The theory of relativity profoundly changed our understanding of space, time, and gravity.",
  "Developing emotional intelligence can lead to better leadership and interpersonal skills.",
  "The preservation of natural habitats is essential for maintaining biodiversity and ecological balance.",
  "Innovation often arises from the intersection of different disciplines and diverse perspectives.",
  "The concept of democracy has evolved significantly since its origins in ancient Greece.",
  "Music has a unique ability to evoke powerful emotions and transcend linguistic barriers.",
  "The industrial revolution marked a major turning point in human history and economic development.",
  "Critical thinking involves objectively analyzing information to form a reasoned judgment.",
  "The global economy is highly interconnected, meaning local events can have widespread impacts.",
  "Mental health awareness is increasing, leading to better support and reduced stigma in society.",
  "The study of philosophy encourages us to question fundamental assumptions about existence.",
  "Volunteering time and resources can have a profound impact on local communities.",
  "The rapid growth of urbanization presents both opportunities and challenges for city planners.",
  "The periodic table elegantly organizes chemical elements based on their atomic structure.",
  "Effective time management allows individuals to achieve their goals while minimizing stress.",
  "The concept of human rights asserts that all individuals are entitled to basic freedoms.",
  "The scientific method provides a systematic approach to investigating phenomena and acquiring knowledge.",
  "The development of vaccines has dramatically reduced the prevalence of many infectious diseases.",
  "Literature allows us to experience different lives and eras through the power of imagination.",
  "The architecture of a city reflects its history, culture, and technological advancements.",
  "The process of photosynthesis is crucial for converting solar energy into chemical energy.",
  "Negotiation is an essential skill for resolving conflicts and reaching mutually beneficial agreements.",
  "The study of genetics has revolutionized our understanding of heredity and biological diversity.",
  "The concept of supply and demand is a fundamental principle of market economics.",
  "The exploration of the deep ocean remains one of the final frontiers on Earth.",
  "The Renaissance was a period of significant cultural, artistic, and scientific awakening.",
  "The development of the printing press fundamentally changed the dissemination of information.",
  "The study of psychology helps us understand the complexities of human behavior and thought.",
  "The concept of sustainable development seeks to meet current needs without compromising the future.",
  "The universe is vast, and our understanding of it continues to expand with new discoveries.",
  "The importance of early childhood education in shaping future success cannot be overstated.",
  "The principles of physics govern the behavior of matter and energy in the universe.",
  "The concept of justice is central to functioning legal systems and societal harmony."
];

const hardPhrases = [
  "In the kaleidoscopic realm of quantum mechanics, particles can exist in a superposition of states, defying classical intuition and challenging our fundamental understanding of reality's underlying fabric.",
  "The symbiotic relationship between mycorrhizal fungi and the root systems of most terrestrial plants constitutes a subterranean network crucial for nutrient exchange and ecological resilience.",
  "The Byzantine Empire's intricate bureaucracy, coupled with its strategic position bridging Europe and Asia, allowed it to endure for a millennium after the fall of the Western Roman Empire.",
  "Neuroplasticity, the brain's remarkable ability to reorganize itself by forming new neural connections throughout life, underscores the dynamic nature of human cognition and learning.",
  "The intricate dance of celestial mechanics, governed by gravitational perturbations and orbital resonances, dictates the long-term stability of planetary systems across the cosmos.",
  "The philosophical treatise delved into the epistemological implications of artificial consciousness, questioning the very criteria by which we ascribe sentience and moral agency.",
  "The implementation of cryptographic protocols based on elliptic curve cryptography offers robust security with significantly shorter key lengths compared to traditional RSA algorithms.",
  "The socio-economic ramifications of hyperinflation often precipitate a rapid devaluation of currency, leading to systemic instability and the erosion of purchasing power.",
  "The intricate linguistic structure of polysynthetic languages allows for the expression of complex ideas within a single, highly agglutinative word, confounding speakers of analytical languages.",
  "The phenomenon of sonoluminescence, where sound waves in a liquid cause the implosion of a bubble leading to the emission of brief flashes of light, remains a subject of intense scientific scrutiny.",
  "The architectural marvels of the Gothic era, characterized by flying buttresses and ribbed vaults, represented a paradigm shift in structural engineering and aesthetic aspiration.",
  "The intricate cascade of biochemical reactions involved in cellular respiration is essential for synthesizing ATP, the universal energy currency of biological organisms.",
  "The geopolitical landscape of the 21st century is increasingly defined by the asymmetric capabilities of non-state actors and the proliferation of cyber warfare tactics.",
  "The synthesis of novel nanomaterials with tailored optoelectronic properties holds immense promise for the development of next-generation photovoltaic devices and quantum computing architecture.",
  "The labyrinthine plot of the postmodern novel deconstructed narrative conventions, employing metafictional techniques to blur the boundaries between author, reader, and text.",
  "The intricacies of macro-prudential regulation are designed to mitigate systemic risk within the financial sector, preventing the contagion effects of localized defaults.",
  "The phenomenon of quantum entanglement, where the quantum states of two or more objects are linked regardless of distance, was famously described by Einstein as 'spooky action at a distance'.",
  "The meticulously crafted legislation aimed to address the intersectional disparities inherent in the socio-legal framework, promoting equity across marginalized demographics.",
  "The intricate interplay of tectonic plates, driven by mantle convection, is responsible for the continual reshaping of the Earth's lithosphere through orogeny and subduction.",
  "The symphony's structural complexity, characterized by its innovative use of chromaticism and expansive thematic development, marked a definitive transition into the Romantic era of music.",
  "The rigorous methodologies of epidemiological surveillance are paramount in tracking the pathogenesis and transmission dynamics of emerging zoonotic diseases.",
  "The algorithm utilized a sophisticated heuristic approach, incorporating simulated annealing to navigate the complex, multidimensional search space and avoid local optima.",
  "The profound implications of the Heisenberg uncertainty principle establish a fundamental limit to the precision with which complementary variables can be simultaneously known.",
  "The intricate tapestry of medieval feudalism was woven from a complex system of reciprocal obligations, land tenure, and hierarchical allegiance.",
  "The utilization of CRISPR-Cas9 technology has revolutionized the field of genomic editing, allowing for precise, targeted modifications of DNA sequences with unprecedented efficiency.",
  "The esoteric poetry of the movement relied heavily on symbolism and stream-of-consciousness techniques, creating a dense, evocative landscape of fragmented imagery.",
  "The formulation of a Grand Unified Theory, seeking to integrate the strong, weak, and electromagnetic interactions, remains a central objective of contemporary theoretical physics.",
  "The intricate mechanisms of epigenetic inheritance demonstrate how environmental factors can induce heritable changes in gene expression without altering the underlying DNA sequence.",
  "The socio-linguistic analysis highlighted the nuanced ways in which code-switching is employed as a strategy for navigating complex, multilingual social environments.",
  "The rigorous validation of the computational fluid dynamics model required extensive comparison with empirical data gathered from wind tunnel experiments.",
  "The intricate choreography of the ballet demanded exceptional athletic prowess and precise synchronization, seamlessly blending classical technique with contemporary expression.",
  "The complexities of international maritime law govern the jurisdiction, navigation, and exploitation of resources across the world's oceans.",
  "The phenomenon of neurogenesis in the adult hippocampus challenges the long-held dogma that the mature mammalian brain is incapable of generating new neurons.",
  "The intricate design of the microprocessor architecture optimized instruction pipelining and cache hierarchy, significantly enhancing overall computational throughput.",
  "The philosophical discourse surrounding existentialism emphasizes individual freedom, responsibility, and the subjective nature of meaning in an arguably absurd universe.",
  "The meticulous restoration of the ancient frescoes required a deep understanding of historical pigments, binding mediums, and conservation chemistry.",
  "The intricate dynamics of atmospheric circulation, driven by solar radiation and the Coriolis effect, dictate the global distribution of climate zones and weather patterns.",
  "The sophisticated econometric model accounted for endogeneity and heteroskedasticity, providing robust estimates of the causal impact of the policy intervention.",
  "The intricate anatomical structure of the inner ear, including the cochlea and vestibular system, is essential for the transduction of sound waves and the maintenance of equilibrium.",
  "The rigorous axiomatic foundations of set theory provide the logical scaffolding upon which the vast edifice of modern mathematics is constructed.",
  "The intricate socio-political maneuvering preceding the treaty negotiations involved a delicate balance of diplomacy, coercion, and strategic concessions.",
  "The phenomenon of supraconductivity, characterized by the complete absence of electrical resistance at cryogenic temperatures, has profound implications for power transmission and magnetic levitation.",
  "The intricate narrative structure of the epic poem interwove mythic allegory, historical chronicle, and theological discourse into a comprehensive worldview.",
  "The sophisticated algorithms employed in natural language processing strive to bridge the gap between human communication and machine understanding.",
  "The intricate mechanisms of the immune system involve a coordinated response of innate and adaptive components to identify and neutralize pathogenic invaders.",
  "The philosophical inquiry into the nature of time explores the dichotomy between the subjective experience of duration and the objective measurement of temporal intervals.",
  "The intricate details of the metabolic pathways involved in the biosynthesis of secondary metabolites reveal the astonishing chemical versatility of plants.",
  "The rigorous empirical analysis debunked the prevailing economic orthodoxy, demonstrating that the market was subject to persistent irrational exuberance and speculative bubbles.",
  "The intricate orchestration of the symphony required the conductor to balance the disparate timbres and dynamics of the various instrumental sections.",
  "The sophisticated techniques of forensic anthropology are instrumental in establishing the biological profile and determining the circumstances of death from skeletal remains."
];

async function seed() {
  console.log("Seeding Typing Challenge Bank...");
  const records = [];
  
  easyPhrases.forEach(text => {
    records.push({ prompt_text: text, difficulty: 'easy' });
  });
  
  mediumPhrases.forEach(text => {
    records.push({ prompt_text: text, difficulty: 'medium' });
  });
  
  hardPhrases.forEach(text => {
    records.push({ prompt_text: text, difficulty: 'hard' });
  });

  const { error } = await supabase.from('master_typing_bank').insert(records);
  if (error) {
    console.error("Error inserting phrases:", error);
  } else {
    console.log(`Successfully inserted ${records.length} phrases!`);
  }
}

seed();
