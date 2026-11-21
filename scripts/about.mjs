export const meta = {
  purpose:
    "What the taste file says about a subject: the recorded verdicts, ranked, each with section, date, the quoted words and path:line. found: false means nothing is recorded on that subject; say so and give no verdict. kind narrows to what is rejected or what is accepted.",
  params: { subject: "plain words: titles, teal, glyphs, tables, video clips, guides, logos, density, claims", kind: "rejects, accepts, rule or voice, optional", max: "default 12" },
  returns: "{subject, found, matches, shown, terms, alsoMatched, file, results:[{at, line, section, kind, date, dates, quotes, text, forms?, score}], note?}",
  example: 'await scripts.run("about", { subject: "teal" })',
};

export default async function ({ taste }, { subject, kind, max = 12 } = {}) {
  if (!subject) throw new Error("give subject: plain words such as titles, teal, glyphs");
  return taste.about(String(subject), { kind, max });
}
