# Kielipuro

Japania pienin askelin, suomeksi. A setup-first language-learning pilot for Finnish-speaking beginners.

- **App:** https://kielipuro.jarkko-lietolahti.workers.dev
- **Repository:** https://github.com/ljack/kielipuro
- **Review backlog:** https://github.com/ljack/kielipuro/issues?q=is%3Aissue+is%3Aopen+label%3Aneeds-owner-approval
- **Monitor runs:** https://github.com/ljack/kielipuro/actions/workflows/feedback.yml

The initial app has one explicitly labelled interaction demonstration, browser-local completion and a Finnish feedback form that opens a prefilled public GitHub issue. It does not define a curriculum. Japanese is the first learning language; course content and scope are open decisions. Sampsa's moderate Japanese and multilingual experience are useful tester context, not a separate advanced course.

## Local development

Node 22 or newer, npm, and Cloudflare account access for deployment.

```sh
npm ci
npx wrangler d1 migrations apply kielipuro-feedback --local
npm run dev
npm test
npm run build
```

`npm run build` performs a deploy-free Worker compilation check. Static assets are served directly; no frontend bundler or runtime framework is required. `npm run deploy` publishes to the existing Cloudflare Worker when authorized. Git pushes run checks but **do not deploy**.

## Feedback and approval

GitHub Actions runs on issue changes/comments and at minutes 7, 22, 37 and 52 of every hour (UTC). It classifies feedback, links exact duplicates and keeps owner decisions visible. It never implements requests. See [feedback operations](docs/FEEDBACK.md), [Slack connection](docs/SLACK.md), [deployment](docs/DEPLOYMENT.md) and [verification](docs/VERIFICATION.md).

## Original assets and name

The stream mark in `public/mark.svg`, interface and copy were created for this project. There are no copied Duolingo assets, third-party image downloads, external fonts or analytics. Kielipuro is the recommended working name. See [name and domain checks](docs/NAMING.md); no domain has been bought.
