---
name: configure-workspace
description: Create or change the per-repo RPI configuration, including the Linear team, artifact directory, base branch and worktree settings. Shows the proposed JSON before writing anything.
argument-hint: [optional instructions]
disable-model-invocation: true
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs *), Bash(git *), Read, Write, Edit, AskUserQuestion
---

# Configure the workspace

Arguments: `$ARGUMENTS`

Writes `.rpi/config.json` **in the current repo**. The plugin itself ships no project-specific
values, which is what lets it be installed anywhere.

## 1. Inspect

```bash
git rev-parse --show-toplevel
git branch --show-current
git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null || echo "no origin/HEAD"
```

Read `.rpi/config.json` if it already exists. Look for the package manager in use (`package.json`,
`bun.lockb`, `pnpm-lock.yaml`, `Makefile`) so the setup command suggestion is real rather than
assumed.

## 2. Settle the values

Ask about anything you cannot determine. Use `AskUserQuestion` where there is a genuine choice.

| Field | Meaning | Default |
|---|---|---|
| `linearTeam` | Team key for status sync, e.g. `ENG` | none, must be set for Linear sync |
| `artifactDir` | Where task artifacts live | `thoughts` |
| `baseBranch` | Branch PRs target | detected from `origin/HEAD` |
| `worktree.enabled` | Whether tasks get their own worktree | `false` |
| `worktree.path` | Where worktrees are created | `../worktrees` |
| `worktree.setupCommands` | Commands run in a fresh worktree | none |
| `worktree.copyFiles` | Gitignored files a fresh worktree needs | none |

`copyFiles` usually means local env files. Name them explicitly rather than globbing broadly: a
wide pattern copies things nobody intended into a new working directory.

## 3. Show before writing

Print the complete proposed JSON and get approval. Then write it.

```json
{
  "linearTeam": "ENG",
  "artifactDir": "thoughts",
  "baseBranch": "main",
  "worktree": {
    "enabled": true,
    "path": "../worktrees",
    "setupCommands": ["npm install"],
    "copyFiles": [".env.local"]
  }
}
```

For an existing config, show a before-and-after diff rather than just the new file, and keep every
setting the user did not ask to change.

## 4. Commit it

`.rpi/config.json` is shared team configuration, so it belongs in the repo. It holds no secrets: the
Linear API key is never stored here.

Suggest committing it, and mention that teammates then get the same behaviour automatically.

## 5. Verify

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs <any-ticket-id>
```

Confirm it reports the team, artifact directory and base branch you just set. Then **stop**.
