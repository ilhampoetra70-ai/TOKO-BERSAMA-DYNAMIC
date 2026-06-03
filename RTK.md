# RTK - Rust Token Killer (Codex CLI)

**Usage**: Token-optimized CLI proxy for shell commands.

## Rule

Always run shell commands through the repository wrapper:

```bash
scripts/rtk-run <cmd>
```

This wrapper forces `$HOME/.local/bin` into `PATH` before delegating to `rtk`, so RTK stays active even when the shell does not load `/home/ilham/.bashrc`.

If the wrapper cannot be used, prefix the command with `rtk` directly.

Examples:

```bash
scripts/rtk-run git status
scripts/rtk-run cargo test
scripts/rtk-run npm run build
scripts/rtk-run pytest -q
```

## Meta Commands

```bash
scripts/rtk-run gain            # Token savings analytics
scripts/rtk-run gain --history  # Recent command savings history
scripts/rtk-run proxy <cmd>     # Run raw command without filtering
```

## Verification

```bash
scripts/rtk-run --version
scripts/rtk-run gain
scripts/rtk-run proxy command -v rtk
```
