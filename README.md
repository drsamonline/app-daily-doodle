# Daily Doodle

One drawing prompt a day. The drawing is kept; **the streak counts only the days you actually drew.**

- **Demo:** https://drsamonline.github.io/app-daily-doodle/play/index.html
- **Landing page:** https://drsamonline.github.io/app-daily-doodle/
- **Release:** https://github.com/drsamonline/app-daily-doodle/releases/tag/app-latest
- **Plan row:** #29 of 37 in `drsamonline/forge` → `QUEUE/PLAN.json`
- **Specs absorbed:** `app-daily-doodle` (lead)
- **Licence:** PolyForm Noncommercial 1.0.0
- **Sponsor:** [github.com/sponsors/drsamonline](https://github.com/sponsors/drsamonline) — free, offline, no account

## Status

| | |
|---|---|
| **Built** | A prompt a day derived from the date; a pad; one doodle per date with a confirmation before replacing; yesterday one tap away; a streak of days actually drawn; a share card; export. |
| **Release** | Windows EXE, Android APK and Linux binary, built from this source by `app-builder` in CI. |
| **Not built** | **A global reveal and accounts.** There is no server, so the prompt is derived from the date instead — every copy agrees without talking to anything. |
| **Untested** | Whether a daily prompt actually keeps anyone drawing. The rules are exact and tested; the habit is not. |

## The spec's "done means", counted

| The spec says | The test |
|---|---|
| a doodle saved today is still there after a reload | `serialize` → `parseState`, strokes and prompt intact |
| yesterday's is **1** tap away | `previous()` returns the last drawn day, with `gapDays` |
| two doodles on the same date cannot both be kept | second is refused with `needsConfirm`, and only a `replace: true` save goes through |
| a day with no doodle shows as a gap | the streak stops at the gap and the gap day is absent from its days |
| the streak equals consecutive days actually drawn | 2 with a gap, 4 once the gap is drawn, and 0 with nothing |

## The rule that had a bug, caught by a probe

My first `gapToday` was computed from the day *after* the streak's last drawn day — which is true when the
gap is old and false when it is today. It now asks the only question that matters: **has today been drawn?**
The test that catches it draws two days, then asks for the streak on the *next* day.

## What it will not do

- **Rank the drawings** — no score, vote, rating or gallery order.
- **Fill a gap with the nearest drawing.**
- **Keep two doodles for one date** without you saying so.
- **Start an empty book over a broken one.**
- **Use the internet.**

## When things go wrong

| Case | Behaviour |
|---|---|
| **Bad input** | No strokes → refused, even with `replace: true`; a bad date → refused. |
| **No network** | Nothing changes. |
| **Storage full or unavailable** | **NOT SAVED**, drawing unchanged on screen. |
| **Corrupt saved state** | Reported and offered for export, never replaced with an empty book. |

## Tests

```bash
npm test                      # all three suites
node tests/self-tests.js      # engine — 51 assertions
node tests/ui-tests.js        # the page in jsdom — 18 assertions
node tests/page-smoke.js      # every local src/href resolves, nothing off-origin
```

Mutation-tested six ways on 26/11/2026, all red: two doodles on one date (3 failures), today never a gap
(1), `previous` not restricted to earlier days (3), a broken book starting empty (4), a share card carrying
a rank (1), and a stroke-less doodle accepted (2).

**One mutation hung the suite** — my replacement loop had no exit condition, and a hanging test run looks
exactly like a slow one. It cost a killed command and a restore from backup; the later runs carry hard
`timeout` wrappers.

## Layout

```
docs/index.html            landing page
docs/play/index.html       the app — the prompt, the pad, the streak, the card
docs/play/app.js           DOM wiring: drawing, save with confirmation, streak, card, export
docs/play/doodle-core.js   the engine — prompts, one-per-day, previous, streak, card, storage
docs/play/web-kit.js       vendored kit (unmodified)
docs/play/export-kit.js    vendored kit (unmodified)
tests/self-tests.js        engine suite (51)
tests/ui-tests.js          page suite (18, jsdom with a canvas stub)
tests/page-smoke.js        shape on disk
PAGES.json                 landing = docs/index.html, app = docs/play/index.html
```

## Where the spec was silent, and what was chosen

- **Refused, not replaced, by default.** The spec allows either; losing a drawing should take a decision, so the second save asks.
- **A doodle is strokes, not an image.** A book stays small and the drawing stays reproducible.
- **The prompt is derived from the date**, so every copy agrees without a server — which is how a "global reveal" works with no cloud.
- **The streak ends at the most recent drawn day** when today is empty, and `gapToday` says so. It is neither zero nor counted through the gap.
- **The share card has no rank on it**, because the spec forbids ranking and a card is the thing that would leak it.

## What is not built, and why

**A global reveal, accounts, and a gallery.** All three need a server, and a server would be the one thing
this app cannot have. What ships is the part that works alone: a prompt, a drawing, a streak, a card.
