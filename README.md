# ask-kit-taste

An [ask-kit](https://github.com/temet-ai/ask-kit) kit that lets your coding agent's `ask` tool answer from a taste or style file: a
Markdown file of what you have said you reject and accept in written and visual work, with your own words and the date. It
returns the recorded verdicts on a subject, and checks a plan, a draft text or an HTML, CSS or SVG file against them, so the
agent does not load the whole file into its context. You point the `TASTE_FILE` setting at your file. The kit's fixture is a
short invented file, `bench/fixture/taste.md`, that shows the layout it reads.

Questions from its bench, of the kinds a session puts to a reviewer or stand-in agent:

- What has the file recorded about teal? Give the words and the date.
- Would a diamond glyph be accepted as an output marker in a terminal clip?
- A session wants a video to show a result. What does the file say about clips like that?

It reports the file and nothing else. Every verdict it returns carries the quoted words and the date from the file. It does not
add a reason or a decision the file does not hold, and where the file holds nothing on a subject it says "nothing
recorded on that". Its answer is a check against recorded verdicts and is not the person's approval.

## Install

You need [ask-kit](https://github.com/temet-ai/ask-kit#set-it-up) and a taste file. The `TASTE_FILE` setting names it; there is no
default. The kit finds items by headings and bullets: sections such as "What I reject" and "What I have accepted", bullets
starting with a date (`- 2026-11-12, subject: "your words"`), and an optional "The shape of the work" section.

Paste this into your agent:

```
Read ~/.config/ask-kit/AGENTS.md, then add this kit: github.com/temet-ai/ask-kit-taste
```

Or run it yourself:

```sh
ask-kit kit install temet-ai/ask-kit-taste        # shows what it reads, changes and runs
ask-kit kit install temet-ai/ask-kit-taste --yes  # installs and enables it
```

Restart your agents so `ask` lists `taste`.

## What it carries

| | |
|---|---|
| Scripts | `about` (verdicts on a subject: section, date, quotes, path:line; `kind` narrows to rejects or accepts), `check-text` (the rules a pattern can test, over a text or file), `check-design` (HTML, CSS, SVG or a list of colours), `shape` (what to settle first for a kind of work), `timeline` (verdicts newest first), `add` (records a verdict) |
| Skills | `review-before-showing` (a PASS or REVISE check of a piece of work on recorded verdicts), `answer-as-recorded` (answering as a stand-in from what is recorded), `record-verdict` |
| Roles | `taste-checker` for checking work against the file; `stand-in` for questions that would otherwise go to the person |

Each script also runs with no model: `ask-kit run taste about subject=teal`, or `ask(do: "taste.about", params: { subject: "teal" })`.

`check-text` tests what the file's own lists name: the sentence shapes ("X, not Y", "not just X", "does what would otherwise take
N", groups of three, short sentences for effect, a sentence that announces the next), slogan, count and "Introducing" titles,
clickbait lines, Claude-speak words, unwarranted doubt about a tool or model, rules attributed to the person, Japanese text and decorative
glyphs. Each hit has its line, the span and the verdict it runs into. The full prose lint is the writing kit.

`check-design` reads source: teal and red hues, red or orange next to green (and any colour found is reported with the file's verdict on colour vision, when it holds one), a white background behind images on a dark page, headings far above body size,
pill shapes, decorative glyphs, chevrons by name and Japanese text. It does not look at images or a rendered page. How a
design looks needs a reviewer that can see, such as a reviewer agent that can view images.

When the taste file holds nothing on a subject, the investigator may ask a session-history kit such as `mike` what the person typed about it. That comes
back labelled as from their history, with session and turn ids, and is kept apart from a recorded verdict.

## What it can change

`add` appends a verdict to a section's list in the taste file, in the file's form (`- <date>, <lead>: "<their words>"`), after
writing a backup next to the file (`<file>.bak-<timestamp>`). It needs their exact words and a date, refuses without either,
refuses words the file already holds, and works only when the caller asked for a change (`act: true`). No other call writes.
Run from the shell, `ask-kit run taste add` is the caller asking for a change; point `TASTE_FILE` at a copy to try it.

The kit reads one file and sends what it reads to the investigator's model. It reads no other file except the draft or design
file it is asked to check.

## How well it works

`bench/questions.json` holds six questions and two script runs, each with patterns the answer must hold. The two script runs and
the patterns were checked against the file as it stands on 2026-11-20. It has not been run on a model yet; `ask-kit kit test taste`
runs it.
