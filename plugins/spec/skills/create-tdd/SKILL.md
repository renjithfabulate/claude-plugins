---
name: create-tdd
description: Define system behaviour and code shape. The PRD-Oriented technical phase, covering HOW. Takes System Design and Program Design as two separately approved layers, one question per message.
argument-hint: [TASK-ID]
disable-model-invocation: true
disallowed-tools: Edit, NotebookEdit
effort: high
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/artifact-manifest.mjs *), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs *), Read, Grep, Glob, Write, Task, AskUserQuestion
---

# Technical design

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

Set the Linear issue to `design-in-progress`.

## 2. Read

The latest `prd` if one exists (helpful, not required), otherwise `ticket.md` plus the latest
`research`. **Skip** the research-questions artifact.

## 3. Two layers, two approvals

This phase has two halves, and they are approved **separately**. Do not merge them, and do not carry
one approval over to the other.

### Layer 1: System design

How the components interact. API contracts, schemas, queues, stores, and the queries run against
them.

Ask **one question per message** using `AskUserQuestion`. Get explicit approval of the system design
as a whole before touching Layer 2.

This layer is worth its own review because real problems are visible here and nowhere else: a
missing index, an N+1 query, a queue with no dead-letter path. All of them are obvious from a schema
plus its queries, and all of them are expensive to find after the code exists.

**Draw this layer.** Diagrams pay for themselves here more than anywhere else in the workflow,
because the problems they expose are invisible once the code exists: a `sequenceDiagram` shows an
extra round trip, an `erDiagram` shows a missing index or an N+1, a `stateDiagram-v2` shows a state
with no way out.

Use a ```mermaid fence inline in the TDD, not a separate file, so it renders in review and diffs as
text. See ${CLAUDE_PLUGIN_ROOT}/references/diagrams.md for which type answers which question.

### Layer 2: Program design

Only once system design is approved. The code shape that follows from it: call paths, files, types,
function signatures, test boundaries.

Again **one question per message**, and a **separate** approval for this layer.

## 4. Write the artifact

Write `<task dir>/<NN>-tdd-<slug>.md`:

```markdown
---
ticket: <TICKET-ID>
kind: tdd
slug: <slug>
created: <DD/MM/YYYY>
---

# TDD: <title>

## System design
Components and how they interact. Contracts, schemas, stores, queues, queries.

```mermaid
%% contracts, stores, queues, and the queries against them
```

### Approved
<DD/MM/YYYY> by <who>.

## Program design
Call paths, files, types, signatures, test boundaries.

```mermaid
%% sequenceDiagram for a call path, classDiagram for type relationships.
%% Only where the shape is not obvious from the signatures already written down.
```

### Approved
<DD/MM/YYYY> by <who>.

## Risks
What could go wrong and what would catch it.
```

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

Set the Linear issue to `design-in-review`. Print the path and:

```
/spec:create-outline <TICKET-ID>
```

Then **stop**. TDD to outline never auto-advances.

## Boundary

The TDD says how, never whether. If technical work reveals that the product decision was wrong, stop
and say so: that is `/spec:iterate-prd`, not something to quietly absorb here.
