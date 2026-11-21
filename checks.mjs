// The mechanical part of the taste checks: rules from the taste file's own lists, run over a text or
// a design file. Every hit names the verdict it runs into; the verdict (quote, date, section) is looked
// up in the taste file by `verdict(anchor)`, never written here.
import fs from "node:fs";
import path from "node:path";

const GLYPHS = "◆◇●○✦✧★☆■□▪▫▶▸▾▼▲▴◀◂❯❮›‹»«⌄⌃˅˄";
const GLYPH_RE = new RegExp(`[${GLYPHS}]`, "gu");
const JAPANESE_RE = /[぀-ゟ゠-ヿ㐀-䶿一-鿿ｦ-ﾟ]+/gu;
const blank = (s) => s.replace(/[^\n]/g, " ");

// Anchors find the verdict a rule runs into by topic words, so any taste file's own wording can match.
// A rule whose topic the file does not mention reports nothing; the count goes under `notRecorded`.
const A = {
  aiTells: { match: /\bai[- ](?:tell|slop|sound)|sounds? like (?:an? )?(?:ai|llm|chatgpt)|quotable|\bnot just\b|\bX, not Y\b|it'?s not A\b|would otherwise|groups? of three/i, quote: /ai[- ](?:tell|slop|sound)|quotable|not just|would otherwise/i },
  clickbait: { match: /clickbait|teaser/i, quote: /clickbait|teaser/i },
  claudeSpeak: { match: /claude[- ]speak|\bai[- ]speak|buzzwords?|corporate jargon|\bdelve\b/i, quote: /speak|buzzword|jargon|delve/i },
  shade: { match: /casting shade|disclaimers?|unwarranted (?:caveats?|doubt)|hedging/i, quote: /shade|disclaimer|caveat|doubt|hedg/i },
  titles: { match: /\btitles?\b/i, quote: /\btitles?\b/i },
  japanese: { match: /japanese|\bcjk\b|non-latin/i },
  glyph: { match: /\bglyphs?\b|emoji|decorative (?:symbols?|icons?|characters?)/i, quote: /glyph|emoji|symbol/i },
  pills: { match: /\bpills?\b|\bbadges?\b|\bchips?\b/i, quote: /pill|badge|chip/i },
  attributed: { match: /attributed|put words in|did not make the rule|never (?:write|say) that (?:i|he|she|they) (?:decided|chose)/i, quote: /rule|attribut/i },
  teal: { match: /\bteal\b/i, quote: /teal/i },
  red: { match: /\bred\b/i, quote: /\bred\b/i },
  blind: { match: /colou?r[- ]?blind|red[- ]green|colou?r vision/i, quote: /blind|red[- ]green/i },
  dense: { match: /\bdense\b|\bdensity\b|massive (?:headlines?|headings?)|big type/i, quote: /dense|density|massive|big/i },
  shout: { match: /shout|massive (?:headlines?|headings?)|oversized headings?/i, quote: /shout|massive|oversized/i },
  white: { match: /white background|opaque (?:logo|image)|transparent (?:logo|background)/i, quote: /white|opaque|transparen/i },
  chevron: { match: /chevrons?|\bcarets?\b|disclosure arrows?/i, quote: /chevron|caret|arrow/i },
  gradient: { match: /gradient/i, quote: /gradient/i },
};
const form = (re) => ({ form: re });

// ---- text -------------------------------------------------------------------------------------

const TEXT_RULES = [
  { id: "not-just", re: /\bnot just\b/gi, conf: "listed-form", a: { ...A.aiTells, ...form(/not just X/) } },
  { id: "not-a-its-b", re: /\b(?:it'?s|it is|this is|that is|that'?s|they are|they'?re)\s+not\b[^.;!?\n]{1,60}[,;—-]\s*(?:it'?s|it is|this is|that is|that'?s|they are|they'?re|but)\b/gi, conf: "listed-form", a: { ...A.aiTells, ...form(/it's not A/) } },
  { id: "not-a-its-b", re: /\b(?:isn'?t|aren'?t|is not|are not|does not|doesn'?t|do not|don'?t)\b[^.;!?\n]{1,60}[,;]\s*(?:it|they|but|rather)\b/gi, conf: "candidate", a: { ...A.aiTells, ...form(/it's not A/) } },
  { id: "fix-is-not", re: /\bthe \w+ is not\b[^.;!?\n]{1,60}[;,]\s*it is\b/gi, conf: "listed-form", a: { ...A.aiTells, ...form(/the fix is not/) } },
  { id: "x-not-y", re: /\b[A-Za-z][\w-]*,\s+not\s+(?:a |an |the |just )?[A-Za-z][\w-]*/g, conf: "candidate", a: { ...A.aiTells, ...form(/^"X, not Y"/) } },
  { id: "would-otherwise", re: /\bwhat would otherwise\b|\bwould otherwise (?:take|need|require)\b|\botherwise take\b/gi, conf: "listed-form", a: { ...A.aiTells, ...form(/does what would otherwise/) } },
  { id: "one-instead-of-many", re: /\bone \w+(?: \w+)? instead of (?:many|several|a dozen|dozens|\d+)\b|\binstead of (?:a dozen|dozens of|many)\b/gi, conf: "listed-form", a: { ...A.aiTells, ...form(/one X instead of many/) } },
  { id: "only-what-matters", re: /\bonly what (?:matters|you need|counts|is needed)\b|\bonly what \w+ prints\b/gi, conf: "listed-form", a: { ...A.aiTells, ...form(/only what matters comes back/) } },
  { id: "announces-next", re: /\b(?:here'?s|here is) (?:the|what|why|how|a|where)\b|\blet'?s (?:look|dive|take a look|break|walk)\b|\bhere'?s the (?:thing|catch|kicker)\b|\bthe (?:catch|kicker|punchline)\b|\bbut here'?s\b/gi, conf: "listed-form", a: { ...A.aiTells, ...form(/announces the next one/) } },
  { id: "clickbait", re: /\b(?:you won'?t believe|the surprising (?:truth|result)|what (?:the|our) (?:records|data|numbers|logs|results) (?:show|reveal)|it turns out|spoiler)\b/gi, conf: "listed-form", a: A.clickbait },
  { id: "claude-speak", re: /\b(?:delve[sd]?|leverag(?:e|es|ed|ing)|seamless(?:ly)?|game[- ]changer|supercharge[sd]?|unlock(?:s|ed|ing)?|elevat(?:e|es|ed|ing)|streamlin(?:e|es|ed|ing)|cutting[- ]edge|empower(?:s|ed|ing)?|tapestry)\b/gi, conf: "candidate", a: A.claudeSpeak },
  { id: "casting-shade", re: /\b(?:looks? (?:just )?as (?:sure|confident)|just as (?:sure|confident)|(?:can|may|might|could) (?:be )?(?:wrong|mistaken)|should be verified|always verify|double-check (?:the |its )?answers?|trust the answers?|don'?t trust|cheap models? (?:can|may|might|will|often))\b/gi, conf: "candidate", a: A.shade },
  { id: "attributed-to-person", re: /\b(?:he|she|they|the user|the author)\s+(?:decided|chose|insists?|requires?|mandates?|prefers?|believes|feels|thinks)\b|\b(?:his|her|their) (?:rule|decision|choice|reason|motive)\b/gi, conf: "candidate", a: A.attributed },
];
const TRIAD = { id: "group-of-three", re: /\b[A-Za-z][\w-]*(?: [a-z][\w-]*)?, [A-Za-z][\w-]*(?: [a-z][\w-]*)?,? (?:and|or) [A-Za-z][\w-]*(?: [a-z][\w-]*)?\b/g, conf: "candidate", a: { ...A.aiTells, ...form(/groups of three/) } };
const HEADING_RULES = [
  { id: "count-title", re: /^(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|a dozen)\s+(?:\w+\s+){0,2}(?:ways|things|reasons|lessons|tips|mistakes|rules|steps|patterns|ideas)\b/i, a: A.clickbait },
  { id: "introducing-title", re: /^(?:introducing|meet|announcing|welcome to)\b/i, a: A.titles },
  { id: "slogan-heading", re: /,\s+not\s+\w+|\bnot (?:just )?\w+,? but\b|^the (?:easy|simple|fast|better|right) (?:way|path|route)\b|^\w+ once, then\b|^one \w+(?: \w+)?, (?:many|every|any|all)\b|\bwhy .+ matters\b|,\s+and what (?:i|we)\b/i, a: { ...A.aiTells, ...form(/slogan headings/) } },
];

function paragraphs(raw) {
  const lines = raw.split("\n");
  const out = [];
  let fence = false;
  let cur = null;
  const flush = () => { if (cur) out.push(cur); cur = null; };
  const add = (kind, text, n) => {
    if (!cur || cur.kind !== kind || kind !== "para") { flush(); cur = { kind, text: "", starts: [] }; }
    cur.starts.push([cur.text.length, n]);
    cur.text += (cur.text ? " " : "") + text;
  };
  lines.forEach((L, i) => {
    const n = i + 1;
    if (/^\s*(```|~~~)/.test(L)) { fence = !fence; flush(); return; }
    if (fence) return;
    const t = blank0(L);
    if (/^\s*$/.test(t)) flush();
    else if (/^#{1,6}\s/.test(t)) { flush(); cur = { kind: "heading", text: t.replace(/^#+\s*/, ""), starts: [[0, n]] }; flush(); }
    else if (/^\s*\|/.test(t)) { flush(); }
    else if (/^\s*(?:[-*+]|\d+[.)])\s+/.test(t)) { flush(); add("list", t.replace(/^\s*(?:[-*+]|\d+[.)])\s+/, ""), n); flush(); }
    else add("para", t.trim(), n);
  });
  flush();
  return out;
}
// Inline code and link targets are not prose.
function blank0(L) {
  return L.replace(/`[^`]*`/g, (m) => " ".repeat(m.length)).replace(/\]\([^)]*\)/g, (m) => "]" + " ".repeat(m.length - 1)).replace(/https?:\/\/\S+/g, (m) => " ".repeat(m.length));
}
const lineAt = (p, idx) => { let ln = p.starts[0][1]; for (const [s, n] of p.starts) if (s <= idx) ln = n; return ln; };

// Verdicts repeat across hits: keep each once under a key (V1, V2 ...) and let hits point at it.
function bundle(found, verdict) {
  const map = new Map();
  const verdicts = {};
  const ref = (a) => {
    if (!a) return undefined;
    const k = `${a.match.source}|${a.quote?.source ?? ""}|${a.form?.source ?? ""}`;
    if (!map.has(k)) { const id = `V${map.size + 1}`; map.set(k, id); verdicts[id] = verdict(a); }
    return map.get(k);
  };
  const results = found.map((h) => ({ ...h, verdict: ref(h.verdict), also: ref(h.also) }));
  for (const r of results) { if (r.verdict === undefined) delete r.verdict; if (r.also === undefined) delete r.also; }
  return { results, verdicts };
}
// A hit whose rule has no verdict in the taste file is not reported; its rule is counted instead.
function anchored(found, verdict) {
  const kept = [];
  const notRecorded = {};
  const memo = new Map();
  for (const h of found) {
    const a = h.verdict;
    let ok = true;
    if (a) { const k = `${a.match.source}`; if (!memo.has(k)) memo.set(k, verdict(a).at != null); ok = memo.get(k); }
    if (ok) kept.push(h); else notRecorded[h.rule] = (notRecorded[h.rule] ?? 0) + 1;
  }
  return { kept, notRecorded };
}
const snip = (s) => s.replace(/\s+/g, " ").trim().slice(0, 120);

export function checkTextWith({ file, text, verdict, cwd }) {
  let raw = text;
  let name = null;
  if (file) {
    const p = path.resolve(cwd, file.replace(/^~\//, process.env.HOME + "/"));
    if (!fs.existsSync(p)) throw new Error(`no such file: ${p}`);
    raw = fs.readFileSync(p, "utf8");
    name = p;
    if (/\.html?$/i.test(p)) raw = raw.replace(/<(script|style)[\s\S]*?<\/\1>/gi, blank).replace(/<[^>]+>/g, (m) => " ".repeat(m.length));
  }
  if (raw == null) throw new Error("give file (a path) or text");
  const found = [];
  const seen = new Set();
  const push = (h) => { const k = `${h.line}|${h.rule}|${h.rule === "not-a-its-b" ? "" : h.span}`; if (!seen.has(k)) { seen.add(k); found.push(h); } };
  for (const p of paragraphs(raw)) {
    if (p.kind === "heading") {
      for (const r of HEADING_RULES) { const m = p.text.match(r.re); if (m) push({ line: p.starts[0][1], span: snip(p.text), rule: r.id, confidence: "listed-form", verdict: r.a }); }
      continue;
    }
    const rules = p.kind === "para" || p.kind === "list" ? [...TEXT_RULES, TRIAD] : [];
    for (const r of rules) {
      r.re.lastIndex = 0;
      for (const m of p.text.matchAll(r.re)) push({ line: lineAt(p, m.index), span: snip(m[0]), rule: r.id, confidence: r.conf, verdict: r.a });
    }
    if (p.kind === "para") {
      const sentences = p.text.split(/(?<=[.!?])\s+/);
      let idx = 0;
      let prev = 0;
      for (const s of sentences) {
        const words = s.trim().split(/\s+/).filter(Boolean).length;
        if (prev >= 8 && words >= 1 && words <= 3 && /[.!]$/.test(s.trim()) && /^[A-Z"]/.test(s.trim())) push({ line: lineAt(p, p.text.indexOf(s, idx)), span: snip(s), rule: "short-sentence-for-effect", confidence: "candidate", verdict: { ...A.aiTells, ...form(/short sentences for effect/) } });
        idx = p.text.indexOf(s, idx) + s.length;
        prev = words;
      }
    }
  }
  // Japanese and decorative glyphs: anywhere, code fences included (marked).
  const lines = raw.split("\n");
  let fence = false;
  lines.forEach((L, i) => {
    if (/^\s*(```|~~~)/.test(L)) fence = !fence;
    for (const m of L.matchAll(JAPANESE_RE)) push({ line: i + 1, span: m[0].slice(0, 40), rule: "japanese-text", confidence: "mechanical", verdict: A.japanese });
    for (const m of L.matchAll(GLYPH_RE)) {
      const ctx = L.slice(Math.max(0, m.index - 20), m.index + 25).trim();
      push({ line: i + 1, span: m[0], context: ctx, rule: "decorative-glyph", confidence: "mechanical", ...(fence ? { inCode: true } : {}), verdict: A.glyph });
    }
  });
  found.sort((a, b) => a.line - b.line);
  const nr = anchored(found, verdict);
  found.splice(0, found.length, ...nr.kept);
  const cut = Math.max(0, found.length - 60);
  const { results: shown, verdicts } = bundle(found.slice(0, 60), verdict);
  const byRule = {};
  for (const h of found) byRule[h.rule] = (byRule[h.rule] ?? 0) + 1;
  const out = {
    file: name,
    lines: raw.split("\n").length,
    words: (raw.match(/\S+/g) ?? []).length,
    hits: found.length,
    ...(Object.keys(nr.notRecorded).length ? { notRecorded: nr.notRecorded } : {}),
    byRule,
    shown: shown.length,
    cut,
    results: shown,
    verdicts,
    confidence: "mechanical: certain; listed-form: a form the file names, check the sentence; candidate: a pattern that often is the form, but may be an ordinary sentence",
    deferred: "This is the part of the taste file a pattern can test. The full prose lint (rule ids, closing lines that restate, text off its purpose, wordiness, a reader's view) is the writing kit: ask about 'writing', or run its lint script.",
    cannotSee: ["a paragraph that ends on a line restating it", "a colon that sets up a reveal", "a section that does not answer its heading", "content in the wrong place (install steps in a post)", "anything said twice", "whether a claim, number or name matches its source", "whether the author's own wording was kept"],
  };
  if (/\b(red|green|teal|orange)\b/i.test(raw)) { const rule = verdict(A.blind); const teal = verdict(A.teal); if (rule.at || teal.at) out.colourNote = { text: "the text names a colour: the file's recorded verdicts on colour", ...(rule.at ? { rule } : {}), ...(teal.at ? { teal } : {}) }; }
  return out;
}

// ---- design -------------------------------------------------------------------------------------

const NAMED = {
  teal: [0, 128, 128], darkcyan: [0, 139, 139], cyan: [0, 255, 255], aqua: [0, 255, 255], turquoise: [64, 224, 208], mediumturquoise: [72, 209, 204], lightseagreen: [32, 178, 170], cadetblue: [95, 158, 160],
  red: [255, 0, 0], crimson: [220, 20, 60], firebrick: [178, 34, 34], darkred: [139, 0, 0], tomato: [255, 99, 71], orangered: [255, 69, 0], indianred: [205, 92, 92], coral: [255, 127, 80], salmon: [250, 128, 114],
  orange: [255, 165, 0], darkorange: [255, 140, 0],
  green: [0, 128, 0], lime: [0, 255, 0], limegreen: [50, 205, 50], forestgreen: [34, 139, 34], seagreen: [46, 139, 87], darkgreen: [0, 100, 0], mediumseagreen: [60, 179, 113], springgreen: [0, 255, 127], lightgreen: [144, 238, 144], olivedrab: [107, 142, 35], chartreuse: [127, 255, 0],
  white: [255, 255, 255], whitesmoke: [245, 245, 245], ghostwhite: [248, 248, 255], snow: [255, 250, 250], ivory: [255, 255, 240], floralwhite: [255, 250, 240], black: [0, 0, 0],
};
const NAMES_RE = new RegExp(`(?<![\\w#-])(${Object.keys(NAMED).join("|")})(?![\\w-])`, "gi");
const TW = { teal: "teal", cyan: "teal", red: "red", rose: "red", orange: "orange", amber: "orange", green: "green", emerald: "green", lime: "green" };

function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, s, l };
}
function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}
const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };

export function parseColor(tok) {
  const t = tok.trim().toLowerCase();
  let rgb = null;
  let m;
  if ((m = t.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/))) {
    let h = m[1];
    if (h.length <= 4) h = [...h].map((c) => c + c).join("");
    rgb = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  } else if ((m = t.match(/^rgba?\(\s*([\d.]+%?)[\s,]+([\d.]+%?)[\s,]+([\d.]+%?)/))) {
    rgb = [m[1], m[2], m[3]].map((v) => (v.endsWith("%") ? (parseFloat(v) * 255) / 100 : parseFloat(v)));
  } else if ((m = t.match(/^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%/))) {
    rgb = hslToRgb(parseFloat(m[1]) % 360, parseFloat(m[2]) / 100, parseFloat(m[3]) / 100);
  } else if ((m = t.match(/^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)/))) {
    const L = m[1].endsWith("%") ? parseFloat(m[1]) / 100 : parseFloat(m[1]);
    return { text: tok.trim(), h: parseFloat(m[3]) % 360, s: Math.min(1, parseFloat(m[2]) / 0.15), l: L, lum: L ** 3, approx: "oklch read as hue, chroma and lightness" };
  } else if (NAMED[t]) rgb = NAMED[t];
  if (!rgb) return null;
  const hsl = rgbToHsl(rgb);
  return { text: tok.trim(), ...hsl, lum: lum(rgb) };
}
const classify = (c) => {
  const out = [];
  if (c.s >= 0.25 && c.l >= 0.15 && c.l <= 0.85 && c.h >= 165 && c.h <= 195) out.push("teal");
  if ((c.h <= 12 || c.h >= 348) && c.s >= 0.45 && c.l >= 0.2 && c.l <= 0.8) out.push("red");
  else if (c.h > 12 && c.h <= 45 && c.s >= 0.55 && c.l >= 0.25 && c.l <= 0.8) out.push("orange");
  if (c.h >= 75 && c.h <= 160 && c.s >= 0.25 && c.l >= 0.15 && c.l <= 0.85) out.push("green");
  return out;
};

function toPx(v, base = 16) {
  v = v.trim().toLowerCase();
  const clamp = v.match(/^clamp\((.+)\)$/);
  if (clamp) { const parts = clamp[1].split(/,(?![^(]*\))/).map((x) => toPx(x, base)); if (parts.length !== 3 || parts.some((x) => x == null)) return null; return Math.max(parts[0], Math.min(parts[1], parts[2])); }
  const m = v.match(/^([\d.]+)(px|rem|em|pt|vw|vmin|vh|%)?$/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return { px: n, rem: n * 16, em: n * base, pt: n * 1.333, vw: n * 14.4, vmin: n * 9, vh: n * 9, "%": (n / 100) * base }[m[2] ?? "px"];
}

export function checkDesignWith({ file, colors, text, verdict }) {
  let raw = text ?? "";
  let name = null;
  let ext = "";
  if (file) {
    const p = path.resolve(process.cwd(), file.replace(/^~\//, process.env.HOME + "/"));
    if (!fs.existsSync(p)) throw new Error(`no such file: ${p}`);
    raw = fs.readFileSync(p, "utf8");
    name = p;
    ext = path.extname(p).toLowerCase();
  }
  if (!raw && !colors?.length) throw new Error("give file (HTML, CSS, SVG), text, or colors (a list of colour values)");
  const lineOf = (idx) => { let n = 1; for (let i = 0; i < idx && i < raw.length; i++) if (raw.charCodeAt(i) === 10) n++; return n; };
  const found = [];
  const add = (h) => found.push(h);

  // style regions with their offsets
  const regions = [];
  if ([".css", ".scss", ".less"].includes(ext)) regions.push({ start: 0, body: raw, inline: false });
  else {
    for (const m of raw.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) regions.push({ start: m.index + m[0].indexOf(m[1]), body: m[1], inline: false });
    for (const m of raw.matchAll(/\sstyle\s*=\s*("([^"]*)"|'([^']*)')/gi)) regions.push({ start: m.index + m[0].indexOf(m[1]) + 1, body: m[2] ?? m[3], inline: true });
  }
  const blocks = []; // {selector, line, decls:[{prop,value,idx}]}
  for (const r of regions) {
    if (r.inline) { blocks.push({ selector: "(inline style)", line: lineOf(r.start), decls: declsOf(r.body, r.start) }); continue; }
    for (const m of r.body.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const sel = m[1].replace(/\/\*[\s\S]*?\*\//g, "").trim().replace(/\s+/g, " ");
      blocks.push({ selector: sel, line: lineOf(r.start + m.index + m[0].indexOf("{")), decls: declsOf(m[2], r.start + m.index + m[0].indexOf("{") + 1) });
    }
  }
  function declsOf(body, off) {
    const d = [];
    for (const m of body.matchAll(/([a-zA-Z-]+)\s*:\s*([^;]+)/g)) d.push({ prop: m[1].toLowerCase(), value: m[2].trim(), idx: off + m.index });
    return d;
  }

  // colours
  const colours = []; // {c, line, where, block}
  const COLOR_PROP = /color|background|border|outline|fill|stroke|shadow|gradient|^--/;
  for (const b of blocks) {
    for (const d of b.decls) {
      if (!COLOR_PROP.test(d.prop)) continue;
      const toks = [...d.value.matchAll(/#[0-9a-fA-F]{3,8}\b|(?:rgba?|hsla?|oklch)\([^)]*\)/g)].map((m) => m[0]);
      for (const m of d.value.matchAll(NAMES_RE)) toks.push(m[1]);
      for (const t of toks) { const c = parseColor(t); if (c) colours.push({ c, line: lineOf(d.idx), where: `${b.selector} { ${d.prop}: ${d.value.slice(0, 50)} }`, block: b, prop: d.prop }); }
    }
  }
  for (const m of raw.matchAll(/\b(?:fill|stroke|stop-color|flood-color|color)\s*=\s*"([^"]+)"/g)) { const c = parseColor(m[1]); if (c) colours.push({ c, line: lineOf(m.index), where: m[0], block: null, prop: "svg" }); }
  for (const m of raw.matchAll(/\[(#[0-9a-fA-F]{3,8})\]/g)) { const c = parseColor(m[1]); if (c) colours.push({ c, line: lineOf(m.index), where: m[0], block: null, prop: "tailwind" }); }
  for (const m of raw.matchAll(/\b(?:bg|text|border|from|to|via|fill|stroke|ring|outline|decoration)-(teal|cyan|red|rose|orange|amber|green|emerald|lime)-(\d{2,3})\b/g)) {
    const kind = TW[m[1]];
    const h = { teal: 175, red: 0, orange: 30, green: 130 }[kind];
    colours.push({ c: { text: m[0], h, s: 0.7, l: 0.5, lum: 0.3, approx: "tailwind class read by name" }, line: lineOf(m.index), where: m[0], block: null, prop: "tailwind" });
  }
  (colors ?? []).forEach((t, i) => { const c = parseColor(String(t)); if (c) colours.push({ c, line: null, where: `colors[${i}] ${t}`, block: null, prop: "list" }); else add({ rule: "unparsed-colour", line: null, span: String(t), confidence: "mechanical", note: "not a colour value the check reads (hex, rgb, hsl, oklch or a basic name)" }); });

  const classes = colours.map((x) => ({ ...x, k: classify(x.c) }));
  for (const x of classes) {
    if (x.k.includes("teal")) add({ rule: "teal", line: x.line, span: x.c.text, where: x.where, confidence: "mechanical", verdict: A.teal, note: `hue ${Math.round(x.c.h)}, in the teal band 165 to 195` });
    if (x.k.includes("red")) add({ rule: "red", line: x.line, span: x.c.text, where: x.where, confidence: "candidate", verdict: A.red, note: "red: the file records red as turned down; check whether the verdict still applies to the direction of the work" });
  }
  // red or orange with green: in one rule, otherwise in the same file
  const warm = classes.filter((x) => x.k.includes("red") || x.k.includes("orange"));
  const green = classes.filter((x) => x.k.includes("green"));
  const paired = new Set();
  for (const w of warm) for (const g of green) {
    const same = w.block && w.block === g.block;
    if (same || (!w.block && !g.block && w.prop === "list" && g.prop === "list")) {
      const k = `${w.line}|${g.line}|${w.c.text}|${g.c.text}`;
      if (!paired.has(k)) { paired.add(k); add({ rule: "red-orange-with-green", line: w.line, span: `${w.c.text} with ${g.c.text}`, where: same ? `both in ${w.block.selector}` : "both in the list", confidence: "mechanical", verdict: A.blind }); }
    }
  }
  if (warm.length && green.length && !paired.size) add({ rule: "red-orange-and-green-in-one-file", line: warm[0].line, span: `${warm[0].c.text} and ${green[0].c.text}`, where: `${warm.length} red or orange, ${green.length} green values; not in one rule`, confidence: "candidate", verdict: A.blind, note: "check whether they sit side by side or are the two ends of one scale. Any meaning carried by red-against-green, or by a coloured outline alone, is the fault" });

  // dark page and white behind images
  const bgs = blocks.filter((b) => /(^|[\s,])(html|body|:root|main|\.page|\.app)(?=[\s,.:]|$)/.test(b.selector)).flatMap((b) => b.decls.filter((d) => /^(background|background-color|--bg|--background|--surface)/.test(d.prop)).map((d) => ({ d, c: (d.value.match(/#[0-9a-fA-F]{3,8}\b|(?:rgba?|hsla?|oklch)\([^)]*\)/) ?? [])[0] })));
  const darkPage = bgs.some((x) => x.c && (parseColor(x.c)?.lum ?? 1) < 0.2) || /color-scheme\s*:\s*dark/.test(raw) || /<html[^>]*data-theme\s*=\s*"dark"/.test(raw);
  if (darkPage) {
    for (const b of blocks) {
      if (!/\b(img|logo|picture|figure|brand)\b|\.logo|\.brand/i.test(b.selector)) continue;
      for (const d of b.decls) if (/^background(-color)?$/.test(d.prop)) { const c = parseColor((d.value.match(/#[0-9a-fA-F]{3,8}\b|(?:rgba?|hsla?)\([^)]*\)|\b(?:white|whitesmoke|snow|ivory)\b/i) ?? [""])[0]); if (c && c.lum > 0.8) add({ rule: "white-behind-image", line: lineOf(d.idx), span: `${b.selector} { ${d.prop}: ${d.value} }`, confidence: "mechanical", verdict: A.white, note: "a light background behind an image on a page with a dark background" }); }
    }
    for (const m of raw.matchAll(/<img\b[^>]*\bsrc\s*=\s*["']([^"']*(?:logo|brand|mark|icon)[^"']*\.(?:jpe?g|bmp)(?:\?[^"']*)?)["'][^>]*>/gi)) add({ rule: "opaque-logo-format", line: lineOf(m.index), span: m[1], confidence: "candidate", verdict: A.white, note: "a logo saved as a format with no transparency on a dark page; check the picture itself for a white box" });
    for (const m of raw.matchAll(/<img\b[^>]*\bstyle\s*=\s*"[^"]*background(?:-color)?\s*:\s*(#fff(?:fff)?|white)[^"]*"/gi)) add({ rule: "white-behind-image", line: lineOf(m.index), span: m[0].slice(0, 80), confidence: "mechanical", verdict: A.white });
  }

  // heading sizes against body size
  const sizeOf = (sel) => { const out = []; for (const b of blocks) if (sel.test(b.selector)) for (const d of b.decls) if (d.prop === "font-size") { const px = toPx(d.value); if (px) out.push({ px, line: lineOf(d.idx), sel: b.selector, value: d.value }); } return out; };
  const bodyFs = sizeOf(/(^|[\s,])(html|body|:root)(?=[\s,.:]|$)/);
  const bodyPx = bodyFs.length ? bodyFs[bodyFs.length - 1].px : 16;
  const heads = sizeOf(/(^|[\s,])(h1|h2|h3|\.hero[\w-]*|\.title|\.headline|\.display)(?=[\s,.:{]|$)/);
  for (const h of heads) if (h.px >= 3 * bodyPx) add({ rule: "heading-far-above-body", line: h.line, span: `${h.sel} { font-size: ${h.value} }`, confidence: "mechanical", verdict: A.shout, also: A.dense, note: `about ${Math.round(h.px)}px against a body of ${Math.round(bodyPx)}px (${(h.px / bodyPx).toFixed(1)} times; vw read at 1440px; clamp worked out at 1440px)` });
  for (const m of raw.matchAll(/<(h[1-3])\b[^>]*class\s*=\s*"[^"]*\btext-(?:5|6|7|8|9)xl\b[^"]*"/gi)) add({ rule: "heading-far-above-body", line: lineOf(m.index), span: m[0].slice(0, 80), confidence: "mechanical", verdict: A.shout, also: A.dense, note: "a Tailwind size of 48px or more on a heading" });

  // pills
  for (const b of blocks) for (const d of b.decls) if (/^border-radius$/.test(d.prop)) {
    const big = d.value.split(/\s+/).map((v) => toPx(v)).some((px) => px >= 100) || /\b9{3,}|100vmax|infinity/i.test(d.value);
    if (big) add({ rule: "pill-shape", line: lineOf(d.idx), span: `${b.selector} { border-radius: ${d.value} }`, confidence: "mechanical", verdict: A.pills, note: "a fully rounded shape; fine for a round dot, a pill when the element is wider than tall" });
  }
  for (const m of raw.matchAll(/\b(rounded-full|rounded-pill)\b/g)) add({ rule: "pill-shape", line: lineOf(m.index), span: m[0], confidence: "candidate", verdict: A.pills });
  for (const m of raw.matchAll(/(?:class\s*=\s*"[^"]*|^|[\s,]\.)\b(pill|pills|chip|badge)\b/gim)) add({ rule: "pill-named", line: lineOf(m.index), span: m[1], confidence: "candidate", verdict: A.pills, note: "named like a pill" });

  // chevrons by name
  for (const m of raw.matchAll(/\b(chevron|caret|disclosure-arrow)[-\w]*/gi)) add({ rule: "chevron-name", line: lineOf(m.index), span: m[0], confidence: "candidate", verdict: A.chevron, note: "chevrons are banned for expand and collapse (2026-10-13)" });

  // glyphs, Japanese
  const visible = [".css", ".scss", ".less"].includes(ext) ? raw : raw.replace(/<(script|style)[\s\S]*?<\/\1>/gi, (m) => (/<style/i.test(m) ? m : blank(m))).replace(/<!--[\s\S]*?-->/g, blank);
  for (const m of visible.matchAll(GLYPH_RE)) add({ rule: "decorative-glyph", line: lineOf(m.index), span: m[0], context: visible.slice(Math.max(0, m.index - 20), m.index + 25).replace(/\s+/g, " ").trim(), confidence: "mechanical", verdict: A.glyph });
  for (const m of visible.matchAll(JAPANESE_RE)) add({ rule: "japanese-text", line: lineOf(m.index), span: m[0].slice(0, 40), confidence: "mechanical", verdict: A.japanese });
  // content: "..." with glyphs from CSS escapes
  for (const m of raw.matchAll(/content\s*:\s*["']\\(25c6|25cf|2726|203a|00bb|25b6|25b8|25be|2605)["']/gi)) add({ rule: "decorative-glyph", line: lineOf(m.index), span: m[0], confidence: "mechanical", verdict: A.glyph, note: "a glyph set by CSS content" });

  found.sort((a, b) => (a.line ?? 0) - (b.line ?? 0));
  const nr = anchored(found, verdict);
  found.splice(0, found.length, ...nr.kept);
  const byRule = {};
  for (const h of found) byRule[h.rule] = (byRule[h.rule] ?? 0) + 1;
  const cut = Math.max(0, found.length - 60);
  const { results: shown, verdicts } = bundle(found.slice(0, 60), verdict);
  const out = {
    file: name,
    colorsFound: colours.length,
    colours: [...new Set(colours.map((x) => x.c.text.toLowerCase()))].slice(0, 40),
    hits: found.length,
    ...(Object.keys(nr.notRecorded).length ? { notRecorded: nr.notRecorded } : {}),
    byRule,
    shown: shown.length,
    cut,
    results: shown,
    verdicts,
    confidence: "mechanical: certain from the source; candidate: depends on use",
    cannotSee: ["how the page renders: spacing, alignment, density, whether it looks finished or busy", "the pictures themselves: a white box inside a logo file, a broken image, whether a logo copies another project's", "whether colours stay apart for a reader with colour-vision deficiency, without a simulation", "whether a glyph, number or element means anything", "whether copy is a tagline or a persuasion line: use check-text and the writing kit", "motion"],
    needs: "The look itself needs a reviewer that can see it (a reviewer agent that can view images, or the person): this check only reads source.",
  };
  if (colours.length) { const r = verdict(A.blind); if (r.at) out.colourRule = r; }
  return out;
}
