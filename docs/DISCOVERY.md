# Discovery and decisions — 2026-11-12

Inspected before selecting the project:

- `/Users/jarkko/_dev/hatoriohanso` contained the intake ticket and ownership marker, but no app, Git repository, package or naming commitment. It remains intact. Implementation is a separate project at `/Users/jarkko/_dev/kielipuro`.
- `/Users/jarkko/_dev/mybike`: npm, modern JavaScript modules, Node tests and a pinned Wrangler deployment to Cloudflare Workers. Its deployment guide distinguishes actual deployment from browser-local state and acceptance. Reused those conventions, not code, account restrictions or product features.
- `/Users/jarkko/_dev/ai-jestas/workers/watchdog/wrangler.jsonc`: existing Cloudflare Worker, D1 and scheduled monitoring conventions.
- `/Users/jarkko/_dev/jambau-sites`: Cloudflare experience in the local project inventory.
- `/Users/jarkko/_dev/slack-cheer-bot`: existing React/Vite frontend with a Supabase Slack gateway. Its local environment contains frontend Supabase configuration, not a reusable Slack bot token. It does not prove authorization for this app's workspace. No secrets or code were copied.
- Relevant local directory/package inventory and the authenticated owner's GitHub repository names revealed no existing language-learning app to extend.

Stack: buildless HTML/CSS/ES modules for the minimal app; a Worker for static assets and verified Slack ingestion; D1 for durable event receipts; GitHub Actions for issue triage. This keeps deployment small and avoids a database for demo progress or unnecessary authentication. The monitor uses short-lived `GITHUB_TOKEN`; the Worker has no GitHub personal access token.

Repository is public so testers can submit issues without a separate collaborator invitation. Both the app and Slack manifest disclose that feedback is public. Slack starts capture only on an explicit bot mention in one configured channel; all later human messages in that enrolled thread are collected. Do not connect a general/private conversation without explaining this behavior.

Historic email evidence pointed to Alppimaja. The owner subsequently supplied a Varoventtiili DM link, confirming workspace `T0429EB246T`. The supplied destination is an existing one-to-one human DM (`D0433HZ6S1F`), which a bot cannot join. A dedicated public `#kielipuro-palaute` channel is prepared as the proposed replacement. Bot installation/access approval is pending. No existing Slack conversation or draft was changed; only the hiragana/katakana feedback explicitly forwarded by the owner was recorded in issue #3 with source links.
