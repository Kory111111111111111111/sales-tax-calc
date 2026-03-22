# Security Policy

## Supported Branch

Security controls are enforced on `master` via CI checks.

## Defensive Controls in This Repository

- CI security scan (`.github/workflows/security-check.yml`)
- Deploy workflow hardening (`npm ci --ignore-scripts`)
- Dependency review on pull requests (`.github/workflows/dependency-review.yml`)
- Local optional pre-commit security hook (`.githooks/pre-commit`)
- Repository security scanner (`scripts/security-check.js`)

## Local Security Setup (Maintainers)

Enable local commit guard once per clone:

- `npm run security:hooks:enable`

Disable if needed:

- `npm run security:hooks:disable`

Run the scanner manually:

- `npm run security:check`

## Reporting a Vulnerability

Please report security issues privately to the repository owner/maintainer. Avoid opening public issues for active vulnerabilities.

Include:

1. Affected file(s)/commit(s)
2. Reproduction details
3. Potential impact
4. Suggested mitigation (if known)

## Incident Response Checklist

1. Freeze deployment pipeline and block merges.
2. Identify first bad commit and full blast radius.
3. Remove malicious artifacts and lifecycle hooks.
4. Rotate credentials/tokens if any install/build executed in compromised state.
5. Re-run security checks and review dependency changes.
6. Re-enable merges only after clean verification.
