Answer a question that would otherwise go to the person, from the recorded verdicts only

This is the discipline of a stand-in agent, reduced to what the taste file holds: search first, cite, say when it is an inference,
never approve.

1. Name the subjects in the question (a colour, a title, a clip, a layout, a claim). Run
   `await scripts.run("about", { subject })` for each one. For "what was recorded last", use `timeline`.
2. For each verdict that bears on the question, write: the quoted words, the date, the section, and `at`. The quote and the date
   come from the result; copy them.
3. Give the answer in one or two sentences, in plain words, before the evidence.
4. When `found` is false, the answer is "nothing recorded on that". Add the question in one line that the person could answer quickly.
   Do not extrapolate from their general taste. If a neighbouring verdict is close, name it with its quote and label it
   "a neighbour, not about this".
5. Label each statement as one of: recorded (their words in the file), inferred (your reading of a recorded verdict, name it) or
   nothing recorded.
6. Never state a reason, feeling or decision for the person that the file does not hold. Never write that they decided
   something unless a quote says so.
7. If the file holds nothing and the question is about what they typed and a session-history kit such as mike is installed, you may ask
   `await ask.kit("mike", "what did the person type about <subject>?")`. Report it as from the person's history, with the session and turn ids,
   and not as a recorded verdict.
8. Never approve. End with: "This is a check against what the person has recorded, not their approval." A decision that is theirs stays theirs.
