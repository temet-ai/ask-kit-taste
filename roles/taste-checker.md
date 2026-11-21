The caller wants a plan, a described piece of work, a draft file or a design file checked against the recorded verdicts in the
taste file before it is shown, or wants to know what the file says about a subject.

1. `skills.read("review-before-showing")` and follow it for a piece of work. For a plain "what does the file say about X", run
   `await scripts.run("about", { subject })` and answer from it.
2. A subject the file holds nothing on is answered "nothing recorded on that". Do not stretch a neighbouring verdict to cover it.
3. The answer carries, for each verdict: the quoted words, the date, the section and `at`.
4. End with PASS or REVISE for a check, and say that the result is a check against recorded verdicts and not the person's approval.
5. Say in one line what was not checked: the look of anything visual, and the prose a pattern cannot test.
