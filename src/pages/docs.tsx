import { useQuery } from '@tanstack/react-query'
import React, { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'

import { cn } from 'src/class_utils'
import { Loader } from 'src/components/loader/loader'
import { Navigation } from 'src/components/navigation/navigation'

type Props = {
  level?: string
}

// The document is split into navigable pages by `<!-- page: id | Title -->`
// markers (see public/docs/GUIDE.md).
type Doc = 'GUIDE'
const DOCS: readonly Doc[] = ['GUIDE'] as const

const fetchDoc = (name: Doc) =>
  fetch(`/docs/${name}.md`).then(res => {
    if (!res.ok) throw new Error('Failed to load')
    return res.text()
  })

type Page = {
  id: string
  title: string
  body: string
  anchors: string[]
}

const PAGE_MARKER = /^<!--\s*page:\s*([\w-]+)(?:\s*\|\s*([^>]+?))?\s*-->\s*$/
const ANCHOR_RE = /<a\s+id="([\w-]+)"\s*>/g

// Split the raw markdown on `<!-- page: id | Title -->` lines into ordered
// pages. A marker without a title (`<!-- page: id -->`) re-opens an earlier
// page so its body slices concatenate in source order — this lets a guide
// return to "Key Concepts" after the Bonds/Penalties pages without renaming
// any anchor ids. Anything before the first marker is dropped (there is
// always a leading marker in the source docs).
function splitPages(md: string): Page[] {
  const order: string[] = []
  const byId = new Map<string, Page>()
  let current: Page | null = null
  for (const line of md.split('\n')) {
    const m = line.match(PAGE_MARKER)
    if (m) {
      const id = m[1]
      const title = m[2]?.trim()
      let page = byId.get(id)
      if (!page) {
        page = { id, title: title || id, body: '', anchors: [] }
        byId.set(id, page)
        order.push(id)
      } else if (title) {
        page.title = title
      }
      current = page
      continue
    }
    if (current) current.body += line + '\n'
  }
  const pages = order.flatMap(id => {
    const p = byId.get(id)
    return p ? [p] : []
  })
  for (const p of pages) {
    p.anchors = [...p.body.matchAll(ANCHOR_RE)].map(a => a[1])
  }
  return pages
}

function makeComponents(): React.ComponentProps<
  typeof ReactMarkdown
>['components'] {
  return {
    h1: ({ children }) => (
      <h1 className="text-2xl font-semibold text-foreground mb-2 leading-tight">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-lg font-semibold text-foreground mt-10 mb-3 pt-10 border-t border-border">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-base font-semibold text-foreground mt-7 mb-2">
        {children}
      </h3>
    ),
    p: ({ children }) => (
      <p className="text-sm text-muted-foreground mb-3.5 leading-relaxed">
        {children}
      </p>
    ),
    a: ({ href, children }) => {
      return (
        <a
          href={href}
          className="text-primary hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          {children}
        </a>
      )
    },
    strong: ({ children }) => (
      <strong className="font-semibold text-foreground">{children}</strong>
    ),
    code: ({ className, children }) => {
      const isBlock = Boolean(className?.startsWith('language-'))
      if (isBlock) {
        return (
          <code
            className={cn('font-mono text-sm text-muted-foreground', className)}
          >
            {children}
          </code>
        )
      }
      return (
        <code className="font-mono text-[0.82em] bg-muted text-foreground px-1.5 py-0.5 rounded-sm box-decoration-clone break-all">
          {children}
        </code>
      )
    },
    pre: ({ children }) => (
      <pre className="bg-muted border border-border rounded-lg px-5 py-4 overflow-x-auto my-4 text-sm">
        {children}
      </pre>
    ),
    ul: ({ children }) => (
      <ul className="list-disc ml-5 my-3 text-sm text-muted-foreground space-y-1">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal ml-5 my-3 text-sm text-muted-foreground space-y-1">
        {children}
      </ol>
    ),
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    hr: () => <hr className="border-border my-9" />,
    blockquote: ({ children }) => (
      <blockquote className="bg-muted pl-5 py-2.5 my-4 rounded-md text-sm">
        {children}
      </blockquote>
    ),
    table: ({ children }) => (
      <div className="overflow-x-auto my-5">
        <table className="w-full text-sm border-collapse">{children}</table>
      </div>
    ),
    th: ({ children }) => (
      <th className="text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-muted px-3.5 py-2.5 text-left border-b border-border">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-3.5 py-2.5 text-muted-foreground border-b border-border align-top text-sm">
        {children}
      </td>
    ),
    tr: ({ children }) => (
      <tr className="[&:last-child_td]:border-0">{children}</tr>
    ),
  }
}

export const DocsPage: React.FC<Props> = () => {
  const activeDoc: Doc = 'GUIDE'
  const [pageId, setPageId] = useState<string | null>(null)
  // Bumped on browser hash navigation so the page resolver re-reads the
  // hash and jumps to whichever page now owns the anchor.
  const [hashTick, setHashTick] = useState(0)

  useEffect(() => {
    const onHash = () => {
      setPageId(null)
      setHashTick(t => t + 1)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const { data, status } = useQuery({
    queryKey: ['doc', activeDoc],
    queryFn: () => fetchDoc(activeDoc),
    staleTime: Infinity,
  })

  const pages = useMemo(() => (data ? splitPages(data) : []), [data])

  // anchor id -> page id, derived from the rendered slices so it can never
  // drift from the markdown. Legacy links like /docs#bond resolve through
  // this map to whichever page now holds that anchor.
  const anchorToPage = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of pages) for (const a of p.anchors) m.set(a, p.id)
    return m
  }, [pages])

  const components = useMemo(() => makeComponents(), [])

  // Resolve the current page: an explicit user selection wins; otherwise a
  // URL hash picks the page that owns the anchor; otherwise the first page.
  const activePage = useMemo(() => {
    if (!pages.length) return null
    if (pageId) return pages.find(p => p.id === pageId) ?? pages[0]
    const hash = window.location.hash.slice(1)
    if (hash) {
      const owner = anchorToPage.get(hash)
      if (owner) return pages.find(p => p.id === owner) ?? pages[0]
    }
    return pages[0]
  }, [pages, pageId, anchorToPage, hashTick])

  // Scroll to the URL hash anchor once the owning page has rendered, and
  // flash a brief highlight. Re-runs on page switch and on hash changes
  // (browser back/forward). Anchors are <a id="..."> just before a heading;
  // we flash both so the eye lands on something visible.
  useEffect(() => {
    if (status !== 'success' || !activePage) return undefined
    const hash = window.location.hash.slice(1)
    if (!hash || DOCS.includes(hash as Doc)) return undefined
    if (!activePage.anchors.includes(hash)) return undefined
    const id = requestAnimationFrame(() => {
      const el = document.getElementById(hash)
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      const targets: Element[] = [el]
      const next = el.nextElementSibling
      if (next && /^H[1-6]$/.test(next.tagName)) targets.push(next)
      for (const t of targets) {
        t.classList.add('anchor-highlight')
        setTimeout(() => t.classList.remove('anchor-highlight'), 2200)
      }
    })
    return () => {
      cancelAnimationFrame(id)
    }
  }, [status, activePage, hashTick])

  const selectPage = (id: string) => {
    setPageId(id)
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="bg-background-page min-h-screen">
      <Navigation />
      <div className="flex justify-center px-4 sm:px-6">
        <div className="w-full max-w-5xl">
          <div className="flex flex-col md:flex-row gap-8 py-10">
            <nav className="md:w-56 shrink-0">
              <ul className="flex flex-row flex-wrap md:flex-col gap-1 md:sticky md:top-6">
                {pages.map(p => (
                  <li key={p.id}>
                    <button
                      onClick={() => selectPage(p.id)}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-md text-mid font-medium transition-colors',
                        activePage?.id === p.id
                          ? 'bg-primary-light text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                      )}
                    >
                      {p.title}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="min-w-0 flex-1">
              {status === 'pending' && <Loader />}
              {status === 'error' && (
                <p className="text-sm text-destructive">Failed to load docs.</p>
              )}
              {status === 'success' && activePage && (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  components={components}
                >
                  {activePage.body}
                </ReactMarkdown>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
