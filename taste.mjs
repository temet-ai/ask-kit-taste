// A client for the taste file (the TASTE_FILE setting): the recorded verdicts on written
// and visual work, each with the quoted words and its date. It parses the file into items, finds the
// items about a subject, lists them by date, checks a text or a design file against the file's own
// rules, and, when the caller asked for a change, appends a new verdict in the file's form.
//
// Reading never changes anything. `add` needs `act`. Nothing here invents a verdict: a subject the
// file holds nothing on returns found: false.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { checkTextWith, checkDesignWith } from "./checks.mjs";

const notInThisAsk = (what) => {
  throw new Error(`not in this ask: ${what} changes things, and the caller did not ask for a change (act: true), so nothing was done. Answer what you can, and say that this needs \`ask\` with act: true. Do not look for another way to do it.`);
};

const DATE = /\b(\d{4}-\d{2}-\d{2})\b/g;
const collapse = (s) => String(s).replace(/\s+/g, " ").trim();
const home = os.homedir();
const expand = (p) => (p.startsWith("~/") ? path.join(home, p.slice(2)) : p);
const tilde = (p) => (p.startsWith(home + "/") ? "~" + p.slice(home.length) : p);

/** Parse the taste file into verdict items. Each bullet or paragraph is one item; sub-bullets are its `forms`. */
export function parseTaste(raw) {
  const lines = raw.split("\n");
  let i = 0;
  if (lines[0] === "---") {
    i = 1;
    while (i < lines.length && lines[i] !== "---") i++;
    i++;
  }
  let title = null;
  let h2 = null;
  let h3 = null;
  const items = [];
  const sections = new Map(); // path -> { path, headingLine, firstLine, lastLine, lastBulletEnd, items: n }
  const pathOf = () => (h2 ? (h3 ? `${h2} > ${h3}` : h2) : "(opening)");
  const kindOf = (p, isQuote) => {
    if (isQuote || /\b(?:voice|samples?)\b/i.test(p)) return "voice";
    if (/\b(?:rejects?|rejected|dislikes?|avoid|never)\b/i.test(p)) return "rejects";
    if (/\b(?:accepts?|accepted|approved|likes?|works? well)\b/i.test(p)) return "accepts";
    return "rule";
  };
  const touch = (p, line) => {
    let s = sections.get(p);
    if (!s) sections.set(p, (s = { path: p, headingLine: null, firstLine: line, lastLine: line, lastBulletEnd: null, items: 0 }));
    s.lastLine = line;
    return s;
  };
  let cur = null; // open bullet item
  let formOpen = false;
  let para = null; // open paragraph or blockquote
  const finish = (it) => {
    const lead = collapse(it.leadParts.join(" "));
    const forms = it.forms.map((f) => collapse(f.join(" ")));
    const quotes = [...lead.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    const dates = [...new Set([...lead.matchAll(DATE)].map((m) => m[1]))].sort().reverse();
    const out = { id: `L${it.line}`, line: it.line, endLine: it.endLine, section: it.section, kind: it.kind, form: it.form, dates, date: dates[0] ?? null, quotes, text: lead };
    if (forms.length) out.forms = forms;
    items.push(out);
    const s = sections.get(it.section);
    s.items++;
    if (it.form === "bullet") s.lastBulletEnd = it.endLine;
  };
  const closeAll = () => {
    if (cur) finish(cur);
    if (para) finish(para);
    cur = para = null;
    formOpen = false;
  };
  for (; i < lines.length; i++) {
    const L = lines[i];
    const n = i + 1;
    let m;
    if ((m = L.match(/^# (.+)/))) {
      closeAll();
      title = m[1];
    } else if ((m = L.match(/^## (.+)/))) {
      closeAll();
      h2 = m[1];
      h3 = null;
      touch(pathOf(), n).headingLine = n;
    } else if ((m = L.match(/^### (.+)/))) {
      closeAll();
      h3 = m[1];
      touch(pathOf(), n).headingLine = n;
    } else if (/^\s*$/.test(L)) {
      closeAll();
    } else if ((m = L.match(/^- (.*)/))) {
      closeAll();
      touch(pathOf(), n);
      cur = { line: n, endLine: n, section: pathOf(), kind: kindOf(pathOf()), form: "bullet", leadParts: [m[1]], forms: [] };
    } else if (cur && (m = L.match(/^  - (.*)/))) {
      cur.forms.push([m[1]]);
      cur.endLine = n;
      formOpen = true;
      touch(cur.section, n);
    } else if (cur && /^ {2,}\S/.test(L)) {
      if (formOpen) cur.forms[cur.forms.length - 1].push(L.trim());
      else cur.leadParts.push(L.trim());
      cur.endLine = n;
      touch(cur.section, n);
    } else if ((m = L.match(/^> ?(.*)/))) {
      if (!para || para.form !== "sample") {
        closeAll();
        para = { line: n, endLine: n, section: pathOf(), kind: "voice", form: "sample", leadParts: [], forms: [] };
      }
      para.leadParts.push(m[1]);
      para.endLine = n;
      touch(pathOf(), n);
    } else {
      if (!para || para.form !== "paragraph") {
        closeAll();
        para = { line: n, endLine: n, section: pathOf(), kind: kindOf(pathOf()), form: "paragraph", leadParts: [], forms: [] };
      }
      para.leadParts.push(L.trim());
      para.endLine = n;
      touch(pathOf(), n);
    }
  }
  closeAll();
  items.sort((a, b) => a.line - b.line);
  return { title, items, sections: [...sections.values()] };
}

// ---- subjects ---------------------------------------------------------------------------------

const STOP = new Set("a an the of and or to in on for with about what which who how has have had his her him he she they said says say recorded verdict verdicts rule rules work piece thing things when where is are was were be been does did do any anything everything something that this these those it its not no as at by from into than then there their they them we you i me my our your can could would should will".split(" "));

// Words the file itself uses for one subject. A subject word pulls in the rest of its group at a lower weight.
const GROUPS = [
  ["title", "heading", "headline", "tagline", "slogan"],
  ["teal", "colour", "color", "hue", "palette", "red", "orange", "green", "cyan", "brown", "blindness", "colourblind", "deuteranopia", "protanopia", "blue"],
  ["glyph", "diamond", "chevron", "pill", "marker", "bubble", "symbol", "icon", "bullet", "◆", "●", "✦"],
  ["table", "layout", "grid", "column"],
  ["clip", "video", "animation", "motion", "reveal", "effect", "fade", "terminal", "nyan"],
  ["guide", "documentation", "install", "installation", "reference", "readme"],
  ["logo", "wordmark", "mascot", "image", "art", "social", "icon", "alignment"],
  ["dense", "density", "wasted", "wasteful", "busy", "narrow", "massive", "space", "size", "smaller"],
  ["claim", "number", "figure", "fact", "count", "source", "invent"],
  ["voice", "tone", "typo", "casual", "joke", "firstperson"],
  ["slop", "tell", "clickbait", "claude", "wording", "wordy"],
];

const stem = (w) => w.replace(/ies$/, "y").replace(/(?<=[^s])s$/, "");
const wordsOf = (s) => (String(s).toLowerCase().match(/[\p{L}\p{N}'-]+|[^\s\p{L}\p{N}'"(),.:;!?\-_/\\]/gu) ?? []);
const matchWord = (term, w) => {
  if (/[^\x00-\x7f]/.test(term) && !/\p{L}/u.test(term)) return w === term;
  const a = stem(term);
  const b = stem(w);
  return a === b || (a.length >= 5 && b.startsWith(a));
};
const hits = (term, words) => words.some((w) => matchWord(term, w));

function subjectTerms(subject) {
  const base = [...new Set(wordsOf(subject).map((w) => w.replace(/^'+|'+$/g, "")).filter((w) => w && !STOP.has(w)))];
  const direct = base.map(stem);
  const extra = new Set();
  for (const g of GROUPS) if (direct.some((t) => g.some((x) => stem(x) === t))) for (const x of g) if (!direct.includes(stem(x))) extra.add(stem(x));
  return { direct, extra: [...extra] };
}

// ---- the client ---------------------------------------------------------------------------------

export function make({ settings, push, cwd, act }) {
  const given = settings?.TASTE_FILE || process.env.TASTE_FILE;
  if (!given) throw new Error("the TASTE_FILE setting is not set: point it at your taste file (a Markdown file of what you reject and accept in written and visual work)");
  const file = expand(given);
  return makeTaste({ file, act: !!act });
}

export function makeTaste({ file, act = false }) {
  let cache = null;
  const load = () => {
    let st;
    try {
      st = fs.statSync(file);
    } catch {
      throw new Error(`the taste file ${tilde(file)} does not exist (the TASTE_FILE setting names the file)`);
    }
    if (!cache || cache.mtimeMs !== st.mtimeMs || cache.size !== st.size) {
      const raw = fs.readFileSync(file, "utf8");
      cache = { mtimeMs: st.mtimeMs, size: st.size, raw, ...parseTaste(raw) };
    }
    return cache;
  };
  const at = (it) => `${tilde(file)}:${it.line}`;
  const view = (it, extra = {}) => ({ at: at(it), line: it.line, section: it.section, kind: it.kind, date: it.date, dates: it.dates, quotes: it.quotes, text: it.text, ...(it.forms ? { forms: it.forms } : {}), ...extra });

  /** Reference to the verdict a rule runs into, found in the file by text, so quote and date always come from the file. */
  const verdict = (anchor) => {
    const { items } = load();
    const it = items.find((x) => anchor.match.test(x.text + " " + (x.forms ?? []).join(" ")));
    if (!it) return { at: null, note: "the taste file no longer holds this verdict" };
    const q = anchor.quote ? it.quotes.find((x) => anchor.quote.test(x)) : null;
    const formLine = anchor.form && it.forms ? it.forms.find((f) => anchor.form.test(f)) : null;
    const form = formLine ? (formLine.split(/;\s*/).find((c) => anchor.form.test(c)) ?? formLine).replace(/[;.]$/, "") : null;
    return { at: at(it), section: it.section, date: it.date, quote: q ?? it.quotes[0] ?? null, hasQuote: it.quotes.length > 0, ...(form ? { form } : {}), ...(it.quotes.length ? {} : { note: "the file records this one without quoted words" }) };
  };

  const self = {
    file,
    act,

    items: () => load().items.map((it) => view(it)),

    sections: () => load().sections.map((s) => ({ path: s.path, heading: s.headingLine, lines: [s.firstLine, s.lastLine], items: s.items, hasList: s.lastBulletEnd != null })),

    about(subject, { kind, max = 12 } = {}) {
      const { items, mtimeMs } = load();
      const { direct, extra } = subjectTerms(subject);
      const base = { subject, file: tilde(file), fileModified: new Date(mtimeMs).toISOString().slice(0, 10), items: items.length, terms: direct, alsoMatched: extra };
      if (!direct.length) return { ...base, found: false, matches: 0, results: [], note: "no usable word in the subject. Give a noun such as titles, teal, glyphs, tables, clips, guides." };
      const rows = [];
      for (const it of items) {
        if (kind && it.kind !== kind) continue;
        const body = wordsOf(it.text + " " + (it.forms ?? []).join(" "));
        const sec = wordsOf(it.section);
        const qw = wordsOf(it.quotes.join(" "));
        let score = 0;
        const matched = [];
        for (const t of direct) if (hits(t, body) || hits(t, sec)) { score += 5 + (hits(t, qw) ? 2 : 0) + (hits(t, sec) ? 1 : 0); matched.push(t); }
        let more = 0;
        for (const t of extra) if (hits(t, body)) { more++; matched.push(t); }
        score += Math.min(more, 2);
        if (score) rows.push({ it, score, matched });
      }
      rows.sort((a, b) => b.score - a.score || (b.it.date ?? "").localeCompare(a.it.date ?? "") || a.it.line - b.it.line);
      if (!rows.length) {
        return { ...base, found: false, matches: 0, results: [], note: `nothing recorded on that: no item in ${tilde(file)} mentions ${[...direct, ...extra].join(", ")}. That is not a verdict either way. Do not infer one. What the person typed about it in a past session may be in a session-history kit such as mike, and that is not a recorded verdict.` };
      }
      return { ...base, found: true, matches: rows.length, shown: Math.min(max, rows.length), results: rows.slice(0, max).map((r) => view(r.it, { score: r.score, matched: r.matched })) };
    },

    timeline({ subject, since, until, section, kind, max = 30 } = {}) {
      const { items } = load();
      let pool = items;
      if (subject) {
        const r = self.about(subject, { max: 1000 });
        const ids = new Set((r.results ?? []).map((x) => x.line));
        pool = pool.filter((it) => ids.has(it.line));
      }
      if (section) pool = pool.filter((it) => it.section.toLowerCase().includes(String(section).toLowerCase()));
      if (kind) pool = pool.filter((it) => it.kind === kind);
      const events = [];
      let undated = 0;
      for (const it of pool) {
        if (!it.dates.length) { undated++; continue; }
        for (const d of it.dates) {
          if (since && d < since) continue;
          if (until && d > until) continue;
          events.push({ date: d, at: at(it), section: it.section, kind: it.kind, quotes: it.quotes, text: it.text.length > 280 ? it.text.slice(0, 277) + "..." : it.text });
        }
      }
      events.sort((a, b) => b.date.localeCompare(a.date) || a.at.localeCompare(b.at));
      return { file: tilde(file), subject: subject ?? null, events: events.length, shown: Math.min(max, events.length), undatedItems: undated, results: events.slice(0, max), note: "newest first; an item with several dates appears once per date; items without a date in the file are counted, not listed" };
    },

    shape(kind) {
      const { items } = load();
      const sec = items.filter((it) => /shape of the work|before (?:you )?(?:polish|start|mak)|settle first|decide the shape/i.test(it.section));
      const qs = sec.filter((it) => it.form === "bullet");
      const paras = sec.filter((it) => it.form === "paragraph");
      const intro = paras[0];
      const settle = paras.find((p) => p !== intro && /settle|before (?:making|anything|polish)|decided after/i.test(p.text));
      const k = String(kind ?? "").toLowerCase();
      const pick = (re) => { const r = qs.filter((q) => re.test(q.text)); return r.length ? r : qs; };
      let chosen = qs;
      let subjects = ["titles", "claims", "density"];
      if (/post|article|blog/.test(k)) { chosen = pick(/post|article|guide|section/i); subjects = ["clickbait", "claims", "titles", "voice"]; }
      else if (/guide|doc|readme/.test(k)) { chosen = pick(/guide|doc|section/i); subjects = ["guides", "titles", "claims"]; }
      else if (/logo|icon|direction|brand|art|image/.test(k)) { chosen = pick(/logo|icon|brand|sketch|direction/i); subjects = ["logo", "colour", "glyphs"]; }
      else if (/clip|video|animation|motion/.test(k)) { chosen = pick(/clip|video|animation|motion|section/i); subjects = ["clips", "logo", "colour"]; }
      else if (/page|site|landing|ui|screen|layout/.test(k)) { chosen = pick(/page|site|screen|layout|section/i); subjects = ["density", "tables", "titles", "colour"]; }
      else if (/chart|diagram|graph/.test(k)) { chosen = pick(/chart|diagram|table|section/i); subjects = ["colour", "tables"]; }
      const related = subjects.map((s) => ({ subject: s, items: self.about(s, { max: 3 }).results.map((r) => ({ at: r.at, date: r.date, quote: r.quotes[0] ?? null, text: r.text.length > 160 ? r.text.slice(0, 157) + "..." : r.text })) }));
      return {
        kind: kind ?? null,
        recognisedKind: chosen !== qs || !k,
        rule: intro ? { at: at(intro), text: intro.text } : null,
        questions: chosen.map((q) => ({ at: at(q), text: q.text.replace(/;$/, "") })),
        settleFirst: settle ? { at: at(settle), date: settle.date, text: settle.text } : null,
        related,
        note: sec.length ? "the questions are the file's own list; the kit does not add to it. An empty list means the file has no section on the shape of the work." : "the file has no section on the shape of the work (a heading such as 'The shape of the work'), so there are no questions to list.",
      };
    },

    checkText({ file: f, text } = {}) {
      return checkTextWith({ file: f, text, verdict, cwd: process.cwd() });
    },

    checkDesign({ file: f, colors, text } = {}) {
      return checkDesignWith({ file: f, colors, text, verdict });
    },

    colourRule() {
      return verdict({ match: /colou?r[- ]?blind|red[- ]green|colou?r vision/i, quote: /blind|red[- ]green/i });
    },

    /** Appends a verdict to a section's list, in the file's form: `- <date>, <lead>: "<their words>"`. Writes a backup first. */
    add({ section, lead, words, date } = {}) {
      if (!act) notInThisAsk(`taste.add (appending to ${tilde(file)})`);
      const w = collapse(words ?? "");
      if (!w) throw new Error("refused: add needs their exact words (words), as typed. A paraphrase is not recorded.");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date ?? ""))) throw new Error("refused: add needs the date they said it, as YYYY-MM-DD");
      if (!collapse(lead ?? "")) throw new Error("refused: add needs lead: the subject and place in a few words, e.g. 'landing copy'");
      const quoted = w.replace(/"/g, "'");
      const c = load();
      const dup = c.items.find((it) => it.quotes.some((q) => collapse(q) === quoted || (quoted.length >= 12 && collapse(q).includes(quoted))) || (quoted.length >= 20 && collapse(it.text).includes(quoted)));
      if (dup) throw new Error(`refused: those words are already recorded at ${at(dup)}`);
      const want = String(section ?? "").toLowerCase().trim();
      const cands = c.sections.filter((s) => want && s.path.toLowerCase().includes(want));
      const exact = c.sections.filter((s) => s.path.toLowerCase() === want);
      const chosen = exact.length === 1 ? exact[0] : cands.length === 1 ? cands[0] : null;
      if (!chosen) throw new Error(`refused: section ${JSON.stringify(section)} ${cands.length ? "is ambiguous: " + cands.map((s) => s.path).join(" | ") : "does not match any section"}. Sections with a list: ${c.sections.filter((s) => s.lastBulletEnd != null).map((s) => s.path).join(" | ")}`);
      if (chosen.lastBulletEnd == null) throw new Error(`refused: ${chosen.path} has no list of verdicts to append to. Sections with a list: ${c.sections.filter((s) => s.lastBulletEnd != null).map((s) => s.path).join(" | ")}`);
      const entry = `- ${date}, ${collapse(lead)}: "${quoted}"`;
      const out = [];
      let line = "";
      for (const word of entry.split(" ")) {
        if (line && (line + " " + word).length > 100) { out.push(line); line = "  " + word; }
        else line = line ? line + " " + word : word;
      }
      out.push(line);
      const lines = c.raw.split("\n");
      const backup = `${file}.bak-${new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14)}`;
      fs.copyFileSync(file, backup);
      lines.splice(chosen.lastBulletEnd, 0, ...out);
      fs.writeFileSync(file, lines.join("\n"));
      cache = null;
      return { file: tilde(file), backup: tilde(backup), section: chosen.path, atLine: chosen.lastBulletEnd + 1, inserted: out, changedQuotes: quoted !== w ? "double quotes inside their words were written as single quotes" : null };
    },
  };
  return self;
}
