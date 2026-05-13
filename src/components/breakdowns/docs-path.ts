export function docsPath(level?: string): string {
  return level === 'expert' ? '/expert-docs' : '/docs'
}
