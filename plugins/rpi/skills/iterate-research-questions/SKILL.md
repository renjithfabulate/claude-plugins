---
name: iterate-research-questions
description: Revise an existing research-questions artifact after review. Edits it in place, keeping its path and frontmatter. Use in a fresh session when the questions are missing something, unclear, or asking about the future rather than the present.
argument-hint: [TICKET-ID] [what to change]
disable-model-invocation: true
disallowed-tools: NotebookEdit
effort: high
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs *), Read, Grep, Glob, Edit
---

# Revise the research questions

Arguments: `$ARGUMENTS`

If no ticket identifier was given, **ask for one and stop**. Do not infer it from the branch name,
the directory, or earlier conversation. Guessing wrong means writing artifacts into another ticket's
directory and moving the wrong Linear issue, which is worse than failing outright.

## 1. Context

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs <TICKET-ID>
```

Read the latest `research-questions` artifact it reports. If more than one could plausibly apply,
ask the user which, rather than guessing.

## 2. Get the feedback

If the user did not say what to change, ask. Do not invent improvements: an artifact that gets
rewritten on the agent's own initiative stops being the user's document.

## 3. Apply it

Edit the artifact **in place**. Keep its filename and its frontmatter. Do not create a new numbered
artifact, and do not keep a changelog inside the document.

When revising, watch for the failure modes that usually trigger this command:

- **Forward-looking questions.** "Should we cache this?" is design, not research. Rewrite it as a
  question about what exists, or drop it.
- **Unanswerable breadth.** "How does billing work?" cannot be closed. Split it.
- **Missing context pointers.** A question with no "where to look" wastes the research phase.
- **Questions about the wrong thing.** Scope creep into adjacent systems.

If the feedback contains a factual claim about the codebase, check it against the code before acting
on it. The user may be misremembering, and it is cheaper to find that out now.

## 4. Hand off

Print what changed, in a couple of lines, and the next step:

```
/rpi:create-research <TICKET-ID>
```

Then **stop**.

## Note on sessions

Prefer just asking for edits directly if the current session still has context. Use this command in
a fresh session when context is tight, and write every decision from the old session into the
artifact first: the new session starts blind.
