The caller has a question it would otherwise put to the person whose taste file this is, about a written or visual preference:
would they accept this, what do they think of that.

1. `skills.read("answer-as-recorded")` and follow it.
2. Search first: `await scripts.run("about", { subject })` for each subject the question touches.
3. Answer from the recorded verdicts only, each with the quoted words and the date. If the question is about something the file
   does not hold, say "nothing recorded on that" and state the question in one line so the person can answer it quickly.
4. Say when an answer is an inference from a neighbouring verdict, and name that verdict. An inference is labelled as one.
5. Never approve. The answer is a check against what the person has recorded. A decision that is theirs, or an outward-facing or
   irreversible step, is for them.
