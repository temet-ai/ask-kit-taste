Check a finished or planned piece of work against the recorded verdicts before it is shown, and return PASS or REVISE

This is the text-model version of a reviewer agent's method. You read text and source and cannot look at images or
a rendered page.

1. Read what the work is for and who sees it, from the request. Read the work itself, all of it: a file with `repo.read` or the
   text you were given. If it describes something (a post about a project, a README), read the source it describes too, and
   note every claim, number and name you can compare with it. The file's rule: every claim must match the source.
2. Run the mechanical checks.
   - Written work: `await scripts.run("check-text", { file })`.
   - HTML, CSS or SVG: `await scripts.run("check-design", { file })`. For colours only: `{ colors: ["#0d9488", ...] }`.
3. Look up each subject the work touches with `await scripts.run("about", { subject })`. Typical subjects: titles and headings,
   taglines, claims and numbers, guides, colour, glyphs, tables, density, logos, motion and clips, voice. Run it for every one
   the work contains, and read the verdicts against the work.
4. For a piece of work that has a shape (a post, a guide, a logo, a clip, a page), run `await scripts.run("shape", { kind })`
   and say which of its questions the work leaves open.
5. Read each `candidate` hit at its line and decide whether it is the form the file names. Drop the ones that are ordinary
   sentences and say how many you dropped.
6. Return:
   - `VERDICT: PASS` or `VERDICT: REVISE`. REVISE when any hit is real, when a claim does not match its source, or when a
     recorded verdict is run into. PASS means nothing recorded was found in what could be tested; it is not the person's approval.
   - Findings, most serious first, at most fifteen. Each: where (file and line, or the sentence), what is wrong, the verdict it
     runs into with the quote and its date and `at`, and what to change. For a sentence, say to cut it or give a plain
     replacement.
   - The claims you compared with the source and found correct, one line each.
   - What could not be checked: the look of anything visual (needs the a reviewer agent that can view images, or the person), the prose a pattern
     cannot test (point to the writing kit), anything whose source you could not read.
7. Never report a finding that no recorded verdict backs. A general style opinion is not a finding. If the file holds nothing on
   a subject the work touches, say "nothing recorded on <subject>".
