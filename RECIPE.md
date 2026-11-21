# Recipe: taste kit

## What it answers

What a person has recorded as rejected and accepted in written and visual work, from one Markdown taste file: the verdicts on a
subject with their quoted words and dates, which verdicts a plan, a text or a design file runs into, what to settle before
polishing, and whether anything is recorded at all. It appends a verdict when asked and given the exact words.

## What it needs

- `node` (the kit's host). No other program, no keys.
- The taste file, named by the required `TASTE_FILE` setting.

## What it reads and runs

- Reads the taste file, and the one draft or design file a check names. Runs no program.
- `taste.add` is the only call that writes: it needs `act`, the exact words and a date, and it copies the file to
  `<file>.bak-<timestamp>` first. The manifest lists it in `acts` as `taste.add`.

## Rebuild it from an empty folder

Write `ask-kit.toml` with one `module` source named `taste` (`taste.mjs` and `api.d.ts`), a required `TASTE_FILE` setting, and `acts = ["taste.add ..."]`.

`taste.mjs` exports `make({settings, push, cwd, act})`. It parses the file by its headings (`##`, `###`) into items: a top-level
bullet or paragraph is one item, its sub-bullets are `forms`, a blockquote is a voice sample. Each item holds its section path,
kind (`rejects` and `accepts` from the section names, `voice`, otherwise `rule`), every date in it, every double-quoted span,
and its line number. `about(subject)` matches the subject's words and, at a lower weight and capped, the file's own words for the
same thing (title, heading, tagline, slogan; teal, colour, red, green; glyph, diamond, chevron, pill). It returns `found: false`
with the words "nothing recorded on that" when no item matches. `timeline`, `shape` and `add` work on the same items.

`checks.mjs` holds the checks. Each rule is a pattern plus an anchor: a regex of topic words that finds the verdict in the taste file at run
time, so the quote, date and section in a hit always come from the file and are never written in the kit. A rule whose topic the
file does not mention reports no hit; the checks count it under `notRecorded`. Text rules cover the
sentence shapes the file lists, titles, Japanese text and glyphs. Design rules read colours (hex, rgb, hsl, oklch, basic names,
Tailwind colour classes) and classify them by hue, then check red or orange with green in one rule, a white background behind
images on a dark page, heading size against body size, pill shapes, glyphs and chevron names. Both checks list what they cannot see.

Scripts: `about`, `check-text`, `check-design`, `shape`, `timeline`, `add`. Skills: `review-before-showing`,
`answer-as-recorded`, `record-verdict`. Roles: `taste-checker`, `stand-in`.

## Bench

`bench/fixture/taste.md` is an invented taste file (Granny Weatherwax of the Lancre Gazette). Run the bench with
`TASTE_FILE=bench/fixture/taste.md ask-kit kit test taste`. `bench/questions.json`: six questions of the kinds a reviewer or
stand-in agent is asked (what the file says about teal, titles, diamond glyphs, colour for pass and fail, a result video, and a
subject with nothing recorded), and two script runs.
