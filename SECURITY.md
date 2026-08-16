# Security Policy

## Supported Versions

Only the **latest release** receives security fixes. Please update before reporting.

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Please open a **[private security advisory](https://github.com/mxkissnr/vab-departures-card/security/advisories/new)** on GitHub and include:

- A clear description of the vulnerability
- Steps to reproduce
- Potential impact

I will acknowledge your report within **7 days** and aim to release a fix within **30 days** depending on severity.

## Scope

This is a client-side Lovelace card that renders data already exposed by the
[ha-vab-integration](https://github.com/mxkissnr/ha-vab-integration) sensor entities inside
your own Home Assistant frontend. It does not make any network requests of its own and
stores only starred-departure state in the browser's `localStorage`.

The primary attack surface is DOM injection from data rendered into the card (sensor
attribute values, `line_colors` config) — all interpolated values are HTML-escaped before
being written to `innerHTML`.

Out of scope: vulnerabilities in Home Assistant itself, in `ha-vab-integration`, or in the
upstream EFA/marudor APIs.
