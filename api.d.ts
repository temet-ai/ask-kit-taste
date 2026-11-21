interface Verdict {
  at: string;            // "~/notes/taste.md:129": file and line of the item
  line: number;
  section: string;       // "Visual work > What they reject", "Writing > What they have accepted", "Motion and video", "The shape of the work" ...
  kind: "rejects" | "accepts" | "rule" | "voice"; // rule: the section is neither a rejects nor an accepts list
  date: string | null;   // the latest date in the item, YYYY-MM-DD; null when the file gives none
  dates: string[];       // every date in the item, newest first
  quotes: string[];      // every double-quoted span in the item, verbatim. Mostly their words; a quoted title or slogan being rejected is also quoted, so read `text`
  text: string;          // the item as the file has it (one line)
  forms?: string[];      // the sub-bullets of the item (the forms of an AI tell)
  score?: number; matched?: string[];
}
interface VerdictRef { at: string | null; section?: string; date?: string | null; quote?: string | null; hasQuote?: boolean; form?: string; note?: string }
interface Hit { line: number | null; span: string; rule: string; confidence: string; verdict?: VerdictRef; also?: VerdictRef; note?: string; where?: string; context?: string; inCode?: boolean }

declare const taste: {
  file: string;   // the taste file being read (the TASTE_FILE setting)
  act: boolean;   // true when this ask may change things

  // Every parsed item of the file, in file order.
  items(): Verdict[];
  // The file's sections with line ranges and item counts; hasList says whether `add` can append to it.
  sections(): { path: string; heading: number | null; lines: [number, number]; items: number; hasList: boolean }[];

  // What the file says about a subject, ranked. subject: plain words ("titles", "teal", "glyphs", "tables", "video clips", "guides").
  // The file's own words for the same thing are matched too (title: heading, tagline, slogan; teal: colour, red, green ...).
  // kind narrows to "rejects" or "accepts". found: false means NOTHING IS RECORDED on that: say so, never infer a verdict.
  // Report every verdict with its quote and date from the result; a paraphrase without the quote is not allowed.
  about(subject: string, o?: { kind?: "rejects" | "accepts" | "rule" | "voice"; max?: number }):
    { subject: string; file: string; fileModified: string; items: number; terms: string[]; alsoMatched: string[]; found: boolean; matches: number; shown?: number; results: Verdict[]; note?: string };

  // Dated verdicts, newest first, one event per date. subject, section (substring), kind, since/until (YYYY-MM-DD) narrow it.
  timeline(o?: { subject?: string; section?: string; kind?: string; since?: string; until?: string; max?: number }):
    { file: string; subject: string | null; events: number; shown: number; undatedItems: number; results: { date: string; at: string; section: string; kind: string; quotes: string[]; text: string }[]; note: string };

  // The file's "shape of the work" questions, narrowed to a kind of work (post, guide, logo, clip, page, chart), with the
  // settle-first paragraph and the nearest verdicts for that kind. The questions are the file's, nothing is added.
  shape(kind?: string): { kind: string | null; recognisedKind: boolean; rule: { at: string; text: string } | null; questions: { at: string; text: string }[]; settleFirst: { at: string; date: string | null; text: string } | null; related: { subject: string; items: { at: string; date: string | null; quote: string | null; text: string }[] }[]; note: string };

  // The taste rules a pattern can test, run over a file (path) or text. Each hit: line, the span, rule id, confidence
  // (mechanical | listed-form | candidate) and the verdict it runs into (quote, date, section). The full prose lint is the writing kit.
  checkText(o: { file?: string; text?: string }): { file: string | null; lines: number; words: number; hits: number; byRule: Record<string, number>; shown: number; cut: number; results: Hit[]; deferred: string; cannotSee: string[]; colourNote?: object };

  // A design file (HTML, CSS, SVG) or a list of colour values, against the visual verdicts: teal, red, red or orange with green,
  // a white background behind images on a dark page, headings far above body size, pill shapes, decorative glyphs, chevrons by name, Japanese text.
  // It reads source only: it cannot see the render or any picture. colourRule is the file's red-green colour blindness verdict; present whenever a colour was found.
  checkDesign(o: { file?: string; colors?: string[]; text?: string }): { file: string | null; colorsFound: number; colours: string[]; hits: number; byRule: Record<string, number>; shown: number; cut: number; results: Hit[]; cannotSee: string[]; needs: string; colourRule?: VerdictRef };

  // The file's colour blindness verdict with the quote and date.
  colourRule(): VerdictRef;

  // CHANGES THE FILE (needs act): appends `- <date>, <lead>: "<words>"` to the end of a section's list and writes a backup next to the file.
  // Refuses without their exact words (words), without a date (YYYY-MM-DD) and without a lead; refuses words the file already holds.
  // section: a section path or a part of it that is unique ("Visual work > What they reject", "Motion and video").
  add(o: { section: string; lead: string; words: string; date: string }): { file: string; backup: string; section: string; atLine: number; inserted: string[]; changedQuotes: string | null };
};
