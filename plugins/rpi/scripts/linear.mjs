#!/usr/bin/env node
// RPI stage manager for Linear workflow states.
// Zero dependencies: Node 18+ global fetch and JSON only.
//
// Every mutating command is a dry run unless you pass --apply.
//
//   node linear.mjs list           --team HLSB
//   node linear.mjs ensure         --team HLSB [--file stages.json] [--apply]
//   node linear.mjs rename         --team HLSB --from old --to new [--apply]
//   node linear.mjs update         --team HLSB --name n [--color #RRGGBB] [--description d] [--position 3] [--apply]
//   node linear.mjs archive        --team HLSB --name n [--move-to other] [--apply]
//   node linear.mjs archive-others --team HLSB [--move-to other] [--apply]
//   node linear.mjs destroy        --team HLSB [--move-to other] [--apply]

import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_STAGES = join(HERE, '..', 'stages', 'rpi-defaults.json');
const ENDPOINT = 'https://api.linear.app/graphql';
const VALID_TYPES = ['backlog', 'unstarted', 'started', 'completed', 'canceled'];

// ---------- arg parsing ----------

function parseArgs(argv) {
  const cmd = argv[0];
  const flags = {};
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) flags[key] = true;
    else { flags[key] = next; i++; }
  }
  return { cmd, flags };
}

// ---------- credentials ----------

function resolveKey() {
  if (process.env.LINEAR_API_KEY) return process.env.LINEAR_API_KEY.trim();
  if (process.env.CLAUDE_PLUGIN_OPTION_LINEAR_API_KEY) {
    return process.env.CLAUDE_PLUGIN_OPTION_LINEAR_API_KEY.trim();
  }
  const cfg = join(homedir(), '.config', 'rpi', 'linear.env');
  if (existsSync(cfg)) {
    const m = readFileSync(cfg, 'utf8').match(/^\s*LINEAR_API_KEY\s*=\s*(.+)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  fail(
    'No Linear API key found. Stage changes need one (issue status updates do not).\n' +
    'Provide it in any one of these, in priority order:\n' +
    '  1. LINEAR_API_KEY in the environment\n' +
    '  2. /plugin configure rpi@rvs-plugins   (stored per user, never committed)\n' +
    '  3. ~/.config/rpi/linear.env  containing  LINEAR_API_KEY=lin_api_...\n' +
    'Create a key at Linear > Settings > Security & access > Personal API keys.'
  );
}

// ---------- graphql ----------

async function gql(query, variables = {}) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: resolveKey() },
    body: JSON.stringify({ query, variables }),
  });
  if (res.status === 401 || res.status === 403) {
    fail(`Linear rejected the API key (HTTP ${res.status}). Check the key is valid and not revoked.`);
  }
  const body = await res.json().catch(() => null);
  if (!body) fail(`Linear returned a non-JSON response (HTTP ${res.status}).`);
  if (body.errors?.length) fail('Linear API error: ' + body.errors.map((e) => e.message).join('; '));
  return body.data;
}

// ---------- domain ----------

async function resolveTeam(ref) {
  if (!ref) fail('Missing --team. Pass the team key (e.g. HLSB) or its full name.');
  const data = await gql(
    `query($q:String!){ teams(filter:{ or:[{key:{eqIgnoreCase:$q}},{name:{eqIgnoreCase:$q}}] }, first:2){ nodes{ id key name } } }`,
    { q: ref }
  );
  const nodes = data.teams.nodes;
  if (!nodes.length) fail(`No Linear team matches "${ref}". Use the team key (e.g. HLSB) or its exact name.`);
  if (nodes.length > 1) fail(`"${ref}" matches more than one team: ${nodes.map((n) => n.key).join(', ')}. Use the key.`);
  return nodes[0];
}

