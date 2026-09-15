---
name: create-design-discussion
description: Turn research into design options and user-owned decisions. The RPI design phase. Presents trade-offs and leaves every choice open until the user settles it. Produces a numbered design-discussion artifact.
argument-hint: [TASK-ID]
disable-model-invocation: true
disallowed-tools: Edit, NotebookEdit
effort: high
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/artifact-manifest.mjs *), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs *), Read, Grep, Glob, Write, Task, AskUserQuestion
---

# Design discussion

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

## 4b. Draw the difference

Before writing, ask whether a picture would settle anything. Read ${CLAUDE_PLUGIN_ROOT}/references/diagrams.md for
when a diagram earns its place and which type fits which question.

In a design discussion exactly two diagrams usually pay for themselves:

- **Current state against desired state**, so the change is visible rather than described.
- **The difference between the options**, for whichever decision the reader will find hardest.

Draw the **delta**, not two unrelated pictures. Two labelled boxes side by side, one per option, is a
restated option list: show the one edge each option adds or removes, so the reader can point at what
they are choosing between.

Use a ```mermaid fence inline in the artifact, never a separate file. It renders in GitHub review
where the reader actually is, diffs as text, and cannot drift from the prose beside it.

If a sentence says it faster, write the sentence. A diagram that restates the headings is upkeep with
no reader.

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

```mermaid
%% only if it shows a mechanism the prose cannot
```

## Desired state
What should be true when this is done, in behavioural terms.

## Decisions

### 1. <the choice, as a question>
**Options**
- **A. <name>:** <what it means, what it costs>
- **B. <name>:** <what it means, what it costs>

```mermaid
%% the difference between the options, where the choice is hard
```

**Recommendation:** <which, and why, in one line>
**Status:** Decided, B, because <the user's reason> | **Open**

### 2. ...

## Out of scope
What this change explicitly will not do.

## Open questions
Anything still unresolved, and who needs to resolve it.
```

Record the user's reasoning, not just the letter. The next phase reads the reason to judge cases the
decision did not cover.

## 6. Sync the artifact list to Linear

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

## 7. Hand off

Set the Linear issue to `design-in-review`.

If any decision is still **Open**, say so explicitly and name them. Do not advance a design with
open decisions and hope the outline resolves them.

Print the artifact path and the next step:

```
/spec:create-outline <TICKET-ID>
```

Then **stop**. This transition never auto-advances.
