---
name: create-tdd
description: Define system behaviour and code shape. The PRD-Oriented technical phase, covering HOW. Takes System Design and Program Design as two separately approved layers, one question per message.
argument-hint: [TICKET-ID]
disable-model-invocation: true
disallowed-tools: Edit, NotebookEdit
effort: high
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs *), Read, Grep, Glob, Write, Task, AskUserQuestion
---

# Technical design

Ticket: `$ARGUMENTS`

If no ticket identifier was given, **ask for one and stop**. Do not infer it from the branch name,
the directory, or earlier conversation. Guessing wrong means writing artifacts into another ticket's
directory and moving the wrong Linear issue, which is worse than failing outright.

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

For anything with more than two moving parts, write `<task dir>/diagram-<description>.html` as a
self-contained HTML file and have the user look at it.

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

### Diagrams
- [<description>](diagram-<description>.html)

### Approved
<DD/MM/YYYY> by <who>.

## Program design
Call paths, files, types, signatures, test boundaries.

### Approved
<DD/MM/YYYY> by <who>.

## Risks
What could go wrong and what would catch it.
```

## 5. Hand off

Set the Linear issue to `design-in-review`. Print the path and:

```
/rpi:create-outline <TICKET-ID>
```

Then **stop**. TDD to outline never auto-advances.

## Boundary

The TDD says how, never whether. If technical work reveals that the product decision was wrong, stop
and say so: that is `/rpi:iterate-prd`, not something to quietly absorb here.
