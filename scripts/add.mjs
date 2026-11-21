export const meta = {
  purpose:
    "Record a new verdict in the taste file, in the file's form: `- <date>, <lead>: \"<their exact words>\"`, at the end of the section's list, after writing a backup. Needs their exact words and the date they said them; refuses without either, and refuses words the file already holds. Changes the file, so the ask must have act: true.",
  params: { section: "a section path, or a unique part of it: 'Visual work > What they reject', 'Motion and video', 'Writing > What they reject'", lead: "the subject and place in a few words, e.g. 'landing copy'", words: "their exact words as typed", date: "YYYY-MM-DD, the day they said it" },
  returns: "{file, backup, section, atLine, inserted, changedQuotes}",
  example: 'await scripts.run("add", { section: "Visual work > What they reject", lead: "the Guild footer", words: "...", date: "2026-11-20" })',
};

export default async function ({ taste }, { section, lead, words, date } = {}) {
  return taste.add({ section, lead, words, date });
}
