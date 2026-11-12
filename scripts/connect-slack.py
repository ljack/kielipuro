#!/usr/bin/env python3
"""Install a bot's credentials into Worker secrets without files, argv or logs."""
import getpass
import json
import re
import subprocess
import urllib.request
from urllib.parse import urlparse

def slack(method, token, data=None):
    request = urllib.request.Request('https://slack.com/api/' + method, data=json.dumps(data or {}).encode(), headers={'Authorization': 'Bearer '+token, 'Content-Type':'application/json'})
    with urllib.request.urlopen(request, timeout=20) as response:
        result = json.load(response)
    if not result.get('ok'):
        raise SystemExit('Slack verification failed: '+result.get('error', 'unknown'))
    return result

token = getpass.getpass('Bot User OAuth Token (hidden): ')
secret = getpass.getpass('Signing Secret (hidden): ')
app_id = input('Slack App ID: ').strip()
channel_id = input('Dedicated feedback channel ID: ').strip()
if not token.startswith('xoxb-') or not secret or not re.fullmatch(r'A[A-Z0-9]+', app_id) or not re.fullmatch(r'[CG][A-Z0-9]+', channel_id):
    raise SystemExit('Invalid token, secret, app or channel identifier.')
identity = slack('auth.test', token)
channel = slack('conversations.info', token, {'channel': channel_id})['channel']
if not channel.get('is_member'):
    raise SystemExit('Invite @Kielipuro to the chosen channel first, then rerun.')
domain = urlparse(identity['url']).hostname
if not domain.endswith('.slack.com'):
    raise SystemExit('Unexpected workspace URL.')
print('Verified workspace:', identity['team'], '| channel:', channel['name'])
print('Only mentioned threads in this channel will be copied to PUBLIC GitHub issues, including their follow-ups.')
if input('Type CONNECT to configure this exact workspace and channel: ') != 'CONNECT':
    raise SystemExit('No changes made.')
values = {'SLACK_BOT_TOKEN': token, 'SLACK_SIGNING_SECRET': secret, 'SLACK_TEAM_ID': identity['team_id'], 'SLACK_CHANNEL_ID': channel_id, 'SLACK_APP_ID': app_id, 'SLACK_BOT_USER_ID': identity['user_id'], 'SLACK_WORKSPACE_DOMAIN': domain.removesuffix('.slack.com')}
subprocess.run(['npx','wrangler','secret','bulk'], input=json.dumps(values).encode(), check=True)
print('Secrets stored. Enable/verify the Events API URL, then run the documented Slack end-to-end test. Configuration alone is not proof of delivery.')
