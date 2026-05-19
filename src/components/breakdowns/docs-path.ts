// Route base for the in-app guide. Callers append a `#anchor` fragment;
// the docs page (src/pages/docs.tsx) resolves that anchor to whichever
// guide page now owns it, so anchor ids stay stable across doc restructures.
export function docsPath(level?: string): string {
  return level === 'expert' ? '/expert-docs' : '/docs'
}