async function fetchStates(teamId) {
  const data = await gql(
    `query($t:ID!){ workflowStates(filter:{ team:{ id:{ eq:$t } } }, first:250){ nodes{ id name type color description position } } }`,
    { t: teamId }
  );
  return data.workflowStates.nodes.sort((a, b) => a.position - b.position);
}

// Live (non-archived) issues sitting in the given state ids, grouped by state id.
async function issuesByState(stateIds) {
  if (!stateIds.length) return {};
  const data = await gql(
    `query($ids:[ID!]){ issues(filter:{ state:{ id:{ in:$ids } } }, first:250){ nodes{ identifier state{ id } } } }`,
    { ids: stateIds }
  );
  const out = {};
  for (const n of data.issues.nodes) (out[n.state.id] ||= []).push(n.identifier);
  return out;
}

function loadSpec(file) {
  const path = file && file !== true ? file : DEFAULT_STAGES;
  if (!existsSync(path)) fail(`Stage file not found: ${path}`);
  let parsed;
  try { parsed = JSON.parse(readFileSync(path, 'utf8')); }
  catch (e) { fail(`Stage file is not valid JSON (${path}): ${e.message}`); }
  const stages = Array.isArray(parsed) ? parsed : parsed.stages;
  if (!Array.isArray(stages) || !stages.length) fail(`Stage file has no "stages" array: ${path}`);
  stages.forEach((s, i) => {
    if (!s.name) fail(`Stage #${i + 1} has no name in ${path}`);
    if (!VALID_TYPES.includes(s.type)) {
      fail(`Stage "${s.name}" has invalid type "${s.type}". Valid: ${VALID_TYPES.join(', ')}`);
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(s.color || '')) fail(`Stage "${s.name}" needs a #RRGGBB color.`);
  });
  return { path, stages };
}

const byName = (states) => new Map(states.map((s) => [s.name.toLowerCase(), s]));

// ---------- output ----------

const C = { dim: '\x1b[2m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m', reset: '\x1b[0m' };
const paint = (c, s) => (process.stdout.isTTY ? c + s + C.reset : s);
function fail(msg) { console.error(paint(C.red, 'error: ') + msg); process.exit(1); }
function planLine(verb, detail) {
  const colour = verb === 'create' ? C.green : verb === 'archive' ? C.red : C.yellow;
  console.log('  ' + paint(colour, verb.padEnd(8)) + detail);
}
function footer(applied, changes) {
  if (!changes) { console.log('\n' + paint(C.dim, 'Nothing to do.')); return; }
  console.log(
    applied
      ? '\n' + paint(C.green, `Applied ${changes} change${changes === 1 ? '' : 's'}.`)
      : '\n' + paint(C.cyan, `Dry run: ${changes} change${changes === 1 ? '' : 's'} pending. Re-run with --apply to execute.`)
  );
}

// ---------- mutations ----------

const M = {
  create: `mutation($input:WorkflowStateCreateInput!){ workflowStateCreate(input:$input){ success workflowState{ id name } } }`,
  update: `mutation($id:String!,$input:WorkflowStateUpdateInput!){ workflowStateUpdate(id:$id,input:$input){ success workflowState{ id name } } }`,
  archive: `mutation($id:String!){ workflowStateArchive(id:$id){ success } }`,
  moveIssue: `mutation($id:String!,$state:String!){ issueUpdate(id:$id,input:{stateId:$state}){ success } }`,
};

// Linear refuses to archive a state that still holds live issues.
async function clearState(state, moveTo, occupants, apply) {
  if (!occupants?.length) return 0;
  if (!moveTo) {
    fail(
      `"${state.name}" still holds ${occupants.length} live issue(s): ${occupants.slice(0, 5).join(', ')}` +
      `${occupants.length > 5 ? ', ...' : ''}\n` +
      'Linear only archives states whose issues are all gone. Pass --move-to <state> to relocate them first.'
    );
  }
  planLine('move', `${occupants.length} issue(s) from ${state.name} to ${moveTo.name}`);
  if (apply) for (const id of occupants) await gql(M.moveIssue, { id, state: moveTo.id });
  return occupants.length;
}

