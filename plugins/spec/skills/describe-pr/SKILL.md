---
name: describe-pr
description: Open or update the branch's pull request. Reads the whole diff against base, checks it against the task artifacts, and writes the PR body. The last command in an RPI task.
argument-hint: [TASK-ID]
disable-model-invocation: true
effort: high
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/artifact-manifest.mjs *), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs *), Bash(git *), Bash(gh *), Read, Grep, Glob, Write, AskUserQuestion
---

# Describe the pull request

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

Note the branch and base branch.

## 1b. Refuse if head and base are the same

If the current branch equals the base branch, **stop**. There is no diff to describe and a pull
request cannot go from a branch into itself.

Say which branch the work is on, and that it needs moving to a working branch before a PR exists.
Do not attempt `gh pr create` to find out.

## 2. Settle outstanding work

```bash
git status --short
```

- **Changes that clearly belong to this task**: commit them.
- **Anything whose ownership is unclear**: ask. Do not sweep an unrelated edit into someone's PR.
- Push the branch, setting upstream if needed.

## 3. Find or create the PR

```bash
gh pr view --json number,url,state,title 2>/dev/null || echo "none"
```

If one exists, update it. If not, create it against the base branch.

**Creating or updating a PR publishes to GitHub, where teammates and CI will see it.** Show the
title and body and get explicit confirmation before the call that creates or edits it.

If you cannot safely tell which PR to update, or which base to target, ask rather than guessing.

## 4. Read the whole diff

```bash
git diff <base>...HEAD --stat
git diff <base>...HEAD
```

The **entire** branch diff, not just the last phase. Reviewers see the whole thing, and a PR body
written from the final commit misses everything before it.

Check the diff against the task artifacts and report honestly:

- Anything in the diff that no artifact asked for
- Anything the artifacts required that is not in the diff
- Anywhere the code and the approved design disagree

State these in your report even when they are awkward. Quietly writing a body that matches the
artifacts rather than the code makes the PR actively misleading.

## 5. Write the body

Write `<task dir>/pr-description.md` and use it as the PR body:

```markdown
## What this does
Two or three sentences of the change in behavioural terms.

## Why
The problem, from the ticket.

## How
The approach, and any decision a reviewer would otherwise ask about.

## Testing
What was run, and what it printed.

## Manual steps
Migrations, env vars, feature flags. "None" if none.

## Artifacts
- [Research](.thoughts/<TASK-ID>/NN-research-<slug>.md)
- [Design](.thoughts/<TASK-ID>/NN-design-discussion-<slug>.md)
- [Outline](.thoughts/<TASK-ID>/NN-structure-outline-<slug>.md)

Closes <TICKET-ID>
```

## 6. Large PRs get a walkthrough

If the diff is **300+ lines across 5+ files**, also write `<task dir>/pr-walkthrough.html`: a
self-contained page ordering the changes so a reviewer can read them in a sensible sequence, with a
line on why each file changed. Link it from the body.

## 7. Sync the artifact list to Linear

Generate the comment body, do not compose it yourself:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/artifact-manifest.mjs <TICKET-ID>
```

Then post it as **one comment, kept current**:

1. `list_comments` on the issue and find the comment whose body contains `<!-- spec:artifacts -->`.
2. If it exists, call `save_comment` with that comment's `id` to replace its body.
3. If not, call `save_comment` with `issueId` to create it.

Never add a new comment per phase. A ticket that accumulates one comment per phase becomes
unreadable, which is the opposite of the point: anyone opening the issue should see the current
artifacts at a glance, not a changelog.

If the comment cannot be posted, say so and carry on. A failed sync must never lose the artifact
you just wrote or block the handoff.

## 8. Finish

Set the Linear issue to `code-review` with the Linear MCP `save_issue` tool.

Print the PR URL and any mismatch you found in step 4. Then **stop**.

Do not merge, and do not enable auto-merge. That is the reviewer's call.
