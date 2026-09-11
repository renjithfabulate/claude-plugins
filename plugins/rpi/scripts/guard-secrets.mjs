#!/usr/bin/env node
// PreToolUse guard: refuse to write a file containing what looks like a live credential.
//
// Reads the hook payload on stdin. Exit 2 blocks the tool call and shows stderr
// to the model; exit 0 allows it.
//
// Patterns deliberately match credential-SHAPED values, not bare prefixes, so that
// documentation naming a prefix (as this plugin's own skills do) is not blocked.

const PATTERNS = [
  [/\blin_api_[A-Za-z0-9]{20,}/, 'Linear API key'],
  [/\bgithub_pat_[A-Za-z0-9_]{30,}/, 'GitHub fine-grained token'],
  [/\bghp_[A-Za-z0-9]{30,}/, 'GitHub personal access token'],
  [/\bsk-[A-Za-z0-9-_]{30,}/, 'OpenAI-style secret key'],
  [/\bsk-ant-[A-Za-z0-9-_]{30,}/, 'Anthropic API key'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'AWS access key id'],
  [/-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/, 'private key block'],
  [/\b[a-z][a-z0-9+.-]*:\/\/[^\s:@/]+:[^\s:@/]{8,}@/, 'connection string with an inline password'],
];

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  let payload;
  try { payload = JSON.parse(raw); } catch { process.exit(0); } // never block on a payload we cannot read

  const input = payload?.tool_input ?? {};
  const target = input.file_path || input.notebook_path || '(unknown file)';
  const text = [input.content, input.new_string, input.new_source].filter((v) => typeof v === 'string').join('\n');
  if (!text) process.exit(0);

  for (const [re, label] of PATTERNS) {
    const hit = text.match(re);
    if (!hit) continue;
    const shown = hit[0].slice(0, 12) + '...';
    console.error(
      `Blocked: this write to ${target} contains what looks like a ${label} (${shown}).\n\n` +
      'Credentials must not be committed. A secret that reaches git history survives being deleted.\n' +
      'Use the plugin userConfig prompt, an environment variable, or ~/.config/rpi/linear.env instead.\n' +
      'If this is a placeholder or test fixture, make it obviously fake and try again.'
    );
    process.exit(2);
  }
  process.exit(0);
});
