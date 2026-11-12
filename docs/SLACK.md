# Slack connection — prepared, not active

## Current state

No Slack app has been created or installed for Kielipuro. No real Slack event, acknowledgment or Sampsa test has been delivered. The application correctly reports that Slack is pending. The webhook rejects requests until configured.

The owner confirmed workspace **Varoventtiili**, ID `T0429EB246T`, by supplying https://app.slack.com/client/T0429EB246T/D0433HZ6S1F. This is the existing human-to-human DM with Sampsa; a bot cannot join it. A dedicated public **#kielipuro-palaute** channel is proposed. Browser app setup is accessible. The bot manifest and permissions are prepared; creating/installing the app awaits the required confirmation for new access. Existing conversations and unsent drafts were left untouched.

## Exact remaining connection steps

1. Approve bot installation and the dedicated public feedback channel. In [Slack apps](https://api.slack.com/apps), choose **Varoventtiili**. Have a workspace admin grant app installation access if needed. The prepared bot requests exactly `app_mentions:read`, `channels:history`, `channels:read`, `chat:write`; no DM/private-channel scopes.
2. Create from `slack/bootstrap-manifest.json`, which omits events until the signing secret exists. Create/install the app, configure its secrets below, then apply the full `slack/manifest.json` event section and verify the deployed URL. The webhook supports Slack's signed URL challenge.
3. Create `#kielipuro-palaute`, invite Sampsa and `@Kielipuro`, and set the channel purpose to explain public GitHub mirroring. Channel membership limits the Slack bot token's read access; the Worker additionally enforces this exact channel ID.
4. From the project directory run `python3 scripts/connect-slack.py`. Enter the Bot User OAuth Token and Signing Secret at its hidden prompts, and the App ID and channel ID at ordinary prompts. The script calls `auth.test` and `conversations.info`, verifies bot membership and displays the exact workspace/channel. After confirming it stores all values with `wrangler secret bulk` via stdin. No local credential file is created. Never paste secrets into an issue or chat.
5. Enable and verify Event Subscriptions at `https://kielipuro.jarkko-lietolahti.workers.dev/api/slack/events`, using the manifest events. Keep Socket Mode off. The server verifies HMAC, a five-minute timestamp window, app ID, team and configured channel, and ignores bots and message-edit events.

## Sampsa's feedback flow

Use a dedicated channel whose purpose states **messages in bot-mentioned threads are copied to public GitHub issues**. Do not mention the bot in sensitive discussions.

```text
@Kielipuro Idea: vastausvaihtoehtojen teksti voisi olla suurempi.
```

The first explicit mention enrolls that thread. After the next monitor run, the bot replies with the GitHub issue. Continue in the same thread to refine the idea; follow-ups become comments with source links. No separate advanced course is created from a tester's experience. Bot replies never feed back into the queue. Unrelated channel messages and unmentioned threads are ignored; old channel history is not harvested. Slack message edits/deletions are not mirrored—send a new clarification or request deletion of the copied content.

This is a deterministic feedback bot, not a conversational AI tutor. Sampsa and the owner iterate in the thread; the bot records their contributions and links the backlog. It does not promise or implement a feature.

## Live verification once connected

1. Post one clearly marked synthetic test mention in the approved channel.
2. Trigger `gh workflow run feedback.yml --repo ljack/kielipuro`, or wait for the schedule.
3. Confirm exactly one issue labelled `source:slack` and `needs-owner-approval`, with a working original-message link, and a Slack acknowledgment linking back.
4. Reply in the same thread. Run the monitor again. Confirm one comment on the same issue, not a second issue.
5. Repeat the same idea in a new mentioned thread. Confirm a source-link comment on the canonical issue, not a duplicate issue.
6. Close test issues, record the run/issue/message links in VERIFICATION.md, and replace this document's connection status only after observing delivery.

Local automated tests already cover signatures, stale requests, workspace/channel isolation, durable retry deduplication and thread enrollment. They do not prove a real Slack installation.

The owner's forwarded hiragana/katakana suggestion is already captured as [issue #3](https://github.com/ljack/kielipuro/issues/3) with the two original Slack message links. This manual capture is explicitly distinguished from the pending live integration.