// ---------- commands ----------

async function cmdList(flags) {
  const { stages } = loadSpec(flags.file);
  const team = await resolveTeam(flags.team);
  const states = await fetchStates(team.id);
  const have = byName(states);

  console.log(`Team ${paint(C.cyan, team.key)} (${team.name}) has ${states.length} workflow state(s).\n`);
  for (const s of states) {
    console.log(`  ${s.name.padEnd(24)} ${paint(C.dim, s.type.padEnd(10) + s.color)}`);
  }

  const missing = stages.filter((s) => !have.has(s.name.toLowerCase()));
  const mismatched = stages
    .map((s) => ({ spec: s, live: have.get(s.name.toLowerCase()) }))
    .filter((p) => p.live && p.live.type !== p.spec.type);

  console.log(`\nRPI coverage: ${paint(C.cyan, `${stages.length - missing.length}/${stages.length}`)} stages present.`);
  if (missing.length) {
    console.log(paint(C.yellow, '\nMissing:'));
    missing.forEach((s) => console.log(`  ${s.name}  (${s.type})`));
    console.log(paint(C.dim, '\nRun "ensure --apply" to create these.'));
  }
  if (mismatched.length) {
    console.log(paint(C.yellow, '\nType mismatch (informational):'));
    mismatched.forEach((p) => console.log(`  ${p.spec.name}: Linear has "${p.live.type}", defaults expect "${p.spec.type}"`));
    console.log(paint(C.dim, "\nLinear's API cannot change a state's type. Archive and recreate it if the type actually matters."));
  }
  if (!missing.length && !mismatched.length) console.log(paint(C.green, 'All RPI stages present and correctly typed.'));
}

async function cmdEnsure(flags) {
  const apply = !!flags.apply;
  const { stages, path } = loadSpec(flags.file);
  const team = await resolveTeam(flags.team);
  const states = await fetchStates(team.id);
  const have = byName(states);
  let changes = 0;

  console.log(`Ensuring ${stages.length} stage(s) on ${paint(C.cyan, team.key)} from ${paint(C.dim, path)}\n`);

  for (const spec of stages) {
    const live = have.get(spec.name.toLowerCase());
    if (!live) {
      planLine('create', `${spec.name}  (${spec.type}, ${spec.color})`);
      if (apply) await gql(M.create, { input: { ...spec, teamId: team.id } });
      changes++;
      continue;
    }
    const patch = {};
    if (spec.color && live.color?.toLowerCase() !== spec.color.toLowerCase()) patch.color = spec.color;
    if (spec.description && live.description !== spec.description) patch.description = spec.description;
    if (spec.position != null && live.position !== spec.position) patch.position = spec.position;
    if (Object.keys(patch).length) {
      planLine('update', `${spec.name}  (${Object.keys(patch).join(', ')})`);
      if (apply) await gql(M.update, { id: live.id, input: patch });
      changes++;
    }
    if (live.type !== spec.type) {
      console.log('  ' + paint(C.dim, `skip     ${spec.name}: type is "${live.type}", cannot be changed via the API`));
    }
  }
  footer(apply, changes);
}

async function cmdRename(flags) {
  const apply = !!flags.apply;
  const team = await resolveTeam(flags.team);
  const states = await fetchStates(team.id);
  const from = byName(states).get(String(flags.from || '').toLowerCase());
  if (!flags.from || !flags.to) fail('rename needs --from <current name> and --to <new name>.');
  if (!from) fail(`No state named "${flags.from}" on ${team.key}.`);
  if (byName(states).has(String(flags.to).toLowerCase())) fail(`"${flags.to}" already exists on ${team.key}.`);

  console.log(`Renaming on ${paint(C.cyan, team.key)}\n`);
  planLine('rename', `${from.name} -> ${flags.to}   ${paint(C.dim, '(issues keep this state)')}`);
  if (apply) await gql(M.update, { id: from.id, input: { name: String(flags.to) } });
  footer(apply, 1);
}

