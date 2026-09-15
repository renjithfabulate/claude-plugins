#!/usr/bin/env node
// Inventory what this machine can actually do: which skills are installed, and which
// MCP servers are connected. /spec:check-capabilities compares this against what a
// task needs, so the gap is computed from reality rather than assumed.
//
//   node capabilities.mjs [--repo <path>] [--json] [--no-mcp]

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { execFileSync } from 'node:child_process';

const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf('--' + n); return i === -1 ? null : argv[i + 1]; };
const repo = flag('repo') || process.cwd();

// ---------- skills ----------

function frontmatter(file) {
  try {
    const m = readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---/);
    if (!m) return {};
    const out = {};
    for (const line of m[1].split('\n')) {
      const kv = line.match(/^([A-Za-z_-]+):\s*(.*)$/);
      if (kv) out[kv[1]] = kv[2].replace(/^["']|["']$/g, '');
    }
    return out;
  } catch { return {}; }
}

function scanSkillDir(dir, source) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    const f = join(dir, name, 'SKILL.md');
    if (!existsSync(f)) continue;
    const fm = frontmatter(f);
    out.push({ name: fm.name || name, source, path: f, description: fm.description || '' });
  }
  return out;
}

function pluginSkillDirs() {
  const cache = join(homedir(), '.claude', 'plugins', 'cache');
  if (!existsSync(cache)) return [];
  const dirs = [];
  for (const mkt of readdirSync(cache)) {
    const mktDir = join(cache, mkt);
    for (const plugin of readdirSync(mktDir)) {
      for (const version of readdirSync(join(mktDir, plugin))) {
        const d = join(mktDir, plugin, version, 'skills');
        if (existsSync(d)) dirs.push([d, `plugin:${plugin}`]);
      }
    }
  }
  return dirs;
}

const skills = [
  ...scanSkillDir(join(repo, '.claude', 'skills'), 'project'),
  ...scanSkillDir(join(homedir(), '.claude', 'skills'), 'user'),
  ...pluginSkillDirs().flatMap(([d, src]) => scanSkillDir(d, src)),
];

// ---------- mcp ----------

function mcpServers() {
  if (argv.includes('--no-mcp')) return null;
  let raw;
  try {
    raw = execFileSync('claude', ['mcp', 'list'], { encoding: 'utf8', timeout: 60000, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (e) {
    return (e.stdout || '').trim() ? parseMcp(e.stdout) : [];
  }
  return parseMcp(raw);
}

function parseMcp(raw) {
  const out = [];
  for (const line of raw.split('\n')) {
    // "<name>: <url> - <status>"
    const m = line.match(/^(.+?):\s+(\S+)\s+-\s+(.+)$/);
    if (!m) continue;
    const [, name, url, statusRaw] = m;
    const status = /✔|Connected/i.test(statusRaw) ? 'connected'
      : /Needs authentication/i.test(statusRaw) ? 'needs_auth'
      : 'failed';
    out.push({ name: name.trim(), url, status });
  }
  return out;
}

const mcp = mcpServers();

// ---------- output ----------

if (argv.includes('--json')) {
  console.log(JSON.stringify({ skills, mcp }, null, 2));
  process.exit(0);
}

console.log(`Installed skills (${skills.length})\n`);
const bySource = {};
for (const s of skills) (bySource[s.source] ||= []).push(s);
for (const [src, list] of Object.entries(bySource)) {
  console.log(`  ${src} (${list.length})`);
  for (const s of list) console.log(`    ${s.name}`);
  console.log('');
}

if (mcp === null) { console.log('MCP servers: not checked (--no-mcp)'); process.exit(0); }

const connected = mcp.filter((m) => m.status === 'connected');
const needsAuth = mcp.filter((m) => m.status === 'needs_auth');
const failed = mcp.filter((m) => m.status === 'failed');

console.log(`MCP servers (${mcp.length})\n`);
console.log(`  connected (${connected.length})`);
connected.forEach((m) => console.log(`    ${m.name}`));
if (needsAuth.length) {
  console.log(`\n  needs authentication (${needsAuth.length}) - usable only after the user runs /mcp`);
  needsAuth.forEach((m) => console.log(`    ${m.name}`));
}
if (failed.length) {
  console.log(`\n  failed (${failed.length})`);
  failed.forEach((m) => console.log(`    ${m.name}`));
}
