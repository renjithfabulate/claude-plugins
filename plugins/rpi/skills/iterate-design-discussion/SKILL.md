---
name: iterate-design-discussion
description: Apply feedback to an existing design discussion and settle its open decisions. Edits in place. Use after review, or to close out decisions the user has now made.
argument-hint: [TICKET-ID] [feedback]
disable-model-invocation: true
disallowed-tools: NotebookEdit
effort: high
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs *), Read, Grep, Glob, Edit, Task, AskUserQuestion
---

# Revise the design discussion

Arguments: `$ARGUMENTS`

If no ticket identifier was given, **ask for one and stop**. Do not infer it from the branch name,
the directory, or earlier conversation. Guessing wrong means writing artifacts into another ticket's
directory and moving the wrong Linear issue, which is worse than failing outright.

## 1. Context

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs <TICKET-ID>
```

Read the latest `design-discussion` artifact, plus any task file the user names.

## 2. Get the feedback

If none was given, ask. A good opening move is to list the decisions still marked **Open** and ask
which the user wants to settle now.

## 3. Verify claims against the code

Feedback often contains an assumption about how the system behaves. Check it before designing around
it. The research artifact is a summary; the live code is the authority.

## 4. Apply it

Edit **in place**, keeping filename and frontmatter.

- A decision moves from **Open** to **Decided** only when the user has actually settled it. Not
  because it now seems obvious, not because only one option survived your own analysis.
- Record the user's reasoning alongside the choice.
- If feedback opens a *new* question, add it as a new decision with **Status: Open** rather than
  resolving it yourself.
- If feedback invalidates a settled decision, reopen it and say so rather than silently rewriting.

## 5. Hand off

Print what changed, and list any decision still **Open**.

If all decisions are settled, print the next step:

```
/rpi:create-outline <TICKET-ID>
```

If any remain open, say which, and do not print a next step. Then **stop**.
