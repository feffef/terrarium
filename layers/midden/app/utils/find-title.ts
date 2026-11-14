// A find's title is a lowercase phrase on its card; the front door's Latest
// finds list starts a line with it, so it gets a capital, except a file or code
// name (app.vue, shared/x.ts), whose case is part of its name (#3319).
export function middenFindTitle(title: string): string {
  const first = title.split(/\s/, 1)[0] ?? ''
  if (/[./_]/.test(first)) return title
  return title.charAt(0).toUpperCase() + title.slice(1)
}
