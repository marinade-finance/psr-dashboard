import React, { useEffect, useMemo, useRef, useState } from 'react'

import { cn } from 'src/class_utils'
import { Input } from 'src/components/ui/input'
import { ValidatorIdentity } from 'src/components/validator-identity/validator-identity'

import type { AuctionValidator } from '@marinade.finance/ds-sam-sdk'

type Props = {
  validators: AuctionValidator[]
  nameMap: Map<string, { name?: string; countryIso?: string | null }>
  onSelect: (voteAccount: string) => void
  className?: string
}

type Match = {
  voteAccount: string
  name: string
  rank: number
}

const MAX_RESULTS = 8

export function findMatches(
  query: string,
  validators: AuctionValidator[],
  nameMap: Map<string, { name?: string }>,
): Match[] {
  const q = query.trim()
  if (q.length < 2) return []
  const qLower = q.toLowerCase()

  const exactVote: Match[] = []
  const votePrefix: Match[] = []
  const nameStarts: Match[] = []
  const nameContains: Match[] = []

  for (const validator of validators) {
    const vote = validator.voteAccount
    const name = nameMap.get(vote)?.name ?? ''
    const nameLower = name.toLowerCase()

    if (vote === q) {
      exactVote.push({ voteAccount: vote, name, rank: 0 })
      continue
    }
    if (vote.toLowerCase().startsWith(qLower)) {
      votePrefix.push({ voteAccount: vote, name, rank: 1 })
      continue
    }
    if (name && nameLower.startsWith(qLower)) {
      nameStarts.push({ voteAccount: vote, name, rank: 2 })
      continue
    }
    if (name && nameLower.includes(qLower)) {
      nameContains.push({ voteAccount: vote, name, rank: 3 })
    }
  }

  return [...exactVote, ...votePrefix, ...nameStarts, ...nameContains].slice(
    0,
    MAX_RESULTS,
  )
}

export const ValidatorSearch: React.FC<Props> = ({
  validators,
  nameMap,
  onSelect,
  className,
}) => {
  const [query, setQuery] = useState('')
  const [highlighted, setHighlighted] = useState(0)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const matches = useMemo(
    () => findMatches(query, validators, nameMap),
    [query, validators, nameMap],
  )

  useEffect(() => setHighlighted(0), [query])

  useEffect(() => {
    const onClick = (e: MouseEvent): void => {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const select = (vote: string) => {
    onSelect(vote)
    setQuery('')
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setQuery('')
      setOpen(false)
      return
    }
    if (matches.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted(h => Math.min(h + 1, matches.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted(h => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const match = matches[highlighted]
      if (match) select(match.voteAccount)
    }
  }

  const showDropdown = open && query.trim().length >= 2

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      <Input
        type="search"
        value={query}
        placeholder="Find validator by name or vote account…"
        spellCheck={false}
        autoComplete="off"
        aria-label="Find validator"
        aria-expanded={showDropdown}
        aria-controls="validator-search-listbox"
        onChange={e => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {showDropdown && (
        <div
          id="validator-search-listbox"
          role="listbox"
          className="absolute z-30 mt-1 w-full rounded-md border border-border-grid bg-card shadow-lg overflow-hidden"
        >
          {matches.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              No validator matches “{query.trim()}”.
            </div>
          )}
          {matches.map((match, i) => (
            <button
              key={match.voteAccount}
              type="button"
              role="option"
              aria-selected={i === highlighted}
              className={cn(
                'w-full text-left px-3 py-2 transition-colors',
                i === highlighted ? 'bg-accent' : 'hover:bg-accent',
              )}
              onMouseEnter={() => setHighlighted(i)}
              onClick={() => select(match.voteAccount)}
            >
              <ValidatorIdentity
                name={match.name}
                voteAccount={match.voteAccount}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
