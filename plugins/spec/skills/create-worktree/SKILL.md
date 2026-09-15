---
name: create-worktree
description: Create an isolated git worktree for a task, copy the local files it needs and run the configured setup commands. Use when a task should not share the main working directory.
argument-hint: [TASK-ID]
disable-model-invocation: true
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs *), Bash(git *), Bash, Read, AskUserQuestion
---

# Create the task worktree

Ticket: `$ARGUMENTS`

If no task identifier was given, **ask for one and stop**. Do not infer it from the branch name,
the directory, or earlier conversation. Guessing wrong means writing artifacts into another task's
directory and moving the wrong Linear issue, which is worse than failing outright.

The identifier is one of two things:

- a **Linear ticket**, an uppercase key then a hyphen then digits (`ENG-123`)
- a **local task slug** for work with no ticket at all (`fix-login-redirect`)

`task-ctx.mjs` reports which as **task type**. When it says *local task*, **skip every Linear step
in this command**: no status transitions, no comment sync, no `save_issue`. Everything else, the
artifacts, the checkpoints and the handoffs, is identical. A missing ticket is a normal way to work,
not an error.

## 1. Context

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs <TICKET-ID>
```

Read `.spec/config.json` for the `worktree` block. If there is none, offer `/spec:configure-workspace`
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
