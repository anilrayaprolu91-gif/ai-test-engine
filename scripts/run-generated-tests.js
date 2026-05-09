const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = process.cwd();
const GENERATED_DIR = path.join(ROOT, 'tests', 'generated');

function findGeneratedSpecs(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...findGeneratedSpecs(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.spec.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

function main() {
  const specs = findGeneratedSpecs(GENERATED_DIR)
    .map(file => path.relative(ROOT, file).split(path.sep).join('/'))
    .sort();

  if (!specs.length) {
    console.log('No generated tests found under tests/generated. Skipping Playwright run.');
    return;
  }

  const passthroughArgs = process.argv.slice(2);
  const args = ['playwright', 'test', ...specs, ...passthroughArgs];
  const result = spawnSync('npx', args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: false,
  });

  process.exit(result.status || 0);
}

if (require.main === module) {
  main();
}

module.exports = {
  findGeneratedSpecs,
};