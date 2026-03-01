---
name: server-redeploy
description: |
  Build and deploy the latest wuhu-core binary, then restart the Wuhu
  server and runner. Use this when wuhu-core changes need to be deployed
  to the running local Wuhu instance.
---

# Server Redeploy

Deploy the latest `wuhu-core` binary and restart the Wuhu server + runner.

## Scripts

Two scripts in `~/.wuhu/`:

- **`install_latest.sh`** — Clone (if needed), pull latest main, build
  release, install binary to `/usr/local/bin/wuhu`.
- **`restart.sh`** — Restart server + runner via `launchctl kickstart`.

## Usage

### Build + install + restart (most common)

```bash
~/.wuhu/install_latest.sh --restart
```

### Just restart (binary already up to date)

```bash
~/.wuhu/restart.sh
```

### Just build + install (restart later)

```bash
~/.wuhu/install_latest.sh
```

## Details

- The build directory is `~/Developer/WuhuLabs/wuhu-core` (persistent,
  benefits from incremental build cache).
- `install_latest.sh` always fetches and resets to `origin/main` before
  building.
- Binary installation uses `install(1)`, NOT `cp`. This is critical:
  `cp` overwrites in-place (same inode), which corrupts the code signature
  of the running process and causes the kernel to kill it. `install`
  creates a new inode atomically.
- `restart.sh` uses `nohup` + `disown` so it survives even if the calling
  session is terminated by the restart.

## When to use

- After merging PRs to `wuhu-core` that change server/runner behavior.
- After fixing bugs in the agent loop, tool execution, compaction, etc.
- When the app and server are on different versions and need to be synced.

## Warning

Restarting the server will interrupt all running sessions. The session
crash recovery mechanism will resume them, but if crash recovery is
broken, sessions may need manual intervention. Warn the user before
restarting.
