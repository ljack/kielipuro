# Deployment

- App: https://kielipuro.jarkko-lietolahti.workers.dev
- GitHub: https://github.com/ljack/kielipuro (public)
- Local project: `/Users/jarkko/_dev/kielipuro`
- Worker: `kielipuro`, Jarkko's existing Cloudflare account.
- D1: `kielipuro-feedback`, region EEUR, dedicated to Slack delivery receipts and monitor heartbeat.
- Assets: `public/`, served by the Worker with CSP and other response headers.
- `workers.dev` is enabled; preview URLs are disabled. No custom domain is configured.

Initial migration was applied remotely with Wrangler. The standalone Cloudflare account session already existed; no account/token was copied into the repo. `MONITOR_TOKEN` is shared only between GitHub Actions secrets and the Worker secret store. The Worker has no GitHub PAT. Slack is deliberately unconfigured pending the intended workspace/channel and installation.

```sh
npm ci
npm test
npm run build
npx wrangler d1 migrations apply kielipuro-feedback --remote
npm run deploy
```

Deploy only when authorized; Git pushes do not publish. Deployment secrets survive normal Wrangler publishes, but verify bindings after changes. Use `npx wrangler deployments list` for deployed versions and Wrangler rollback if needed. D1 migrations are independent of Worker rollback; do not assume rolling back code reverses schema changes.

Demo completion is localStorage only, per browser/origin. There are no user accounts, paid services, analytics, course progress records or personal learning profiles in this release. Feedback becomes public only when submitted on GitHub, or explicitly sent to the configured Slack feedback bot once connected.
