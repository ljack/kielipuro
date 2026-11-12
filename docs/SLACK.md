# Slack connection — prepared, not active

## Current state

No Slack app has been created or installed for Kielipuro. No real Slack event, acknowledgment or Sampsa test has been delivered. The application correctly reports that Slack is pending. The webhook rejects requests until configured.

Evidence: an older invitation from Sampsa names Alppimaja. The current browser session can create apps in Varoventtiili. These are different workspaces; the owner must identify the intended workspace and dedicated channel (a channel link is sufficient). Existing conversations and unsent drafts were left untouched.

## Exact remaining connection steps

1. Confirm the workspace and dedicated feedback channel. In [Slack apps](https://api.slack.com/apps), sign into that workspace if it is not listed. Have a workspace admin grant app installation access if needed.
2. Create from `slack/manifest.json`. The manifest contains the deployed URL. If Slack requires URL verification before creation, temporarily omit `settings.event_subscriptions`, create/install the app, configure its secrets below, then add the event subscription section and verify the URL. The webhook supports Slack's signed URL challenge.
3. Install the app with the manifest's scopes and invite `@Kielipuro` to that channel. `app_mentions:read`, `chat:write`, channel read/history scopes enable mention capture, thread replies and channel membership verification. If the channel is public, remove `groups:read`, `groups:history` and `message.groups` before installing to avoid unnecessary private-channel scopes.
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
