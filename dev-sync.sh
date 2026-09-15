#!/usr/bin/env bash
# Refresh the installed copy of the plugin from this source tree.
#
# Claude Code installs plugins by COPYING them into
# ~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/, and `claude plugin update`
# is a no-op while the version in plugin.json is unchanged. So during development,
# reinstall is the way to pick up edits.
set -euo pipefail
PLUGIN="${1:-spec@rvs-plugins}"
claude plugin uninstall "$PLUGIN" >/dev/null 2>&1 || true
claude plugin install "$PLUGIN"
echo
claude plugin details "$PLUGIN" | sed -n '/Component inventory/,/^$/p'
