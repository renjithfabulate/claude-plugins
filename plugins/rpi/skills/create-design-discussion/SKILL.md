---
name: create-design-discussion
description: Turn research into design options and user-owned decisions. The RPI design phase. Presents trade-offs and leaves every choice open until the user settles it. Produces a numbered design-discussion artifact.
argument-hint: [TICKET-ID]
disable-model-invocation: true
disallowed-tools: Edit, NotebookEdit
effort: high
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs *), Read, Grep, Glob, Write, Task, AskUserQuestion
---

# Design discussion

Ticket: `$ARGUMENTS`

## 1. Context

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs <TICKET-ID>
```

## 2. Move the Linear issue

Set the issue to `design-in-progress` with the Linear MCP `save_issue` tool.

## 3. Read

- `ticket.md`
- The latest `research` artifact
- Any other task artifact the user names

**Do not read** the research-questions artifact. It was scaffolding for the research and adds
nothing here.

If research left gaps that block a design decision, fill them now with `researcher` subagents rather
than guessing.

## 4. The rule that defines this phase

**You do not make design decisions. You present options and the user chooses.**

For every genuine choice, use `AskUserQuestion` with the real alternatives, and say what each one
costs. Then wait. A decision stays **Open** in the document until the user gives a clear answer.

This is not a formality. The agent writes code faster than anyone can review it, so the only place a
wrong direction gets caught cheaply is here, in a short document, before a large diff exists. An
agent that quietly picks the "obvious" option removes exactly the checkpoint that makes the workflow
worth running.

Two things that are not violations: recommending an option while leaving the choice open, and
deciding something with no product or architectural consequence. If you are unsure which side a
question falls on, ask.

An ambiguous answer is not an answer. "That sounds fine" on a two-option question means ask again.

## 5. Write the artifact

Write `<task dir>/<NN>-design-discussion-<slug>.md`:

```markdown
---
ticket: <TICKET-ID>
kind: design-discussion
slug: <slug>
created: <DD/MM/YYYY>
---

# Design: <ticket title>

## Current state
What exists today, drawn from the research, only the parts this change touches.

## Desired state
What should be true when this is done, in behavioural terms.

## Decisions

### 1. <the choice, as a question>
**Options**
- **A — <name>.** <what it means, what it costs>
- **B — <name>.** <what it means, what it costs>

**Recommendation:** <which, and why, in one line>
**Status:** Decided — B, because <the user's reason> | **Open**

### 2. ...

## Out of scope
What this change explicitly will not do.

## Open questions
Anything still unresolved, and who needs to resolve it.
```

Record the user's reasoning, not just the letter. The next phase reads the reason to judge cases the
decision did not cover.

## 6. Hand off

Set the Linear issue to `design-in-review`.

If any decision is still **Open**, say so explicitly and name them. Do not advance a design with
open decisions and hope the outline resolves them.

Print the artifact path and the next step:

```
/rpi:create-outline <TICKET-ID>
```

Then **stop**. This transition never auto-advances.
