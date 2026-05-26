export type ArticleSection =
  | { type: 'paragraph'; html: string }
  | { type: 'h2'; text: string; id: string }
  | { type: 'h3'; text: string; id?: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'callout'; variant: 'info' | 'warning' | 'tip' | 'danger'; title?: string; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'highlight'; text: string }
  | { type: 'cta'; variant: 'form' | 'telegram'; title: string; text: string; buttonLabel: string }
  | { type: 'divider' };
