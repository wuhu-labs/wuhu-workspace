---
name: macos-manual-build
description: |
  Manually build, notarize, and staple the Wuhu macOS app on the local
  machine. Only use this when the user explicitly asks for a manual/local
  macOS build — the normal release path is tag-based CI (see wuhu-app
  AGENTS.md).
---

# macOS Manual Build (Local)

## Quick path

```bash
cd wuhu-app
./scripts/build-notarized-mac.sh
```

The script handles: xcodegen → archive → export → zip → notarize → staple
→ verify → copy to iCloud Desktop.

Flags:
- `--skip-gen` — skip xcodegen if the project is already generated
- `--no-upload` — produce the zip locally without copying to iCloud

## What the pipeline does

### 1. Archive with Developer ID signing

```
CODE_SIGN_STYLE=Manual
CODE_SIGN_IDENTITY="Developer ID Application: Hangzhou Hu Di Shen Shan Technology Co., Ltd (97W7A3Y9GD)"
```

This is **not** the same as the App Store distribution certificate used for
iOS TestFlight. Developer ID is specifically for macOS apps distributed
outside the App Store.

### 2. Export with `method: developer-id`

The export options plist uses:

| Key | Value | Why |
|-----|-------|-----|
| `method` | `developer-id` | Required for notarization (not `app-store-connect`) |
| `signingStyle` | `manual` | Use the specific Developer ID cert |
| `signingCertificate` | `Developer ID Application` | Matches the cert in keychain |
| `teamID` | `97W7A3Y9GD` | Team identifier |

API key auth flags are passed to `xcodebuild -exportArchive` for
provisioning profile management.

### 3. Notarize via `notarytool`

```bash
xcrun notarytool submit <zip> \
    --key <path> --key-id <id> --issuer <issuer> \
    --wait
```

The `--wait` flag blocks until Apple's notary service returns a verdict
(typically 30–120 seconds). Uses the same ASC API key as TestFlight.

### 4. Staple the ticket

```bash
xcrun stapler staple WuhuAppMac.app
```

Embeds the notarization ticket into the app bundle so Gatekeeper can
verify it offline.

### 5. Verify

```bash
spctl --assess --type exec -vv WuhuAppMac.app
```

Should output `source=Notarized Developer ID`.

### 6. Final zip and deploy

The stapled `.app` is zipped with `/usr/bin/ditto` (preserves resource
forks and extended attributes) and copied to iCloud Desktop.

## Key differences from iOS TestFlight

| | iOS TestFlight | macOS Notarized |
|---|---|---|
| Certificate | Apple Distribution | Developer ID Application |
| Export method | `app-store-connect` | `developer-id` |
| Signing style | Automatic | Manual |
| Distribution | App Store Connect | Direct (zip, website, etc.) |
| Notarization | Not needed (ASC handles it) | Required for Gatekeeper |
| Build number | Auto-managed by ASC | Not relevant |

## Authentication

Same ASC API key as TestFlight:

```
~/.appstoreconnect/private_keys/AuthKey_3U39ZA4G2A.p8
Key ID:    3U39ZA4G2A
Issuer ID: d782de6f-d166-4df4-8124-a96926af646b
```

Used for both the export step (provisioning) and notarytool submission.

## Output locations

- **Local build**: `wuhu-app/build-mac/WuhuAppMac.zip`
- **iCloud Desktop**: `~/Library/Mobile Documents/com~apple~CloudDocs/Desktop/WuhuAppMac.zip`

The iCloud path is the iCloud Drive Desktop (synced across devices), not
`~/Desktop` (the local user Desktop).

## Checking notarization history

```bash
xcrun notarytool history \
    --key ~/.appstoreconnect/private_keys/AuthKey_3U39ZA4G2A.p8 \
    --key-id 3U39ZA4G2A \
    --issuer d782de6f-d166-4df4-8124-a96926af646b
```

To inspect a specific submission:

```bash
xcrun notarytool log <submission-id> \
    --key ... --key-id ... --issuer ...
```

## Troubleshooting

- **"Developer ID Application" cert not found**: Run
  `security find-identity -v -p codesigning` to verify it's in the
  keychain. The cert must be installed locally (not just on the CI machine).

- **Notarization rejected ("Invalid")**: Check the log with
  `notarytool log <id>`. Common issues:
  - Missing hardened runtime (`ENABLE_HARDENED_RUNTIME=YES` — already set
    in `project.yml`)
  - Unsigned nested frameworks or dylibs
  - Missing `com.apple.security.app-sandbox` entitlement (already set)

- **Stapler fails**: Usually means the notarization ticket hasn't
  propagated yet. Wait a minute and retry.

- **`spctl` says "rejected"**: The app wasn't properly notarized or the
  staple didn't take. Re-run the notarize + staple steps.

## Typical timeline

| Step | Duration |
|------|----------|
| xcodegen | ~2s |
| Archive | ~90s |
| Export | ~10s |
| Notarize (upload + processing) | 30–120s |
| Staple + verify | ~2s |
| **Total** | ~3 minutes |
