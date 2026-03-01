---
title: Secrets & Keys Inventory
kind: operations
updated: 2026-03-01
---

# Secrets & Keys Inventory

Everything that would hurt if you lost it or leaked it, and where it lives on
this Mac Mini.

> **Back this machine up.** Time Machine, encrypted external drive, anything.
> Several of these keys have no cloud recovery path.

---

## Code Signing Certificates (macOS Keychain)

Stored in the login keychain. Visible via `security find-identity -v -p codesigning`.

| Identity | Use |
|----------|-----|
| **Developer ID Application**: Hangzhou Hu Di Shen Shan Technology Co., Ltd (97W7A3Y9GD) | Notarized macOS builds (direct distribution) |
| **Apple Distribution**: Hangzhou Hu Di Shen Shan Technology Co., Ltd (97W7A3Y9GD) | App Store / TestFlight builds (iOS) |
| **Apple Development**: MINSHENG LIU (56FDSFFNGK) | Local development signing |

**Recovery**: Re-downloadable from the Apple Developer portal, but the private
keys are local-only. If the Keychain is lost, you must revoke and recreate the
certificates.

---

## App Store Connect API Key

| Field | Value |
|-------|-------|
| **Path** | `~/.appstoreconnect/private_keys/AuthKey_3U39ZA4G2A.p8` |
| **Key ID** | `3U39ZA4G2A` |
| **Issuer ID** | `d782de6f-d166-4df4-8124-a96926af646b` |

Used by:
- `xcodebuild -exportArchive` (provisioning profile management)
- `xcrun notarytool submit` (macOS notarization)
- `xcrun altool --upload-app` (TestFlight uploads)

**Recovery**: You can generate a new API key from App Store Connect → Users
and Access → Integrations → App Store Connect API. The old `.p8` file cannot
be re-downloaded after initial creation.

---

## Sparkle EdDSA Key (App Self-Update Signing)

| Field | Value |
|-------|-------|
| **Path** | `~/.wuhu/keys/sparkle_eddsa_key.pub` (public) |
| **Path** | `~/.wuhu/keys/sparkle_eddsa_key.priv` (private) |

Used by:
- `publish-release.sh` — signs the notarized `.zip` so Sparkle can verify it
- The public key is embedded in `WuhuAppMac`'s Info.plist (`SUPublicEDKey`)

**Recovery**: If the private key is lost, existing users cannot verify a new
release signed with a different key. You would need to ship a manual
re-download (users can't auto-update to the new key). **Do not lose this.**

---

## SSH Keys

| File | Use |
|------|-----|
| `~/.ssh/id_ed25519` | GitHub access, server SSH |
| `~/.ssh/id_ed25519.pub` | Public half (on GitHub, authorized_keys, etc.) |
| `~/.ssh/id_ed25519.old` | Previous key (rotated) |

**Recovery**: Generate a new keypair and update GitHub / server
`authorized_keys`.

---

## Cloudflare (Wrangler OAuth)

| Field | Value |
|-------|-------|
| **Config** | `~/Library/Preferences/.wrangler/config/default.toml` |
| **Account** | Isofucius (`476ba1878542c080b6bf4a771719d1fd`) |
| **Email** | `cloudflare.services@liu.ms` |

This is an OAuth token that auto-refreshes. Used by `wrangler` CLI for:
- R2 uploads (site deploy, release binaries)
- Worker deploys

**Recovery**: `wrangler login` to re-authenticate. No permanent secret to lose.

---

## Wuhu Server Config (LLM API Keys)

| Field | Path |
|-------|------|
| **Server config** | `~/.wuhu/server.yml` |

Contains:
- OpenAI API key (`sk-aRLo...`)
- Anthropic API key (`sk-ant-api03-...`)

**Recovery**: Rotate from the respective provider dashboards
(platform.openai.com, console.anthropic.com).

---

## GitHub Actions Self-Hosted Runner

| Field | Value |
|-------|-------|
| **Install path** | `~/actions-runner/` |
| **Repo** | `wuhu-labs/wuhu-app` |
| **Runner name** | `mac-mini` |
| **Labels** | `self-hosted`, `macOS`, `ARM64` |
| **Service** | `~/Library/LaunchAgents/actions.runner.wuhu-labs-wuhu-app.mac-mini.plist` |

Runs as a launchd user agent (auto-starts on login). Manage with:
```bash
cd ~/actions-runner
./svc.sh status
./svc.sh stop
./svc.sh start
```

**Recovery**: Re-download runner tarball, generate a new registration token via
`gh api -X POST repos/wuhu-labs/wuhu-app/actions/runners/registration-token`,
and re-run `config.sh`.

---

## Summary: What to Back Up

Priority order if you're setting up Time Machine or a manual backup:

1. **macOS Keychain** — contains code signing private keys (not recoverable)
2. **`~/.wuhu/keys/`** — Sparkle EdDSA private key (not recoverable without pain)
3. **`~/.appstoreconnect/private_keys/`** — ASC API key (re-creatable but annoying)
4. **`~/.ssh/`** — SSH keys (re-creatable but need to update everywhere)
5. **`~/.wuhu/server.yml`** — LLM API keys (rotatable from provider dashboards)
6. **`~/.wuhu/wuhu.sqlite`** — session history, workspace data (irreplaceable)

The Cloudflare wrangler token is the least critical — just `wrangler login` again.
