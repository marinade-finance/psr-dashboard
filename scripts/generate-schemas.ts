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

async function generate(name: string) {
  console.log(`Generating ${name}...`)
  await $`npx openapi-zod-client ${SPEC_DIR}/${name}.json -o ${OUT_DIR}/${name}.ts`
}

await generate('validators')
await generate('bonds')
await generate('scoring')
await generate('notifications')

console.log(`Done. Schemas in ${OUT_DIR}/`)
