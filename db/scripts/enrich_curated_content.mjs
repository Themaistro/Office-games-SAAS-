import pg from 'pg';
import { createHash } from 'node:crypto';
const url = new URL(process.env.DATABASE_URL);
if (!['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('This content update is local only.');
const client = new pg.Client({ connectionString: url.toString() });
const key = (text) => { const h = createHash('sha256').update(text).digest('hex').slice(0, 32); return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`; };
const words = {
 easy: 'apple beach bread chair clock cloud dance dream earth field flame fruit grass green happy heart house juice light music night ocean paper party plant river shape smile space spoon stone storm table tiger train water wheel world zebra',
 medium: 'airport blanket builder cabinet captain chapter comfort compass country diamond evening feather festival garden journey kitchen lantern library morning mountain notebook orchard package painter picture rainbow recycle sandwich station thunder traffic village weather window',
 hard: 'adventure attention butterfly celebration community confidence discovery friendship imagination independence ingredient invitation opportunity organisation patience perspective photograph preparation responsibility satisfaction temperature understanding volunteer waterfall'
};
const passages = [
 'The dog slept under the kitchen table.',
 'We left a note beside the empty plate.',
 'A yellow boat crossed the quiet lake.',
 'Please hang your coat near the stairs.',
 'The little shop sells fruit and flowers.',
 'Our bus arrived before the rain began.',
 'He filled the bowl with cool water.',
 'There is a clean towel on the shelf.',
 'The last slice of cake is yours.',
 'We heard a bell across the street.',
 'Keep the spare key in a safe place.',
 'She drew a house with a green roof.',
 'The old clock in the hallway was five minutes slow, so we checked the time on another clock.',
 'We bought enough paper for the workshop and placed a small pile on each table before it began.',
 'The new path through the park makes it easier to reach the library without crossing the busy road.',
 'Please return the borrowed books to the front desk so the next reader can find them on the shelf.',
 'The cafe moved its outdoor tables into the shade as the afternoon sun grew warmer and brighter.',
 'We divided the list into three parts, then checked together that no task had been missed or repeated.',
 'A visitor left a striped umbrella by the door, so we kept it behind the desk until she came back.',
 'The delivery arrived a day early, giving us enough time to unpack the boxes before the event.',
 'She used a ruler to measure the shelf and wrote the numbers down before choosing a storage box.',
 'We followed the signs through the building and found the training room at the end of the corridor.',
 'The tomato plants needed more space, so we moved them into larger pots and gave them fresh soil.',
 'After the rain stopped, the path was still wet, and we took our time walking down the steep hill.',
 'The festival organisers asked local shops to decorate their windows. By Saturday morning, the main street was lined with paper flowers, bright ribbons, and drawings made by children.',
 'We tried the walking route on a quiet morning before recommending it to visitors. There were benches along the path, a drinking fountain near the entrance, and clear signs at each turning.',
 'The presentation worked better after we replaced a long page of notes with a simple diagram. People could follow the main idea and ask questions about the parts they wanted to understand.',
 'A friend taught us a card game at the picnic. We played a practice round with the cards face up, explained each turn, and started again once everyone understood the rules.',
 'The shopkeeper noticed that visitors often asked the same question about opening hours. She placed a clear sign beside the entrance and added a second copy near the payment desk.',
 'We packed the fragile cups in small boxes and filled the spaces with folded paper. Each box had a label describing its contents, which made unpacking much easier at the new office.',
 'The last part of the walk passed through a small orchard. We stayed on the marked path, watched the birds among the branches, and stopped by the gate to check our map.',
 'At the start of the lesson, the teacher asked everyone to describe something they had noticed that morning. The answers included a crowded bus, a new flower, and the smell of fresh bread.',
 'The shared calendar had become difficult to read because several old events were still displayed. We removed the cancelled entries, checked the remaining dates, and added clear names to each meeting.',
 'Our group tested the new instructions with someone who had never seen the task before. When she paused, we asked what was unclear and used her answers to improve the wording.',
 'The playground reopened after the repairs were complete. Families gathered near the entrance while the staff checked the gate, cleared the paths, and put the last few tools away.',
 'We planned enough breaks for the journey and agreed that anyone could ask to stop sooner. That helped everyone feel comfortable and gave us time to enjoy the places along the way.',
 'The blue bus stops near the park.',
 'Put the keys beside the front door.',
 'We saw a small bird on the fence.',
 'The shop opens at nine each morning.',
 'Please bring a pen and a notebook.',
 'Fresh bread was cooling on the table.',
 'Our cat likes the warm spot by the window.',
 'The red kite rose above the tall trees.',
 'Leave your shoes on the mat by the door.',
 'A soft breeze moved the leaves outside.',
 'The children built a small bridge from wooden blocks and tested it with a toy car.',
 'We found a quiet table near the window and ordered soup with fresh bread for lunch.',
 'The parcel arrived this morning, but the delivery note was tucked underneath the box.',
 'Please save your changes before closing the file, then send the final copy to the team.',
 'The walking path follows the river before turning left toward the old railway bridge.',
 'Our neighbour offered to water the plants while we were away visiting family for a week.',
 'Everyone brought a different dish to lunch, and we shared the recipes after the meal.',
 'The wind grew stronger during the afternoon, so we brought the folding chairs inside.',
 'She sketched the room on paper before deciding where to put the desk and reading lamp.',
 'We placed clear labels on the storage boxes so visitors could find supplies without asking.',
 'The first page of the notebook contained a simple list of places to visit during the holiday.',
 'Please read the short summary before the meeting and bring one question you would like to discuss.',
 'A loose screw made the chair wobble, but tightening it carefully solved the problem in a few minutes.',
 'The baker wrote the ingredients on a small card and placed it beside the tray of freshly made biscuits.',
 'We checked the weather before leaving home, packed our raincoats, and chose a shorter route through the woods.',
 'The school concert started with a quiet piano piece. As more instruments joined in, the music filled the hall, and the audience listened closely until the final note.',
 'A neighbour found an old photograph while clearing a cupboard. The picture showed our street before the trees had grown tall, with a small corner shop where the bus stop stands today.',
 'The first version of the plan included more work than we could finish that week. We agreed on the most useful tasks, set the rest aside, and left time to review the results together.',
 'At the repair workshop, volunteers helped visitors mend lamps, bags, and small pieces of furniture. Each repair began with a careful inspection and a conversation about what had stopped working.',
 'When the power returned, we checked that the lights and equipment were working before continuing. The brief interruption gave us time to tidy the table and compare our notes.',
 'The train station was busier than usual that morning. We checked the departure board, found the correct platform, and waited together until the doors opened.',
 'Before starting a new project, agree on the goal and decide who will handle each task. A clear plan gives everyone a useful place to begin and makes progress easier to follow.',
 'The community garden began with a few empty pots and a packet of seeds. By the end of summer, neighbours were sharing fresh herbs, ripe tomatoes, and advice about what to plant next.',
 'When you review a piece of work, begin with what the reader needs to understand. Remove repeated explanations, check the important details, and make the next action easy to find.',
 'We planned a quiet weekend at home, but a friend suggested a walk by the river. The weather stayed mild, and we stopped at a small cafe on the way back.',
 'Learning a new skill takes patience. Short practice sessions can help you notice mistakes, try a different approach, and build confidence without turning every attempt into a test.',
 'At the end of the day, put shared tools back where others can find them. A tidy workspace saves the next person time and makes it easier for everyone to get started.',
 'The museum invited visitors to describe their favourite object in a single sentence. Some chose old photographs, while others wrote about a tiny model ship or a beautifully painted bowl.',
 'A recipe can guide you through an unfamiliar meal, but preparation matters too. Read the instructions, measure the ingredients, and clear enough space before you begin cooking.',
 'When several tasks compete for your attention, write them down and choose one useful step. Finishing a small piece of work can make a larger problem feel easier to manage.',
 'The volunteers arrived early to arrange the tables and welcome the first guests. By lunchtime, the room was full of conversation, shared stories, and people meeting their neighbours.',
 'Our first attempt did not work as expected, so we recorded what happened and changed one thing at a time. That made it easier to understand which adjustment improved the result.',
 'The garden gate is open. Take a walk and enjoy the fresh air.',
 'A warm cup of tea and a good book can make a rainy day feel brighter.',
 'We took the train to the coast and watched the boats return to the harbour.',
 'Please place the clean cups on the shelf beside the kitchen window.',
 'The team wrote down three ideas before choosing which one to try first.',
 'A short walk after lunch can be a pleasant way to reset your attention.',
 'When a task seems confusing, explain it in your own words and ask one clear question.',
 'Our neighbour grows tomatoes in small pots and shares the ripe ones with friends.',
 'The meeting ended early, leaving enough time to review the notes before lunch.',
 'We checked the map, packed our bags, and agreed to meet at the station at nine.',
 'During the workshop, everyone had a chance to suggest a change and explain why it might help.',
 'Before sending the report, check the names, dates, and totals against the original records.',
 'The new library has quiet reading corners, bright study tables, and a shelf for books recommended by visitors.',
 'After comparing the options, the group chose a practical solution that could be tested before the end of the week.',
 'A useful handover explains what has been completed, what still needs attention, and where the next person can find the details.',
 'We arrived at the market just as the stalls opened. Fresh bread, colourful flowers, and baskets of fruit lined the narrow street.',
 'Rather than rush through the instructions, read each step carefully, gather the materials you need, and check your progress as you go.',
 'The afternoon was unexpectedly sunny, so we moved the picnic from the kitchen to the park and invited a few neighbours to join us.'
];
const pairs = [['circle','triangle'],['square','diamond'],['star','heart'],['apple','pear'],['cat','dog'],['book','lamp'],['sun','moon'],['cup','bowl'],['leaf','flower'],['key','lock'],['boat','car'],['fish','bird'],['shoe','sock'],['pen','pencil'],['tree','cactus'],['ball','cube'],['bell','drum'],['hat','crown'],['fork','spoon'],['orange','lemon']];
pairs.push(...[
 ['🐶','🐱'],['🐭','🐹'],['🐻','🐼'],['🦁','🐯'],['🐸','🐢'],['🐝','🦋'],['🐟','🐬'],['🐙','🦀'],['🦉','🦅'],['🐘','🦒'],
 ['🍎','🍐'],['🍊','🍋'],['🍓','🍒'],['🥕','🌽'],['🥦','🥬'],['🍞','🥐'],['🧀','🥚'],['🍕','🍔'],['🍩','🍪'],['🍇','🫐'],
 ['⚽','🏀'],['🎾','⚾'],['🏐','🏉'],['🎲','🎯'],['🎸','🎻'],['🎺','🎷'],['🚗','🚌'],['🚲','🛴'],['🚀','✈️'],['⛵','🚢'],
 ['🔑','🔒'],['💡','🔦'],['📕','📗'],['📘','📙'],['✏️','🖊️'],['📎','✂️'],['⌚','⏰'],['🎩','👑'],['👟','🥾'],['🧤','🧦'],
 ['🌵','🌲'],['🌷','🌻'],['🍀','🍁'],['☀️','🌙'],['⭐','❤️'],['🔴','🔵'],['🟡','🟢'],['🔶','🔷'],['⬛','⬜'],['🔺','🔻']
]);
for (const theme of [
 ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮'],
 ['🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍒','🍑','🥝'],
 ['🚗','🚌','🚲','🛴','🚀','✈️','⛵','🚢','🚂','🚁','🚜','🚑']
]) for (let left=0;left<theme.length;left++) for (let right=left+1;right<theme.length;right++) pairs.push([theme[left],theme[right]]);
words.easy += ' acorn apron baker basket brush candle cheese cherry cloud coast coral daisy dress eagle fairy fence glass grape honey horse lemon lunch mango medal mouse peach pearl piano plate plum queen scarf sheep shell shirt snake socks sound sugar sunny sweet toast tower truck tulip whale wheat';
words.medium += ' animal autumn balcony bicycle biscuit blossom bottle breakfast camera carpet carrot ceiling cushion dolphin drawing elephant envelope factory family farmer flower football freedom gloves hallway holiday hospital island jacket ladder luggage magnet market mirror monkey museum napkin orange pancake parsley penguin pillow pocket popcorn present rabbit ribbon rocket school scissors seaside shadow shoulder squirrel stadium suitcase sweater teapot tennis theatre ticket tomato tractor tunnel turtle umbrella uniform vegetable wallet weekend';
words.hard += ' afternoon ambulance anniversary basketball beautiful blackboard bookshelf chocolate classroom comfortable conversation crocodile decoration dishwasher downstairs earthquake education electricity everything exercise explanation favourite grandmother grandfather greenhouse handwriting helicopter important information interesting lemonade lighthouse magnificent motorcycle newspaper pineapple playground restaurant roundabout strawberry sunflower supermarket toothbrush toothpaste trampoline underground watermelon wonderful yesterday';
await client.connect();
try {
 await client.query('BEGIN');
 for (const [tier,difficulty] of ['easy','medium','hard'].entries()) for(let index=1;index<=25;index++) {
   const start=index+2,add=index%5+1;
   const instruction=tier===0 ? `Start with ${start}. Add ${add}. What number remains?` : tier===1 ? `Start with ${start}. Double it, then add ${add}. What number remains?` : `Start with ${start}. Add ${add}, double the result, then subtract ${start}. What number remains?`;
   const answer=tier===0 ? start+add : tier===1 ? start*2+add : (start+add)*2-start;
   const question=`Follow these instructions: ${instruction}`;
   await client.query('INSERT INTO master_trivia_bank(id,question,answer,decoys,department,difficulty) VALUES($1,$2,$3,$4::jsonb,$5,$6) ON CONFLICT DO NOTHING',[key(`instruction:${difficulty}:${index}`),question,String(answer),JSON.stringify([answer-1,answer+1,answer+3].map(String)),'Engineering',difficulty]);
 }
 for (const [difficulty, text] of Object.entries(words)) for (const word of text.split(' ')) await client.query('INSERT INTO master_word_bank(id,word,difficulty) SELECT $1,$2,$3 WHERE NOT EXISTS(SELECT 1 FROM master_word_bank WHERE lower(word)=lower($2)) ON CONFLICT DO NOTHING', [key(`curated-word:${word}`), word, difficulty]);
 for (const prompt of passages) { const difficulty = prompt.length < 80 ? 'easy' : prompt.length < 125 ? 'medium' : 'hard'; await client.query('INSERT INTO master_typing_bank(id,prompt_text,difficulty) SELECT $1,$2,$3 WHERE NOT EXISTS(SELECT 1 FROM master_typing_bank WHERE prompt_text=$2) ON CONFLICT DO NOTHING', [key(`curated-typing:${prompt}`), prompt, difficulty]); }
 for (const [index, pair] of pairs.entries()) await client.query('INSERT INTO master_odd_object_bank(id,theme,items,difficulty) VALUES($1,$2,$3::jsonb,$4) ON CONFLICT DO NOTHING',[key(`curated-odd:${pair.join(':')}`), `Everyday objects ${index + 1}`, JSON.stringify(pair), ['easy','medium','hard'][index % 3]]);
 await client.query('COMMIT');
 console.table((await client.query("SELECT 'word' AS bank,difficulty,count(*)::int FROM master_word_bank GROUP BY difficulty UNION ALL SELECT 'typing',difficulty,count(*)::int FROM master_typing_bank GROUP BY difficulty UNION ALL SELECT 'odd_object',difficulty,count(*)::int FROM master_odd_object_bank GROUP BY difficulty ORDER BY bank,difficulty")).rows);
} catch (error) { await client.query('ROLLBACK'); throw error; } finally { await client.end(); }
