export const meta = {
  purpose:
    "The parts of the taste file a pattern can test, run over a draft file or a text: the banned sentence shapes (X not Y, not just X, does what would otherwise take N, one X instead of many, announcing the next sentence, groups of three, short sentences for effect), slogan, count and Introducing titles, clickbait lines, Claude-speak words, unwarranted doubt about a tool or model, rules attributed to the person, Japanese text and decorative glyphs. Each hit has the line, the span and the verdict it runs into (the quote, the date, the section). A rule reports a hit only when the taste file holds a verdict on its topic; the rest are counted in notRecorded. The full prose lint is the writing kit.",
  params: { file: "path of a text, Markdown or HTML file", text: "the text itself, instead of a file" },
  returns: "{file, lines, words, hits, byRule, shown, cut, results:[{line, span, rule, confidence, verdict:{at, section, date, quote}}], deferred, cannotSee, colourNote?}",
  example: 'await scripts.run("check-text", { file: "README.md" })',
};

export default async function ({ taste }, { file, text } = {}) {
  if (!file && text == null) throw new Error("give file (a path) or text");
  return taste.checkText({ file, text });
}
