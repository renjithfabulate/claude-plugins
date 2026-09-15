#!/usr/bin/env node
// Builds the body of the single Linear comment that tracks a task's artifacts.
//
// Printing this is deterministic so the model does not have to compose it. The
// comment carries a marker the skills use to find and update it rather than
// posting a new comment for every phase.
//
//   node artifact-manifest.mjs <TICKET-ID> [--repo <path>]

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { execFileSync } from 'node:child_process';

const MARKER = '<!-- spec:artifacts -->';

const KIND_LABELS = {
  'research-questions': 'Research questions',
  research: 'Research',
  'design-discussion': 'Design discussion',
  prd: 'PRD',
  tdd: 'TDD',
  'structure-outline': 'Structure outline',
  plan: 'Detailed plan',
};
const KINDS = Object.keys(KIND_LABELS).sort((a, b) => b.length - a.length);

function git(args, cwd) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch { return null; }
}

function contain(root, ...segs) {
  const base = resolve(root);
  const target = resolve(base, ...segs);
  if (target !== base && !target.startsWith(base + sep)) {
    console.error('error: path escapes the repository'); process.exit(1);
  }
  return target;
}

// git@host:owner/repo.git or https://host/owner/repo(.git) -> https://github.com/owner/repo
// Any host whose name contains "github" is treated as github.com, which covers SSH aliases.
function webUrl(remote) {
  if (!remote) return null;
  const m = remote.match(/^(?:git@|ssh:\/\/git@|https:\/\/)([^/:]+)[:/](.+?)(?:\.git)?$/);
  if (!m) return null;
  const [, host, path] = m;
  if (!/github/i.test(host)) return null;
  return `https://github.com/${path}`;
}

const argv = process.argv.slice(2);
const ticket = argv.find((a) => !a.startsWith('--'));
const repoFlag = argv.indexOf('--repo') === -1 ? null : argv[argv.indexOf('--repo') + 1];
if (!ticket) { console.error('usage: artifact-manifest.mjs <TICKET-ID> [--repo <path>]'); process.exit(1); }
if (/[\\/]/.test(ticket) || ticket.split(/[\\/]/).includes('..')) {
  console.error(`error: "${ticket}" is not a valid ticket id.`); process.exit(1);
}

const root = git(['rev-parse', '--show-toplevel'], repoFlag || process.cwd()) || resolve(repoFlag || process.cwd());

let cfg = { artifactDir: 'thoughts' };
for (const d of ['.spec', '.rpi']) {
  const p = contain(root, d, 'config.json');
  if (!existsSync(p)) continue;
  try { cfg = { ...cfg, ...JSON.parse(readFileSync(p, 'utf8')) }; } catch {}
  break;
}

const taskDir = contain(root, cfg.artifactDir, ticket);
const relDir = taskDir.replace(root + sep, '');
const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], root);
const web = webUrl(git(['remote', 'get-url', 'origin'], root));

// Only link to the web when the current branch actually exists on the remote,
// otherwise every link 404s until someone pushes.
const pushed = !!git(['rev-parse', '--verify', `refs/remotes/origin/${branch}`], root);

const files = existsSync(taskDir)
  ? readdirSync(taskDir)
      .map((f) => {
        const m = f.match(/^(\d{2})-(.+)\.md$/);
        if (!m) return null;
        const kind = KINDS.find((k) => m[2] === k || m[2].startsWith(k + '-'));
        return kind ? { file: f, num: Number(m[1]), kind } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.num - b.num)
  : [];

const lines = [MARKER, '', '**Spec artifacts**', ''];

if (!files.length) {
  lines.push('_No artifacts yet._');
} else {
  for (const f of files) {
    const rel = `${relDir}/${f.file}`;
    const label = KIND_LABELS[f.kind];
    lines.push(pushed && web ? `- ${label}: [\`${f.file}\`](${web}/blob/${branch}/${rel})` : `- ${label}: \`${rel}\``);
  }
}

lines.push('');
if (existsSync(join(taskDir, 'ticket.md'))) lines.push(`Task directory: \`${relDir}/\``);
if (branch) lines.push(`Branch: \`${branch}\`${pushed ? '' : ' (not pushed yet, so paths are local)'}`);
lines.push('');
lines.push('_Maintained by the spec plugin. This comment is updated in place as phases complete._');

console.log(lines.join('\n'));
