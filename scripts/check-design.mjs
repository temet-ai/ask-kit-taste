export const meta = {
  purpose:
    "A design file (HTML, CSS or SVG) or a list of colour values against the recorded visual verdicts, reading source only: teal and red hues, red or orange next to green (a colour-vision verdict, when the file holds one), a white background behind images on a dark page, headings far above body size, pill shapes, decorative glyphs, chevrons by name, Japanese text. Each hit has the line, the span and the verdict it runs into. A rule reports a hit only when the taste file holds a verdict on its topic; the rest are counted in notRecorded. It cannot see the render or any picture and says what needs a reviewer who can see.",
  params: { file: "path of an HTML, CSS or SVG file", colors: "a list of colour values (hex, rgb, hsl, oklch, basic names), instead of a file", text: "markup or CSS as text, instead of a file" },
  returns: "{file, colorsFound, colours, hits, byRule, shown, cut, results:[{line, span, rule, confidence, verdict:{at, section, date, quote}, note}], colourRule, cannotSee, needs}",
  example: 'await scripts.run("check-design", { file: "site/style.css" })',
};

export default async function ({ taste }, { file, colors, text } = {}) {
  if (!file && !colors && text == null) throw new Error("give file, colors or text");
  return taste.checkDesign({ file, colors, text });
}
