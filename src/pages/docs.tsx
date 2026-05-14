import React, { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { useQuery } from 'react-query'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'

import { cn } from 'src/class_utils'
import { Loader } from 'src/components/loader/loader'
import { Navigation } from 'src/components/navigation/navigation'
import { UserLevel } from 'src/components/navigation/navigation'

type Props = {
  level?: UserLevel
}

type Doc = 'GUIDE' | 'GUIDE-EXPERT'
const DOCS: readonly Doc[] = ['GUIDE', 'GUIDE-EXPERT'] as const

const fetchDoc = (name: Doc) =>
  fetch(`/docs/${name}.md`).then(res => {
    if (!res.ok) throw new Error('Failed to load')
    return res.text()
  })

function makeComponents(
  onAnchor: (doc: Doc) => void,
): React.ComponentProps<typeof ReactMarkdown>['components'] {
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
      // Hash-only links route to a doc tab (e.g. [Dashboard Guide](#GUIDE)).
      if (href?.startsWith('#')) {
        const target = href.slice(1) as Doc
        if (DOCS.includes(target)) {
          return (
            <button
              onClick={() => onAnchor(target)}
              className="text-primary hover:underline cursor-pointer bg-transparent border-0 p-0 font-inherit"
            >
              {children}
            </button>
          )
        }
      }
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
        <code className="font-mono text-[0.82em] bg-muted text-foreground px-1 py-0.5 rounded border border-border">
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

export const DocsPage: React.FC<Props> = ({ level }) => {
  const isExpert = level === UserLevel.Expert
  // When navigating directly to a hash anchor (e.g. from a breakdown "Guide →"
  // link), all substantive section anchors live in GUIDE.md. Default to GUIDE
  // so the scroll target is present regardless of which expert tab was last open.
  const [activeDoc, setActiveDoc] = useState<Doc>(
    isExpert && !window.location.hash ? 'GUIDE-EXPERT' : 'GUIDE',
  )

  const { data, status } = useQuery(
    ['doc', activeDoc],
    () => fetchDoc(activeDoc),
    { staleTime: Infinity },
  )

  const components = useMemo(() => makeComponents(setActiveDoc), [])

  // Scroll to the URL hash anchor once the doc has rendered. Re-runs on
  // doc-tab switch and on browser hash changes (back/forward navigation).
  useEffect(() => {
    if (status !== 'success') return undefined
    const hash = window.location.hash.slice(1)
    if (!hash) return undefined
    // Defer one frame so the markdown DOM is mounted before we look up the id.
    const id = requestAnimationFrame(() => {
      const el = document.getElementById(hash)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    return () => cancelAnimationFrame(id)
  }, [status, activeDoc])

  return (
    <div className="bg-background-page min-h-screen">
      <Navigation level={level} />
      <div className="flex justify-center px-4 sm:px-6">
        <div className="w-full max-w-3xl">
          {isExpert && (
            <div className="flex gap-1 pt-4 border-b border-border mb-0">
              {DOCS.map(doc => (
                <button
                  key={doc}
                  onClick={() => setActiveDoc(doc)}
                  className={cn(
                    'px-3 py-2 text-[13px] font-medium border-b-2 transition-colors -mb-px',
                    activeDoc === doc
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  {doc === 'GUIDE' ? 'Guide' : 'Expert Guide'}
                </button>
              ))}
            </div>
          )}
          <div className="py-10">
            {status === 'loading' && <Loader />}
            {status === 'error' && (
              <p className="text-sm text-destructive">Failed to load docs.</p>
            )}
            {status === 'success' && data && (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={components}
              >
                {data}
              </ReactMarkdown>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
