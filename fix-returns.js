const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('actions.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src/app');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('return { success: true };')) {
    content = content.replace(/return \{ success: true \};/g, '');
    fs.writeFileSync(file, content);
    console.log('Fixed', file);
  }
});
