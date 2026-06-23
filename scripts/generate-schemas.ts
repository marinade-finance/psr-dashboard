#!/usr/bin/env bun
import { $ } from 'bun'
import { mkdir } from 'node:fs/promises'

const SPEC_DIR = 'src/schemas/openapi'
const OUT_DIR = 'src/schemas/generated'

await mkdir(SPEC_DIR, { recursive: true })
await mkdir(OUT_DIR, { recursive: true })

const SPECS = {
  validators: 'https://validators-api.marinade.finance/docs.json',
  bonds: 'https://validator-bonds-api.marinade.finance/docs.json',
  scoring: 'https://scoring.marinade.finance/docs.json',
  notifications: 'https://marinade-notifications.marinade.finance/docs-json',
}

for (const [name, url] of Object.entries(SPECS)) {
  console.log(`Fetching ${name}...`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${name}: ${res.status} ${res.statusText}`)
  let doc = (await res.json()) as Record<string, unknown>

  // notifications uses $defs (JSON Schema 2020-12) — hoist to components/schemas
  if (name === 'notifications') doc = hoistDefs(doc)

  // dedupe colliding operationIds (openapi-zod-client uses them as Zodios aliases)
  dedupeOperationIds(doc)

  await Bun.write(`${SPEC_DIR}/${name}.json`, JSON.stringify(doc))
  await $`npx openapi-zod-client ${SPEC_DIR}/${name}.json -o ${OUT_DIR}/${name}.ts`

  // strip the no-baseUrl `export const api = new Zodios(endpoints)` the tool emits
  const src = await Bun.file(`${OUT_DIR}/${name}.ts`).text()
  await Bun.write(
    `${OUT_DIR}/${name}.ts`,
    src.replace(/^export const api = new Zodios\(endpoints\)\n\n/m, ''),
  )
}

console.log(`Done. Schemas in ${OUT_DIR}/`)

function hoistDefs(doc: Record<string, unknown>): Record<string, unknown> {
  const schemas: Record<string, unknown> = {}
  const walked = walk(doc, schemas) as Record<string, unknown>
  const components = (walked.components ?? {}) as Record<string, unknown>
  walked.components = {
    ...components,
    schemas: { ...schemas, ...((components.schemas as object) ?? {}) },
  }
  return JSON.parse(
    JSON.stringify(walked).replace(
      /"#\/\$defs\/([^"]+)"/g,
      '"#/components/schemas/$1"',
    ),
  )
}

function walk(v: unknown, schemas: Record<string, unknown>): unknown {
  if (Array.isArray(v)) return v.map(x => walk(x, schemas))
  if (v !== null && typeof v === 'object') {
    const o = { ...(v as Record<string, unknown>) }
    if ('$defs' in o) {
      Object.assign(schemas, o['$defs'])
      delete o['$defs']
    }
    return Object.fromEntries(
      Object.entries(o).map(([k, val]) => [k, walk(val, schemas)]),
    )
  }
  return v
}

function dedupeOperationIds(doc: Record<string, unknown>) {
  const seen = new Map<string, number>()
  for (const methods of Object.values(
    (doc.paths ?? {}) as Record<string, Record<string, unknown>>,
  )) {
    for (const op of Object.values(methods)) {
      if (!op || typeof op !== 'object') continue
      const o = op as Record<string, unknown>
      if (typeof o.operationId !== 'string') continue
      const n = (seen.get(o.operationId) ?? 0) + 1
      seen.set(o.operationId, n)
      if (n > 1) o.operationId = `${o.operationId} ${n}`
    }
  }
}
