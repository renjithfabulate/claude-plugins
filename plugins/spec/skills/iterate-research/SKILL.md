---
name: iterate-research
description: Correct or extend an existing research artifact after review. Edits it in place. Use when feedback, a missed code path, or changed facts require another look at the current state.
argument-hint: [TASK-ID] [what to correct]
disable-model-invocation: true
disallowed-tools: NotebookEdit
effort: high
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/artifact-manifest.mjs *), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs *), Read, Grep, Glob, Edit, Task
---

# Revise the research

Arguments: `$ARGUMENTS`

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

Read the latest `research` artifact it reports.

**Do not read** the research-questions artifact, `ticket.md`, or any other artifact unless the user
names it. You are correcting this document against the code, not re-deriving it.

## 2. Get the feedback

If the user did not say what is wrong, ask.

## 3. Verify before you edit

Check every factual claim in the feedback against the actual code. Two things can be true: the user
may be right, or the user may be misremembering. Either way the artifact must end up matching
reality, and the code is the authority on what currently exists.

For anything broad, dispatch `researcher` subagents the same way `create-research` does.

## 4. Apply it

Edit **in place**, keeping the filename and frontmatter.

- Fold new facts into the existing sections rather than appending a "corrections" section. The
  document should read as though it were right the first time.
- Keep no edit log. Git already has the history.
- Every new claim carries a `path/to/file.ts:42` citation, same as the original.
- Move anything still undetermined to **Open questions** rather than softening it into a vague
  statement.

**The rule still holds: facts only, no design.** If the correction is really a design preference,
say so and point the user at `/spec:iterate-design-discussion`. Do not absorb a design decision into
a research document.

## 5. Sync the artifact list to Linear

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

## 6. Hand off

Print what changed and the next step for the workflow recorded in `ticket.md`:

- RPI: `/spec:create-design-discussion <TICKET-ID>`
- PRD-Oriented: `/spec:create-prd <TICKET-ID>`

Then **stop**.
