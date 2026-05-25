# Hash routing (`/#/path`) vs. history routing (`/path`) in SPAs

Hash routing means the route lives in the URL fragment (`https://app.com/#/users/42`). Everything after `#` is **client-only**: the browser never sends it to the server, so the SPA shell at `/` always loads and the framework reads `window.location.hash` to figure out which view to render.

## Pros of `/#/`

| Pro | Why it matters |
|---|---|
| **Zero server config** | The server only ever sees `/` (or whatever the SPA shell path is). No catch-all rewrite needed. Drop into S3, GitHub Pages, any static host, `file://`, an Electron `app://` shell, even an `<iframe>` — it just works. |
| **No "deep link 404" risk** | If a user bookmarks `https://app.com/#/dashboard` and your CDN config drifts, they still get the SPA. History routing returns 404 if the server isn't rewriting unknown paths to `index.html`. |
| **No back-end coordination needed** | Useful for prototypes, demos, embedded widgets where you don't control the host. |
| **Survives reverse-proxy / sub-path mounts trivially** | Mounting the SPA at `/admin/` and `/marketing/` on the same domain doesn't require per-mount rewrite rules. |
| **Doesn't trigger a full reload on rare proxies** | Some legacy proxies and CDNs interpret unknown paths in odd ways; hash routing sidesteps them entirely. |

## Cons of `/#/`

| Con | Why it matters |
|---|---|
| **Query strings inside the fragment are invisible to `URLSearchParams(window.location.search)`** | `/#/reset-password?token=XYZ` puts `?token=XYZ` *inside* the fragment, so `window.location.search` is empty. This is exactly the bug that broke the old forgot-password flow in this project — `URLSearchParams` returned nothing, the SPA couldn't read the token. You have to manually parse `window.location.hash` instead. |
| **Ugly URLs** | `https://app.com/#/users/42/orders/9` is noticeably worse than `https://app.com/users/42/orders/9` — and users notice. |
| **Anchor-link collisions** | The fragment is *also* the browser's "scroll to this element" mechanism. Routes and `#section` anchors can interfere. |
| **The server never sees the route** | No server-side logging of which paths users hit (analytics works, server logs don't). No server-side redirects (`/legacy/X` → `/new/X` has to happen client-side). No A/B testing at the edge. No `X-Forwarded-Path` based logic. |
| **SEO is weaker** | Google has rendered JS for years and can crawl hash-routed SPAs, but the canonical URL convention is path-based. Many crawlers, link unfurlers, and indexing pipelines still strip the fragment. Bing, DuckDuckGo, and most archive bots see only `/`. |
| **Social previews / Open Graph break** | Facebook, LinkedIn, Slack, Twitter, Discord all fetch the URL server-side to scrape OG tags. They strip the fragment before fetching. So `/#/article/42` shows the homepage's preview, never the article's. |
| **Email and SMS clients sometimes mishandle `#`** | Some legacy mail clients and SMS gateways URL-encode `#` as `%23`, breaking the link. Modern clients are fine, but you do see this in the wild. |
| **HTTP referrer header omits the fragment** | Outbound clicks from your SPA report only the path part — you can't tell on the destination side which page the user came from. |
| **PWA / service worker matching is awkward** | Cache rules and route precaching usually match on path, not fragment. You end up caching `/` for everything. |

## When hash routing is *the right call*

- A static demo, internal tool, or admin panel shipped via a CDN where you can't (or don't want to) configure rewrites.
- An embedded widget hosted inside someone else's page.
- Desktop apps via Electron / Tauri / WebView — there's no server to rewrite, and `file://` URLs make history routing painful.
- A chrome extension popup or options page.

## When to use history routing instead (the default for production user-facing apps)

- Anything users will share via link.
- Anything that needs Open Graph previews.
- Anything you care about SEO for.
- Anything that puts a token, ID, or query parameter in the URL — because `URLSearchParams(window.location.search)` is the universal way to read those, and **hash routing silently breaks it**.
- Anything where the server may need to redirect, A/B test, or rewrite based on path.

## What this project just did

The deleted forgot-password code emitted `/#/reset-password?token=...&email=...` (hash routing). The new code emits `{FRONTEND_BASE_URL}/reset-password?token=...` (history routing) — exactly because the existing frontend uses `next/navigation`'s `useSearchParams`, which reads `window.location.search`. With the `#`, the param would have been invisible and the entire flow would have been silently dead at the click-the-email step — which is what the diagnostic earlier flagged as the most likely user-facing bug.

**Rule of thumb**: use history routing by default. Reach for hash routing only when you genuinely can't control the server, and even then, **never put query parameters in a hash-routed URL** unless you also write a custom parser.
