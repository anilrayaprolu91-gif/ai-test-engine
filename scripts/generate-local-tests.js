const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function parseArgs(argv) {
  const args = argv.slice(2);
  const all = args.includes('--all');
  const help = args.includes('--help') || args.includes('-h');
  const specArg = args.find(arg => arg.startsWith('--spec='));
  const sourceArg = args.find(arg => arg.startsWith('--source='));
  const fromPlans = args.includes('--from-plans');

  return {
    all,
    help,
    specFile: specArg ? specArg.split('=')[1] : null,
    source: fromPlans
      ? 'test-plans'
      : sourceArg
        ? sourceArg.split('=').slice(1).join('=')
        : 'specs',
  };
}

function getLocalSpecFiles(specDir) {
  return fs
    .readdirSync(specDir)
    .filter(file => file.endsWith('.md'))
    .filter(file => file !== 'spec.md');
}

function runConvertForFile(specFile, source) {
  const scriptPath = path.resolve('scripts', 'convertSpec.js');
  const result = spawnSync(process.execPath, [scriptPath, specFile, `--input-dir=${source}`], {
    stdio: 'inherit',
    shell: false,
  });

  return result.status === 0;
}

function main() {
  const { all, help, specFile, source } = parseArgs(process.argv);
  const specDir = path.resolve(source);

  if (help) {
    console.log('Usage: node scripts/generate-local-tests.js --all OR --spec=<file.md> [--source=specs|test-plans]');
    process.exit(0);
  }

  if (!fs.existsSync(specDir)) {
    if (source === 'test-plans') {
      console.log(`Source directory not found: ${specDir}`);
      console.log('Create a planner document first: npm run plan:create -- --brd=BRD-01 --url=https://example.com --goal="..."');
      process.exit(0);
    }

    console.error(`Source directory not found: ${specDir}`);
    process.exit(1);
  }

  let files = [];

  if (specFile) {
    const one = path.resolve(specDir, specFile);
    if (!fs.existsSync(one)) {
      console.error(`Spec file not found: ${one}`);
      process.exit(1);
    }
    files = [specFile];
  } else if (all) {
    files = getLocalSpecFiles(specDir);
  } else {
    console.error('Usage: node scripts/generate-local-tests.js --all OR --spec=<file.md> [--source=specs|test-plans]');
    process.exit(1);
  }

  if (files.length === 0) {
    console.log('No spec files found to process.');
    process.exit(0);
  }

  let failures = 0;
  console.log(`Using source directory: ${specDir}`);
  for (const file of files) {
    console.log(`\nGenerating test for ${file}...`);
    const ok = runConvertForFile(file, source);
    if (!ok) {
      failures += 1;
    }
  }

  if (failures > 0) {
    console.error(`\nGeneration finished with ${failures} failure(s).`);
    process.exit(1);
  }

  console.log(`\nGeneration successful for ${files.length} spec file(s).`);
}

main();
