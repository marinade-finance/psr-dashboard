#!/usr/bin/env bun
import { $ } from 'bun'
import { mkdir, writeFile, readFile } from 'node:fs/promises'

const SPEC_DIR = 'src/schemas/openapi'
const OUT_DIR = 'src/schemas/generated'

await mkdir(SPEC_DIR, { recursive: true })
await mkdir(OUT_DIR, { recursive: true })

async function fetchSpec(name: string, url: string) {
  console.log(`Fetching ${name}...`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${name}: ${res.status} ${res.statusText}`)
  await writeFile(`${SPEC_DIR}/${name}.json`, await res.text())
}

await fetchSpec('validators', 'https://validators-api.marinade.finance/docs.json')
await fetchSpec('bonds', 'https://validator-bonds-api.marinade.finance/docs.json')
await fetchSpec('scoring', 'https://scoring.marinade.finance/docs.json')
await fetchSpec('notifications', 'https://marinade-notifications.marinade.finance/docs-json')

// Hoist inline $defs (JSON Schema 2020-12) to components/schemas
// so openapi-zod-client's ref parser can resolve them.
function hoistDefs(obj: unknown, schemas: Record<string, unknown>): unknown {
  if (Array.isArray(obj)) return obj.map(item => hoistDefs(item, schemas))
  if (obj !== null && typeof obj === 'object') {
    const o = obj as Record<string, unknown>
    if ('$defs' in o) {
      const defs = o['$defs'] as Record<string, unknown>
      for (const [name, schema] of Object.entries(defs)) {
        schemas[name] = hoistDefs(schema, schemas)
      }
      delete o['$defs']
    }
    return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, hoistDefs(v, schemas)]))
  }
  return obj
}

const notifText = await readFile(`${SPEC_DIR}/notifications.json`, 'utf8')
const notifDoc = JSON.parse(notifText) as Record<string, unknown>

const components = (notifDoc['components'] ??= {}) as Record<string, unknown>
const schemasTarget = (components['schemas'] ??= {}) as Record<string, unknown>

const hoisted = hoistDefs(notifDoc, schemasTarget) as Record<string, unknown>
hoisted['components'] = { ...(hoisted['components'] as object), schemas: schemasTarget }

const fixed = JSON.stringify(hoisted, null, 2).replace(/"#\/\$defs\/([^"]+)"/g, '"#/components/schemas/$1"')
await writeFile(`${SPEC_DIR}/notifications.json`, fixed)

// Deduplicate operationIds in place — openapi-zod-client uses them as Zodios
// aliases and throws on the first collision at runtime.
function dedupeOperationIds(doc: Record<string, unknown>) {
  const paths = doc['paths'] as Record<string, Record<string, unknown>> | undefined
  if (!paths) return
  const seen = new Map<string, number>()
  for (const methods of Object.values(paths)) {
    for (const op of Object.values(methods)) {
      if (op === null || typeof op !== 'object') continue
      const o = op as Record<string, unknown>
      const id = o['operationId']
      if (typeof id !== 'string') continue
      const n = (seen.get(id) ?? 0) + 1
      seen.set(id, n)
      if (n > 1) o['operationId'] = `${id} ${n}`
    }
  }
}

async function generate(name: string) {
  console.log(`Generating ${name}...`)
  const text = await readFile(`${SPEC_DIR}/${name}.json`, 'utf8')
  const doc = JSON.parse(text) as Record<string, unknown>
  dedupeOperationIds(doc)
  await writeFile(`${SPEC_DIR}/${name}.json`, JSON.stringify(doc))
  await $`npx openapi-zod-client ${SPEC_DIR}/${name}.json -o ${OUT_DIR}/${name}.ts`
  // Remove the no-baseUrl `export const api = new Zodios(endpoints)` line that
  // openapi-zod-client emits — it throws at module load without a baseUrl and
  // is never used (callers use `schemas.*` directly or `createApiClient`).
  const generated = await Bun.file(`${OUT_DIR}/${name}.ts`).text()
  await Bun.write(
    `${OUT_DIR}/${name}.ts`,
    generated.replace(/^export const api = new Zodios\(endpoints\)\n\n/m, ''),
  )
}

await generate('validators')
await generate('bonds')
await generate('scoring')
await generate('notifications')

console.log(`Done. Schemas in ${OUT_DIR}/`)
