import { blogTagMeanings } from '../../tag-meanings'

/** What a Tag means (layers/blog/GLOSSARY.md: Tag); undefined outside the vocabulary. */
export const blogTagMeaning = (tag: string): string | undefined =>
  (blogTagMeanings as Record<string, string>)[tag]
