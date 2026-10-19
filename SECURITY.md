# Security Policy

## Supported versions

Only the latest release receives security fixes. Please update to the newest
[release](https://github.com/SpaceCadet0/Tin-Whistler/releases) before reporting.

| Version | Supported |
| ------- | --------- |
| latest  | yes       |
| older   | no        |

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

Report privately through GitHub:
[Report a vulnerability](https://github.com/SpaceCadet0/Tin-Whistler/security/advisories/new).

Include what you found, the steps to reproduce it, the app version (web or
Android) and the impact you expect. You can write in English or Russian.

You can expect a first reply within about a week. This is a hobby project run by
one person, so fixes are made on a best-effort basis; I will keep you updated and
credit you in the release notes if you wish.

## Scope

Tin Whistler runs entirely on your device. There is no server and no account, and
progress, settings and your own tunes stay in the browser or app storage.
Things worth reporting:

- Problems in how imported files are handled (ABC, MIDI, SVG, images, backup JSON).
- Cross-site scripting or code execution through tune data or backups.
- Unexpected network access or data leaving the device.
- Android app issues (permissions, exported components, insecure storage).

Out of scope: social engineering, attacks that need physical access to an
unlocked device, and vulnerabilities in third-party dependencies that are not
reachable from this app (please report those upstream).
