---
name: create-worktree
description: Create an isolated git worktree for a task, copy the local files it needs and run the configured setup commands. Use when a task should not share the main working directory.
argument-hint: [TICKET-ID]
disable-model-invocation: true
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs *), Bash(git *), Bash, Read, AskUserQuestion
---

# Create the task worktree

Ticket: `$ARGUMENTS`

If no ticket identifier was given, **ask for one and stop**. Do not infer it from the branch name,
the directory, or earlier conversation. Guessing wrong means writing artifacts into another ticket's
directory and moving the wrong Linear issue, which is worse than failing outright.

## 1. Context

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs <TICKET-ID>
```

Read `.rpi/config.json` for the `worktree` block. If there is none, offer `/rpi:configure-workspace`
and stop.

## 2. Check before creating

```bash
git worktree list
```

If a worktree for this ticket already exists, say where it is and stop. Do not create a second one
unless the user explicitly asks: two worktrees on one task is how half the work ends up in the
wrong place.

Confirm the working tree is clean enough that nothing uncommitted is stranded behind.

## 3. Create it

```bash
git fetch origin
git worktree add -b <ticket-id>-<slug> <worktree.path>/<ticket-id> origin/<baseBranch>
```

Branch from the **remote** base branch, not from whatever is checked out locally, so the task starts
from the shared state rather than from local drift.

## 4. Copy local files

Copy each entry in `worktree.copyFiles` from the main working directory. These are gitignored by
design, so the new worktree does not get them from git.

Report each file copied. If one is missing, say so and continue: a missing `.env.local` is worth
knowing about before the setup command fails confusingly.

## 5. Run setup

Run each command in `worktree.setupCommands`, in order, inside the new worktree.

**A setup failure blocks completion.** Report the full error and stop. Do not describe the worktree
as ready when its dependencies did not install: the next phase will fail in a much more confusing
place.

## 6. Report

Print the worktree path, the branch, files copied and setup results. Tell the user to change into
that directory before continuing, and name the next command for their workflow.

Then **stop**.
