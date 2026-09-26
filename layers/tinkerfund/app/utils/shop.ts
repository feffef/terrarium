export function tinkerfundPath(space: string, path = ''): string {
  return `/t/tinkerfund/${space}${path}`
}

export function tinkerfundCampaignPath(space: string, slug: string): string {
  return tinkerfundPath(space, `/campaigns/${slug}`)
}

export function tinkerfundSlug(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1)
}

export function tinkerfundCount(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? '' : 's'}`
}
