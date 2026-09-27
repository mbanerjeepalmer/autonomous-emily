/** Turn an attached filename into a searchable query when the buyer typed nothing. */
export function filenameToQuery(name: string | undefined): string {
  if (!name?.trim()) return "";
  return name
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_./-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
