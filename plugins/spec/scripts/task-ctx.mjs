#!/usr/bin/env node
// Task context for RPI skills. Prints where the task lives, which artifacts exist,
// what the next artifact number is, and which artifact currently has authority.
//
// Every /spec:* phase skill injects this instead of guessing at filenames.
//
//   node task-ctx.mjs <TICKET-ID> [--repo <path>] [--json]

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { execFileSync } from 'node:child_process';

// Most specific first: "research-questions" must win over "research".
const KINDS = [
  'research-questions',
  'structure-outline',
  'design-discussion',
  'research',
  'prd',
  'tdd',
  'plan',
];

// Later beats earlier when artifacts disagree.
const PRECEDENCE = ['research', 'design-discussion', 'prd', 'tdd', 'structure-outline', 'plan'];

// A Linear identifier is an uppercase team key, a hyphen, then digits (HLSB-3).
// Anything else is a local task slug and no Linear call is made for it.
const LINEAR_ID = /^[A-Z][A-Z0-9]{0,9}-\d+$/;

const DEFAULTS = { artifactDir: null, linearTeam: null, baseBranch: null, worktree: null };

// '.thoughts' is the default for new repos. A repo that already has a legacy
// 'thoughts' directory keeps using it, so an existing task is never orphaned.
function defaultArtifactDir(root) {
  if (existsSync(join(root, '.thoughts'))) return '.thoughts';
  if (existsSync(join(root, 'thoughts'))) return 'thoughts';
  return '.thoughts';
}

// Keep every derived path inside the repo. The ticket id is user input and artifactDir
// comes from a committed config file, so either could otherwise redirect writes outside
// the repository with ../ segments.
function contain(root, ...segments) {
  const base = resolve(root);
  const target = resolve(base, ...segments);
  if (target !== base && !target.startsWith(base + sep)) {
    console.error(
      `error: refusing a path that escapes the repository.\n` +
      `  repo:    ${base}\n  resolved: ${target}\n` +
      'Check the ticket id and artifactDir in your config for ".." segments.'
    );
    process.exit(1);
  }
  return target;
}

function git(args, cwd) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

function repoRoot(start) {
  return git(['rev-parse', '--show-toplevel'], start) || resolve(start);
}

function detectBaseBranch(root) {
  const head = git(['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'], root);
  if (head) return head.replace(/^origin\//, '');
  for (const b of ['main', 'master', 'develop']) {
    if (git(['rev-parse', '--verify', `refs/heads/${b}`], root)) return b;
  }
  return null;
}

function loadConfig(root) {
  // '.spec' is current; '.rpi' predates the rename and is still read so existing
  // repos keep working without being touched.
  const path = ['.spec', '.rpi']
    .map((d) => contain(root, d, 'config.json'))
    .find((p) => existsSync(p));
  if (!path) return { ...DEFAULTS, _source: null };
  try {
    return { ...DEFAULTS, ...JSON.parse(readFileSync(path, 'utf8')), _source: path };
  } catch (e) {
    console.error(`warning: ignoring malformed ${path}: ${e.message}`);
    return { ...DEFAULTS, _source: null };
  }
}

function classify(filename) {
  const m = filename.match(/^(\d{2})-(.+)\.md$/);
  if (!m) return null;
  const [, num, rest] = m;
  const kind = KINDS.find((k) => rest === k || rest.startsWith(k + '-'));
  return kind ? { file: filename, num: Number(num), kind, slug: rest.slice(kind.length + 1) } : null;
}

function scan(taskDir) {
  if (!existsSync(taskDir)) return [];
  return readdirSync(taskDir)
    .map(classify)
    .filter(Boolean)
    .sort((a, b) => a.num - b.num);
}

// ---------- assemble ----------

const argv = process.argv.slice(2);
const ticket = argv.find((a) => !a.startsWith('--'));
const flag = (name) => {
  const i = argv.indexOf('--' + name);
  return i === -1 ? null : argv[i + 1];
};

if (!ticket) {
  console.error('usage: task-ctx.mjs <TICKET-ID> [--repo <path>] [--json]');
  console.error('No ticket given. Ask the user which ticket; do not infer one from the branch name.');
  process.exit(1);
}

if (ticket.includes('/') || ticket.includes('\\') || ticket.split(/[\\/]/).includes('..') || ticket === '..') {
  console.error(`error: "${ticket}" is not a valid task id. It must not contain path separators or "..".`);
  process.exit(1);
}

const root = repoRoot(flag('repo') || process.cwd());
const cfg = loadConfig(root);
if (!cfg.artifactDir) cfg.artifactDir = defaultArtifactDir(root);
const taskDir = contain(root, cfg.artifactDir, ticket);
const artifacts = scan(taskDir);
const nextNum = String((artifacts.at(-1)?.num ?? 0) + 1).padStart(2, '0');

const latest = {};
for (const k of KINDS) {
  const hits = artifacts.filter((a) => a.kind === k);
  latest[k] = hits.length ? hits.at(-1).file : null;
}
const authoritative = [...PRECEDENCE].reverse().map((k) => latest[k]).find(Boolean) || null;

const ctx = {
  ticket,
  isLinearTicket: LINEAR_ID.test(ticket),
  repoRoot: root,
  branch: git(['rev-parse', '--abbrev-ref', 'HEAD'], root),
  baseBranch: cfg.baseBranch || detectBaseBranch(root),
  linearTeam: cfg.linearTeam,
  configSource: cfg._source,
  artifactDir: cfg.artifactDir,
  worktree: cfg.worktree,
  taskDir,
  taskDirExists: existsSync(taskDir),
  ticketFile: existsSync(join(taskDir, 'ticket.md')) ? join(taskDir, 'ticket.md') : null,
  artifacts: artifacts.map((a) => a.file),
  nextNumber: nextNum,
  latest,
  authoritative,
};

if (argv.includes('--json')) {
  console.log(JSON.stringify(ctx, null, 2));
  process.exit(0);
}

const rel = (p) => (p ? p.replace(root + '/', '') : null);
const row = (k, v) => console.log('  ' + k.padEnd(20) + (v ?? '-'));

console.log(`RPI task context: ${ticket}\n`);
row('repo', root);
row('branch', ctx.branch);
row('base branch', ctx.baseBranch);
row('task type', ctx.isLinearTicket ? 'Linear ticket, status sync ON' : 'local task, no Linear calls');
if (ctx.isLinearTicket) row('linear team', ctx.linearTeam || '(not set, ask the user or pass explicitly)');
row('config', rel(ctx.configSource) || '(none, using defaults)');
row('task dir', rel(taskDir) + (ctx.taskDirExists ? '' : '  (does not exist yet)'));
row('ticket.md', ctx.ticketFile ? 'present' : 'missing');
row('worktree', !ctx.worktree ? 'not configured' : ctx.worktree.enabled ? `enabled -> ${ctx.worktree.path || '../worktrees'}` : 'configured but disabled');

console.log(`\nartifacts (${artifacts.length})`);
if (!artifacts.length) console.log('  (none yet)');
artifacts.forEach((a) => console.log('  ' + a.file));

console.log(`\nnext artifact number: ${nextNum}`);

console.log('\nlatest by kind');
for (const k of KINDS) row(k, latest[k]);

console.log(`\nauthoritative artifact: ${authoritative || '(none, ticket.md governs)'}`);
console.log(
  '\nPrecedence when artifacts disagree (later wins):\n' +
  '  plan > structure-outline > tdd > prd > design-discussion > research > ticket\n' +
  '  Live code always wins for "what currently exists".'
);
