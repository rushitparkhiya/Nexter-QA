# Nexter regression pack — bugs that must never come back

Every previously-found/-fixed Nexter bug becomes a permanent assertion, so an
upgrade can never silently reintroduce it. Seeded from prior QA + the 4.7.0 changelog.
(Philosophy: `orbit-qa-regression-pack` — "every fixed bug needs a test.")

Tag each engine assertion with the ID below.

| ID | Area | The bug (source) | Assert after upgrade |
|---|---|---|---|
| NX-R01 | SEO / SSRF | Authenticated blind SSRF via the SEO **og:image** probe (Nexter SEO 4.7.0 final QA) | og:image URL fetch is host-validated / not a raw server-side probe |
| NX-R02 | SEO coexist | Schema + sitemap **don't defer to Yoast/RankMath** → double output (4.7.0 final QA) | with Yoast/RankMath active, no duplicate JSON-LD / no double sitemap |
| NX-R03 | Abilities | 4.6.15: **all** abilities failed to register (missing permission callback) | `wp_get_abilities()` count == baseline; all 26 present |
| NX-R04 | Security | 4.6.15: custom-login path stripped leading `/` → multi-segment paths broke | multi-segment custom login path still resolves |
| NX-R05 | Editor gate | 4.6.13: Disable-Gutenberg "Except On" / "All Post Types" didn't disable | selected post types get classic editor |
| NX-R06 | Snippets | 4.6.13: `wp_head` PHP snippet not loading on frontend | seeded wp_head snippet emits on frontend |
| NX-R07 | Snippets | 4.6.13: JS error selecting a field in Conditional Logic | no console error on conditional-logic field select |
| NX-R08 | Duplicator | 4.6.13: Elementor content not copied on duplicated pages | duplicated page keeps `_elementor_data` |
| NX-R09 | Image opt | 4.6.17: queue **reprocessed** already-optimized images | re-run queue does not touch done images (idempotent) |
| NX-R10 | Image opt | 4.6.17: >2560px "-scaled" images not served as WebP/AVIF | scaled image served as WebP/AVIF |
| NX-R11 | Security | 4.6.17: iFrame Security didn't send `X-Frame-Options` | header present when module ON |
| NX-R12 | Fonts | 4.6.17: Self-Host Google Fonts broke on fresh install (dir not created) | local fonts dir created on first use |
| NX-R13 | Fonts | 4.7.0: variable-font upload / Elementor register bug (just fixed) | variable font uploads + registers in Elementor |
| NX-R14 | Theme Builder | rewrite-rule flush needed for "Edit with Elementor" (4.6.16) | `nxt_builder` permalink works with no manual Permalinks save |
| NX-R15 | i18n | 4.6.14: missing text-domain in Dashboard / Snippets / Theme Builder | strings translate (text-domain present) |
| NX-R16 | Data | Content Fields dup-slug shadowing / group-key meta collision (Content Fields QA) | *if module ships:* no slug shadowing / meta collision |

## How to use
- Add each as a checked assertion in the core engine or a `@regression`-tagged spec.
- On every run, the report lists which NX-R* reproduced (a reappearance = **NO-GO**).
- When a new bug is found+fixed, append an NX-R## row here first, then the assertion.
