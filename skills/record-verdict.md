Add a new verdict to the taste file in its form

This changes the file; it works only when the caller asked for a change (`act: true`).

1. You need three things from the caller: their exact words as typed, the date they said them (YYYY-MM-DD), and what they
   were about. If any is missing, say which and write nothing. A paraphrase is not recorded.
2. Find the section: `taste.sections()` lists them. Pick the section whose heading fits (for example a list of rejected written
   work, rejected visual work, accepted work, corrections about claims, or rules about motion or clips). Only a section with
   `hasList: true` takes an entry.
3. Check it is not there already: `await scripts.run("about", { subject })`. The script also refuses words the file holds.
4. `await scripts.run("add", { section, lead, words, date })`. `lead` is the subject and place in a few words ("Guild landing
   copy"). Do not write a reason or a rule of your own into it; the file holds their words.
5. Answer with `atLine`, the section, the inserted lines and the backup path. Then `await scripts.run("about", { subject })` to
   show the verdict is found.
