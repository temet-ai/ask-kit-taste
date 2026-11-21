export const meta = {
  purpose:
    "the recorded verdicts by date, newest first: what was recorded most recently, on everything or on one subject, section or kind. One event per date in an item; items without a date are counted.",
  params: { subject: "plain words, optional", section: "part of a section name, e.g. 'Visual work', optional", kind: "rejects, accepts, rule or voice, optional", since: "YYYY-MM-DD, optional", until: "YYYY-MM-DD, optional", max: "default 30" },
  returns: "{file, subject, events, shown, undatedItems, results:[{date, at, section, kind, quotes, text}], note}",
  example: 'await scripts.run("timeline", { subject: "logo", since: "2026-11-01" })',
};

export default async function ({ taste }, params = {}) {
  return taste.timeline(params);
}
