// The one verification command: `pnpm check`.
// A passing step prints nothing. A failing step prints its last lines only.
// `--hook` is for an agent stop hook: it skips a clean tree and a plan-mode session, and exits 2 on failure.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { acquire, lockPath } from './check-lock.mjs';
import { hookSkips } from './hook-skip.mjs';

const MAX_LINES = 60;
const root = fileURLToPath(new URL('..', import.meta.url));
const hook = process.argv.includes('--hook');

const env = {
  ...process.env,
  PATH: join(root, 'node_modules', '.bin') + delimiter + process.env.PATH,
  NO_COLOR: '1',
};

function run(command) {
  const result = spawnSync(command, { cwd: root, env, shell: true, encoding: 'utf8' });
  return { ok: result.status === 0, output: `${result.stdout ?? ''}${result.stderr ?? ''}` };
}

if (hook) {
  const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
  const treeIsClean = run('git status --porcelain').output.trim() === '';
  if (hookSkips(input, treeIsClean)) process.exit(0);
}

// The Stop hook has a 300 s timeout, so a hook run waits 180 s at most and blocks (exit 2) on a timeout.
let release;
try {
  release = await acquire(lockPath(root), {
    timeoutMs: hook ? 180_000 : 25 * 60 * 1000,
    onWait: (pid) => console.error(`Waiting for another pnpm check in this checkout (pid ${pid})`),
  });
} catch (error) {
  console.error(`check: ${error.message}. Run pnpm check again when that run ends.`);
  process.exit(hook ? 2 : 1);
}
process.on('exit', release);
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(signal, () => process.exit(130));

const steps = [
  ['tests', 'vitest run --reporter=dot'],
  ['types', 'tsc --noEmit'],
];

const failures = [];

// Every session reads this file, so it stays short.
for (const [file, limit] of [['AGENTS.md', 100]]) {
  if (!existsSync(join(root, file))) continue;
  const lines = readFileSync(join(root, file), 'utf8').trimEnd().split('\n').length;
  if (lines > limit) {
    failures.push(
      `FAIL size: ${file} has ${lines} lines and the limit is ${limit}\n` +
        'Fix: keep what the next session needs. Move the rest into code, a test, or a commit message.',
    );
  }
}

for (const [name, command] of steps) {
  const { ok, output } = run(command);
  if (ok) continue;
  const lines = output.trimEnd().split(/\r?\n/);
  const cut = lines.length > MAX_LINES ? [`... ${lines.length - MAX_LINES} earlier lines cut`] : [];
  failures.push([`FAIL ${name}: ${command}`, ...cut, ...lines.slice(-MAX_LINES)].join('\n'));
}

if (failures.length === 0) {
  if (!hook) console.log(`check ok: ${steps.map(([name]) => name).join(', ')}`);
  release();
  process.exit(0);
}

console.error(failures.join('\n\n'));
release();
process.exit(hook ? 2 : 1);
