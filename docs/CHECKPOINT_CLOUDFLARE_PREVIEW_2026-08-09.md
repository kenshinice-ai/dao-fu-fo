# Cloudflare Preview Checkpoint｜2026-08-09

> 用途：供线上测试与复盘；不是 production 发布，也不是 Public RC 内容发布。

## Deployment

- Project: `dao-ru-fo-digital-museum`
- Production branch configured in Pages: `main`
- Preview branch: `first-public-rc`
- Stable preview alias: <https://first-public-rc.dao-ru-fo-digital-museum.pages.dev>
- Unique deployment URL: <https://b73334f3.dao-ru-fo-digital-museum.pages.dev>
- Deployment ID: `b73334f3-8a8c-44a4-96db-724f923da486`
- Git commit: `cafc52fdbc89bffb21f5c250fd022134d80cb093`
- Wrangler: `4.120.0`
- Deploy tree: clean

## Artifact

- Release stage: `first-viewable-prototype`
- Content version: `2026.08.prototype.1`
- Dist files: 35
- Dist bytes: 557056
- `index.html` SHA-256: `cae3705f971abf821fd23e76d684abbb98911572c4afbad0a22162e46f506e47`
- App JS SHA-256: `4bcb4e55f239d79eecab763cb27c64afc22ffb26246580ebb31b186ce7e7a223`
- CSS SHA-256: `d8b1e8baea895f64a18efac8a6009e24452d2929d6c77b9a05ad77a06b23f5bc`
- Content manifest SHA-256: `edda6d13bd1da2581c8ce9c17ce6c171e32893f695fadcdcf04d9bc7f873166d`

## Verification

- Repository release gates: passed during `deploy/cloudflare-pages.sh preview first-public-rc`
- Online HTTP smoke: 23/23 passed
- Verified online routes: `/`, `/museum/changan-three-traditions`, `/figures/xuanzang`, `/passages/form-is-emptiness`
- Verified static splits: English profile, manifest, map GeoJSON, fingerprinted app asset
- Browser acceptance: homepage loaded; Xuanzang detail loaded; no console error/warn observed

## Boundary and next work

- The Preview serves the existing first-viewable prototype under `apps/museum-web/public/data/v2`.
- The Public RC remains `planning`; latest RC report is 29 blockers / 27 warnings.
- Do not promote Preview to production until Preview review, production release evidence and production smoke are complete.
- Continue Public RC source, rights, bilingual and review checks; only then connect the compiler Public artifact to the public release path.
