const { spawnSync } = require('child_process');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = envFile.split('\n').reduce((acc, line) => {
  const [k, v] = line.split('=');
  if (k && v) acc[k.trim()] = v.trim();
  return acc;
}, {});

const args = ['vercel', '--prod', '--yes'];

for (const [key, value] of Object.entries(envVars)) {
  // Add to build environment
  args.push('-b', `${key}=${value}`);
  // Add to runtime environment
  args.push('-e', `${key}=${value}`);
}

console.log('Running: npx', args.slice(0, 3).join(' '), '...');

const result = spawnSync('npx.cmd', args, { stdio: 'inherit', shell: true });

if (result.error) {
  console.error('Error starting vercel:', result.error);
  process.exit(1);
} else {
  console.log('Vercel process exited with code', result.status);
  process.exit(result.status);
}
