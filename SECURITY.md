# Security policy

## Supported version

Security fixes are applied to the latest commit on `main`.

## Reporting a vulnerability

Use the repository's [private vulnerability reporting form](https://github.com/SebastianSteele/keepside-web/security/advisories/new). Do not include real client data, credentials, or a workspace export. Reproduce the issue with the built-in sample workspace when possible.

## Local-mode boundary

The default build keeps one workspace in the browser and does not transmit it. Browser storage is not encrypted by Keepside and can be cleared by the browser or device policy. Do not use it for regulated or highly sensitive information without appropriate device-level protection and a tested backup routine.

## Connected-mode boundary

The repository includes optional browser clients and reference contracts for a self-hosted database and outbound mail relay. It does not include an authentication server or hosted service. A deployment that sets `VITE_KEEPSIDE_API_URL` sends data to that operator's API.

The operator is responsible for HTTPS, authentication, owner-level access control, conditional writes, CSRF and origin protection, rate limits, encrypted backups, mail abuse controls, provider secrets, and incident response. Database and provider credentials must never use a `VITE_` environment variable.

The relay is outbound-only. It must use a server-controlled sender and store only the minimum delivery metadata needed for idempotency and support. Provider acceptance does not guarantee final delivery.

See [the connected-mode reference](docs/SELF_HOSTING.md) for the complete trust boundary.
