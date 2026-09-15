---
name: create-outline
description: Split an approved design into ordered vertical phases, each independently testable. The structure phase. Produces a numbered structure-outline artifact that implementation works from directly.
argument-hint: [TICKET-ID]
disable-model-invocation: true
disallowed-tools: Edit, NotebookEdit
effort: high
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs *), Read, Grep, Glob, Write, Task
---

# Structure outline

Ticket: `$ARGUMENTS`

If no ticket identifier was given, **ask for one and stop**. Do not infer it from the branch name,
the directory, or earlier conversation. Guessing wrong means writing artifacts into another ticket's
directory and moving the wrong Linear issue, which is worse than failing outright.

## 1. Context

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs <TICKET-ID>
```

Set the Linear issue to `structure-in-progress`.

## 2. Read

Every task artifact **except** research-questions, plus the source files those artifacts cite. Go
and open the cited files: the outline names real paths, and a phase pointing at a file that does not
exist wastes the implementation phase.

If the design still has decisions marked **Open**, stop and say so. Point the user at
`/spec:iterate-design-discussion`. An outline built on an unsettled design encodes a guess into the
plan of record.

Fill genuine gaps with `researcher` subagents.

## 3. Slice vertically

This is the whole job, so get it right.

A **vertical slice** connects only the parts needed for **one result a person can run, see or
query**. An early slice might serve fixed data from a new endpoint you can hit with `curl`. A later
slice wires that same path to real storage. Each one ends in something checkable.

A **horizontal plan** groups by layer: schema, then service, then API, then UI. Avoid it. Nothing is
verifiable until the last layer lands, which is precisely when correcting a bad assumption costs
the most.

Test each phase against: **what can a person run at the end of this to see it worked?** If the
answer is "nothing until a later phase", the slice is horizontal. Re-cut it.

Also:

- **Order by dependency, then by risk.** Pull the phase that could invalidate the design earliest.
- **Keep them small.** A phase touching fifteen files is two or three phases.
- **Name real files.** Paths from the codebase, not invented ones.
- **Every phase states its checks.** The command that proves it: a test, a build, a curl, a query.

## 4. Write the artifact

Write `<task dir>/<NN>-structure-outline-<slug>.md`:

```markdown
---
ticket: <TICKET-ID>
kind: structure-outline
slug: <slug>
created: <DD/MM/YYYY>
---

# Outline: <title>

## Overview
- [ ] Phase 1: <one-line result>
- [ ] Phase 2: <one-line result>

## Phase 1: <name>
**Result:** the one thing that is true and checkable when this phase is done.
**Files:** `path/one.ts`, `path/two.ts`
**Changes:** what happens in each, a few lines.
**Checks:** `npm test -- path/one.test.ts`, or the exact curl, or the query to run.
**Manual steps:** anything a human must do, such as a migration or an env var. "None" if none.

## Phase 2: ...
```

The Overview checklist is how implementation tracks progress, so keep it in step with the phases
below it.

## 5. Hand off

Set the Linear issue to `structure-in-review`. Print the path, the phase count, and:

```
/spec:implement-outline <TICKET-ID>
```

Then **stop**. **Never start implementing.** Outline to implementation is a human decision, always,
even when the outline looks obviously right.
