---
name: iterate-research
description: Correct or extend an existing research artifact after review. Edits it in place. Use when feedback, a missed code path, or changed facts require another look at the current state.
argument-hint: [TICKET-ID] [what to correct]
disable-model-invocation: true
disallowed-tools: NotebookEdit
effort: high
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs *), Read, Grep, Glob, Edit, Task
---

# Revise the research

Arguments: `$ARGUMENTS`

If no ticket identifier was given, **ask for one and stop**. Do not infer it from the branch name,
the directory, or earlier conversation. Guessing wrong means writing artifacts into another ticket's
directory and moving the wrong Linear issue, which is worse than failing outright.

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
say so and point the user at `/rpi:iterate-design-discussion`. Do not absorb a design decision into
a research document.

## 5. Hand off

Print what changed and the next step for the workflow recorded in `ticket.md`:

- RPI: `/rpi:create-design-discussion <TICKET-ID>`
- PRD-Oriented: `/rpi:create-prd <TICKET-ID>`

Then **stop**.
