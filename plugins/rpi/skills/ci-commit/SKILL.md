---
name: ci-commit
description: Turn the current working tree into one or more focused commits without running a full implementation or PR flow. Groups related changes and refuses to commit anything that looks like a secret.
argument-hint: [optional scope hint]
disable-model-invocation: true
allowed-tools: Bash(git *), Read, Grep, Glob
---

# Commit the working tree

Arguments: `$ARGUMENTS`

A utility, not a workflow phase. It touches no artifacts and moves no Linear issue.

## 1. Look at what is there

```bash
git status --short
git diff --stat
git diff
```

Read the actual diff. A commit message written from filenames alone describes the files, not the
change.

## 2. Refuse secrets

Before staging anything, scan for credentials: `.env` files, files containing `API_KEY`, `SECRET`,
`TOKEN`, `PASSWORD`, `PRIVATE KEY`, `BEGIN RSA`, connection strings with inline passwords, anything
matching a known key prefix such as `lin_api_`, `sk-`, `ghp_`, `AKIA`.

**Do not commit these, and do not ask whether to.** Name the file, say why it was excluded, and
continue with the rest. A committed secret is in the history even after it is deleted, so this one
is not the user's call to make casually mid-commit.

Also skip build output, `node_modules`, `.DS_Store` and local editor files. Offer a `.gitignore`
line instead.

## 3. Group into focused commits

One commit per coherent change. A refactor and a bug fix in the same commit cannot be reverted
separately, and that is usually discovered at the worst moment.

If everything is genuinely one change, one commit is right. Do not split for the sake of it.

## 4. Write real messages

```
<subject: what changed, imperative, under ~70 chars>

<body: why, if it is not obvious from the subject>
```

Say what the change does, not which files moved. The diff already lists the files.

## 5. Report

List the commits made and anything deliberately left unstaged, with the reason.

Do not push. Pushing is a separate decision, and `/rpi:describe-pr` handles it for task work.
