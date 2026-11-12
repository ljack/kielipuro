# Verification — 2026-11-12

Automated verification: `npm test` passed 10 tests covering exact deduplication, classification, owner-only approval, changed-request invalidation (including delayed first scans), HMAC tampering/replay, disconnected mode, Slack retry and thread handling, isolation, request limits and security headers. `npm run build` passed the Cloudflare Worker dry run. Dependency install reported no known audit vulnerabilities at that time.

Cloudflare deployed the app and remote D1 migration successfully. Initial Worker version: `7d5f3f27-db38-49e2-ae47-db9d51fbe0fd`; adding the monitor secret created a subsequent version.

## Live HTTP and browser

- Root and `/api/status`: HTTP 200. Status correctly reports `slackConfigured: false`.
- Unauthenticated `/api/internal/pending`: HTTP 401. Unconfigured Slack POST: HTTP 503.
- CSP, nosniff, referrer and permissions headers present.
- Native Chrome desktop and 390×844 responsive view inspected. Finnish text, Japanese glyphs, original stream mark, practice and feedback form rendered without visible horizontal overflow.
- Incorrect-answer feedback and keyboard activation worked. Completion survived reload; restart returned to the task.
- The feedback form opened GitHub with the exact title, observation, experience metadata and approval-pending labels. This browser-only draft was not submitted. The two actual sample issues below were created through GitHub's API.
- The Impeccable detector reported only the intentional warm-paper palette. Kept as documented in DESIGN.md. No claim of a comprehensive accessibility audit or physical-phone acceptance.

## Live monitoring

- [CI run](https://github.com/ljack/kielipuro/actions/runs/43252926628): passed install, tests and Worker compilation on GitHub's runner.
- [Initial manual monitor](https://github.com/ljack/kielipuro/actions/runs/43252972679): succeeded with the authenticated Worker bridge.
- [Issue-event monitor](https://github.com/ljack/kielipuro/actions/runs/43252999837): succeeded; [sample #1](https://github.com/ljack/kielipuro/issues/1) classified as `type:bug`, `feedback`, `needs-owner-approval`.
- [Duplicate monitor](https://github.com/ljack/kielipuro/actions/runs/43253060702): succeeded; [sample #2](https://github.com/ljack/kielipuro/issues/2) linked to #1 and automatically closed. Different tester experience did not create a separate request.
- Monitor log: `2 issues reviewed; 0 Slack events delivered. No code changes or implementation actions.` Remote D1 heartbeat independently confirmed success at `2026-11-12 15:55:55` UTC.
- Workflow API reports `active`; schedule is committed at minutes 7/22/37/52 UTC. Manual and event-triggered runs were observed. Scheduled delivery timing remains subject to GitHub's scheduler; see FEEDBACK.md.
- Both samples are labelled `test:verification` and closed after verification, keeping the actionable backlog clean. No customer request was approved or implemented.
- [Final 10-test CI run](https://github.com/ljack/kielipuro/actions/runs/43253580109) passed after hardening delayed approval handling.
- [Sampsa's forwarded suggestion #3](https://github.com/ljack/kielipuro/issues/3) was automatically classified as `type:content` and `needs-owner-approval`; [monitor run](https://github.com/ljack/kielipuro/actions/runs/43253992188) succeeded. This was manual capture of owner-supplied feedback, not a live Slack delivery.

## Secrets

Only `MONITOR_TOKEN` is installed in the Worker and GitHub Actions secret stores. Repository variable `FEEDBACK_URL` is configured. Credential-pattern scan of project source found no tokens/private keys. Ignored runtime files and dependency trees were not staged. A local Python health request returned HTTP 403; subsequent GitHub runner bridge access, live curl probes and the remote D1 heartbeat verified the deployed path successfully.

Active Worker version after secret provisioning: `0cca8e44-5f4a-4c95-98d1-96d568bc81f4`, verified with Wrangler deployment history. Subsequent repository edits concern monitor approval checks and documentation; deployed app/Worker source is unchanged.

Slack remains unconnected; local signed fixtures are not live Slack verification. No domain was purchased. Course content and scope are still undecided.