async function cmdUpdate(flags) {
  const apply = !!flags.apply;
  const team = await resolveTeam(flags.team);
  const states = await fetchStates(team.id);
  const live = byName(states).get(String(flags.name || '').toLowerCase());
  if (!flags.name) fail('update needs --name <state>.');
  if (!live) fail(`No state named "${flags.name}" on ${team.key}.`);

  const patch = {};
  if (flags.color) {
    if (!/^#[0-9a-fA-F]{6}$/.test(flags.color)) fail('--color must be #RRGGBB.');
    patch.color = flags.color;
  }
  if (flags.description) patch.description = String(flags.description);
  if (flags.position) patch.position = Number(flags.position);
  if (flags.type) fail("Linear's API cannot change an existing state's type. Archive and recreate it instead.");
  if (!Object.keys(patch).length) fail('Nothing to update. Pass --color, --description or --position.');

  console.log(`Updating ${paint(C.cyan, live.name)} on ${team.key}\n`);
  planLine('update', `${live.name}  (${Object.keys(patch).join(', ')})`);
  if (apply) await gql(M.update, { id: live.id, input: patch });
  footer(apply, 1);
}

async function archiveSet(flags, pick, label) {
  const apply = !!flags.apply;
  const spec = loadSpec(flags.file).stages;
  const team = await resolveTeam(flags.team);
  const states = await fetchStates(team.id);
  const targets = pick(states, spec);
  if (!targets.length) { console.log(`Nothing matches on ${team.key}.`); return; }

  const moveTo = flags['move-to']
    ? byName(states).get(String(flags['move-to']).toLowerCase()) ||
      fail(`No state named "${flags['move-to']}" to move issues into.`)
    : null;
  if (moveTo && targets.some((t) => t.id === moveTo.id)) fail('--move-to names a state that is itself being archived.');

  const occupants = await issuesByState(targets.map((t) => t.id));
  console.log(`${label} on ${paint(C.cyan, team.key)}\n`);

  let changes = 0;
  for (const t of targets) {
    changes += await clearState(t, moveTo, occupants[t.id], apply);
    planLine('archive', `${t.name}  ${paint(C.dim, `(${(occupants[t.id] || []).length} issue(s) were here)`)}`);
    if (apply) await gql(M.archive, { id: t.id });
    changes++;
  }
  footer(apply, changes);
}

const RPI_NAMES = (stages) => new Set(stages.map((s) => s.name.toLowerCase()));

// ---------- entry ----------

const { cmd, flags } = parseArgs(process.argv.slice(2));
const commands = {
  list: cmdList,
  ensure: cmdEnsure,
  rename: cmdRename,
  update: cmdUpdate,
  archive: (f) =>
    archiveSet(f, (states) => {
      if (!f.name) fail('archive needs --name <state>.');
      const s = byName(states).get(String(f.name).toLowerCase());
      if (!s) fail(`No state named "${f.name}".`);
      return [s];
    }, `Archiving ${f.name}`),
  'archive-others': (f) =>
    archiveSet(f, (states, stages) => {
      const rpi = RPI_NAMES(stages);
      return states.filter((s) => s.type === 'started' && !rpi.has(s.name.toLowerCase()));
    }, 'Archiving non-RPI "started" states'),
  destroy: (f) =>
    archiveSet(f, (states, stages) => {
      const rpi = RPI_NAMES(stages);
      return states.filter((s) => rpi.has(s.name.toLowerCase()));
    }, 'Archiving ALL RPI stages'),
};

if (!cmd || !commands[cmd]) {
  console.error(`Usage: linear.mjs <list|ensure|rename|update|archive|archive-others|destroy> --team <KEY> [--apply]`);
  process.exit(1);
}
commands[cmd](flags).catch((e) => fail(e.message));
