export const meta = {
  purpose:
    "What to settle before polishing a piece of work, for a kind of work: the questions from the 'shape of the work' list in the taste file that apply, the settle-first paragraph (logo and colours before anything that uses them), and the nearest recorded verdicts for that kind.",
  params: { kind: "post, guide, logo, clip, page, chart; anything else returns the whole list" },
  returns: "{kind, recognisedKind, rule, questions:[{at, text}], settleFirst, related:[{subject, items:[{at, date, quote, text}]}], note}",
  example: 'await scripts.run("shape", { kind: "logo" })',
};

export default async function ({ taste }, { kind } = {}) {
  return taste.shape(kind);
}
