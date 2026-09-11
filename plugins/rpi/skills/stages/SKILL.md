---
name: stages
description: Inspect and manage the RPI workflow stages on a Linear team. Lists current states, creates missing RPI stages, renames, recolours, repositions and archives them. Needs a Linear API key; every other rpi command does not.
argument-hint: [list|ensure|rename|update|archive|archive-others|destroy] [TEAM-KEY]
disable-model-invocation: true
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/linear.mjs *), Read
---

# Manage RPI stages on a Linear team

Arguments given: `$ARGUMENTS`

The engine is `${CLAUDE_PLUGIN_ROOT}/scripts/linear.mjs`. Run it with the Bash tool. Do not
reimplement its logic, and do not reach for the Linear MCP for stage changes: the MCP is read-only
for workflow states, which is exactly why this script exists.

## Commands

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/linear.mjs list           --team <KEY>
node ${CLAUDE_PLUGIN_ROOT}/scripts/linear.mjs ensure         --team <KEY> [--file custom.json]
node ${CLAUDE_PLUGIN_ROOT}/scripts/linear.mjs rename         --team <KEY> --from <old> --to <new>
node ${CLAUDE_PLUGIN_ROOT}/scripts/linear.mjs update         --team <KEY> --name <state> [--color #RRGGBB] [--description "..."] [--position N]
node ${CLAUDE_PLUGIN_ROOT}/scripts/linear.mjs archive        --team <KEY> --name <state> [--move-to <state>]
node ${CLAUDE_PLUGIN_ROOT}/scripts/linear.mjs archive-others --team <KEY> [--move-to <state>]
node ${CLAUDE_PLUGIN_ROOT}/scripts/linear.mjs destroy        --team <KEY> [--move-to <state>]
```

`--team` accepts a team key (`ENG`) or its full name. If the user did not name a team, read
`.rpi/config.json` in the working repo for `linearTeam`, and ask if that is absent too.

## How to run it

1. **Always run without `--apply` first.** Every mutating command dry-runs by default and prints
   the exact plan. Show that plan to the user verbatim.
2. **Get explicit confirmation before re-running with `--apply`.** Never pass `--apply` on the
   first invocation of a mutating command, even if the user sounded decisive.
3. For `archive-others` and `destroy`, state plainly how many stages and how many live issues are
   affected, and wait for an unambiguous yes. These are the two commands that can disrupt a team's
   board, so treat a vague reply as a no.
4. `list` is read-only. Run it freely, including straight after a mutation to confirm the result.

## Things that will bite you

- **A state's `type` cannot be changed.** Linear's API has no field for it. `ensure` reports a type
  mismatch and moves on rather than pretending. If the type genuinely matters, the only route is to
  archive the state and create a replacement, which means relocating its issues first.
- **A state holding live issues cannot be archived.** Linear rejects it. Pass `--move-to <state>` to
  relocate the issues first; the script does this for you and reports how many it moved.
- **Archive is not delete.** Linear has no hard delete for workflow states. Archived states vanish
  from the board but the issues that passed through them are untouched.
- **Renaming is safe.** Issues keep their state through a rename, because the state id does not change.

## The default stage set

18 stages in `${CLAUDE_PLUGIN_ROOT}/stages/rpi-defaults.json`, six phases of
ready / in-progress / in-review plus `in-dev` and `code-review`. To customise, copy that file, edit
it, and pass `--file`. Each entry needs `name`, `type` (backlog, unstarted, started, completed,
canceled), `color` as `#RRGGBB`, and optionally `description` and `position`.

## If it asks for an API key

The script prints the three places it looks. Relay that to the user and stop. Never ask them to
paste the key into the conversation, and never write it into a file in the repo. The supported
routes are the `/plugin configure rpi@rvs-plugins` prompt, a `LINEAR_API_KEY` environment variable,
or `~/.config/rpi/linear.env`.
