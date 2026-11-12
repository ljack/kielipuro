# Feedback operations

## Intake and cadence

1. The app prepares a Finnish GitHub issue. The tester signs in and submits it on GitHub. Opening the form alone is not submission. GitHub issues are public.
2. GitHub Actions `Feedback monitor` runs on opened/edited/reopened issues, label changes and created/edited/deleted issue comments. It also reconciles at `7,22,37,52 * * * *` UTC, and supports a manual run.
3. When Slack is connected, signed events are durably queued in Cloudflare D1 before acknowledgment. Scheduled/manual monitoring imports at most 50 pending events per run, then acknowledges them with a GitHub link in the original Slack thread. Current Slack status is **not connected**.
4. Successful runs record a D1 heartbeat; failed runs fail visibly in GitHub Actions. Review the Actions page and enable GitHub workflow-failure notifications in the owner's account. Account-wide notifications were not changed.

Schedule is best effort, not a 15-minute delivery guarantee: GitHub can delay runs, and scheduled workflows in public repositories can be disabled after 60 days without repository activity. Check/re-enable the workflow after inactivity. Run `gh workflow run feedback.yml --repo ljack/kielipuro` for immediate reconciliation. No local process or agent session must remain running.

## Deduplication

- Normalize Unicode, case, punctuation and whitespace. Exact matching of title plus observation text maps to the oldest issue. Experience metadata is excluded.
- Exact duplicate issues retain their descriptions and are closed with reciprocal links to the canonical issue. Slack submissions matching an existing request append their source link to that issue instead of creating another.
- Similar wording (token overlap >= 0.72) receives `possible-duplicate` and a suggested link; the owner decides whether to merge it. This deliberately avoids silently merging different requests.
- Slack event ID and `(team, channel, message timestamp)` are unique in D1, preventing retries and dual `message`/`app_mention` delivery from creating two receipts. Thread markers keep follow-up messages on the same issue.
- GitHub source markers recover from a crash between creating an issue/comment and acknowledging its queue item. Only bot-authored markers are trusted.
- External APIs cannot share one transaction. A crash after Slack accepts an acknowledgment but before D1 records it can repeat that notification; it does not duplicate the GitHub issue. Retries remain pending rather than dropping feedback.

## Triage and owner approval

Deterministic categories: `type:bug`, `type:content`, `type:idea`. They are provisional, not an AI assessment of priority or teaching quality. Open feedback awaiting a decision has `needs-owner-approval`. Backlog:

https://github.com/ljack/kielipuro/issues?q=is%3Aissue+is%3Aopen+label%3Aneeds-owner-approval

Only GitHub user **ljack** can decide by posting an exact, standalone command:

```text
/approve
```

or `/reject`. The monitor reads the actual comment author, not claims in text or a manually added label. It records the approved request revision. Changes to the title/body or new/edited customer discussion (including Slack follow-ups) return approval to `needs-owner-approval`. A new owner decision is required. Deleting the only approval revokes it. All this is covered by tests.

There is **no implementation, merge or deploy automation**. The monitor has only `contents: read` and `issues: write`; it checks out trusted `main`, does not run issue content, and ignores PR comment events. Customer text never becomes a shell command or agent instruction. AGENTS.md requires future implementers to verify owner approval for the current revision.

## Credentials and health

`MONITOR_TOKEN`: a random shared bridge secret in Cloudflare Worker secrets and GitHub Actions secrets. `FEEDBACK_URL`: a GitHub repository variable, not a secret. `GITHUB_TOKEN` is supplied ephemerally by Actions. Slack credentials, when available, go only into Cloudflare secrets.

Authenticated endpoints: `GET /api/internal/health` reports last successful scan and pending queue size; `GET /api/internal/pending` reads pending records; `/ack` and `/heartbeat` are POST-only. They require `Authorization: Bearer <MONITOR_TOKEN>`. Do not put the token in a URL, source file or logs. `/api/status` is public and reports configuration only, not Slack delivery health.

Pending events are retained until delivered; delivered receipts persist to preserve replay deduplication. GitHub retains submitted feedback. No automatic deletion or retention policy is assumed; review retention before expanding beyond the pilot.

## Sources

- [GitHub workflow events and schedules](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)
- [Slack signed request verification](https://docs.slack.dev/authentication/verifying-requests-from-slack/)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)
