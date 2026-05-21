#!/usr/bin/env node
/**
 * Captures a snapshot of live Marinade API data and saves it to
 * src/fixtures/snapshot/ for use in stress tests.
 *
 * Usage:
 *   node scripts/capture-fixtures.js
 *
 * Output files:
 *   src/fixtures/snapshot/auction-result.json   – full AuctionResult (Set → array)
 *   src/fixtures/snapshot/meta.json             – capture timestamp + validator count
 */

'use strict'

const fs = require('fs')
const path = require('path')

const https = require('https')

const {
  DsSamSDK,
  InputsSource,
  LogVerbosity,
  loadSamConfig,
} = require('../node_modules/@marinade.finance/ds-sam-sdk/dist/src/index.js')

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve(JSON.parse(Buffer.concat(chunks).toString())))
      res.on('error', reject)
    }).on('error', reject)
  })
}

// JSON files go to public/snapshot/ so the Vite preview server serves them
// at /snapshot/* without bundling. The src/fixtures/snapshot/ directory is
// kept as a parallel copy for tooling that reads from src/.
const OUT_DIR = path.join(__dirname, '../public/snapshot')

// Recursively sanitise the auction result before JSON.stringify.
// lastCapConstraint.validators contains references to other AuctionValidator
// objects, which themselves have lastCapConstraint properties — a cycle that
// JSON.stringify cannot handle. We detect constraint objects by the presence
// of constraintType + a validators array and drop the nested validator list
// (it's redundant — the vote accounts are already in the top-level array).
function sanitize(value) {
  if (value instanceof Set) return { setType: 'Set', values: [...value] }
  if (Array.isArray(value)) return value.map(sanitize)
  if (value && typeof value === 'object') {
    const result = {}
    for (const [k, v] of Object.entries(value)) {
      // Constraint objects: drop the back-references to validators so we
      // don't recurse into a cycle. The UI uses constraintName/type/totals,
      // not the individual validators list.
      if (k === 'validators' && 'constraintType' in value) {
        result[k] = []
      } else {
        result[k] = sanitize(v)
      }
    }
    return result
  }
  return value
}

async function main() {
  console.log('Loading SAM config …')
  const config = await loadSamConfig()

  const sdk = new DsSamSDK({
    ...config,
    inputsSource: InputsSource.APIS,
    cacheInputs: false,
    debugVoteAccounts: [],
    logVerbosity: LogVerbosity.ERROR,
  })

  console.log('Running auction (this fetches live APIs — ~10–30 s) …')
  const auctionResult = await sdk.runFinalOnly()

  const validatorCount = auctionResult.auctionData.validators.length
  console.log(`Got ${validatorCount} validators, winning PMPE = ${auctionResult.winningTotalPmpe.toFixed(3)}`)

  fs.mkdirSync(OUT_DIR, { recursive: true })

  const auctionPath = path.join(OUT_DIR, 'auction-result.json')
  fs.writeFileSync(auctionPath, JSON.stringify(sanitize(auctionResult), null, 0))
  console.log(`Saved → ${auctionPath}  (${(fs.statSync(auctionPath).size / 1024).toFixed(0)} KB)`)

  // Capture validator names (vote_account → info_name) from validators API
  console.log('Fetching validator names …')
  const validatorsRes = await httpsGet(
    'https://validators-api.marinade.finance/validators?limit=9999&epochs=1',
  )
  const nameMap = {}
  for (const v of validatorsRes.validators ?? []) {
    if (v.info_name) nameMap[v.vote_account] = v.info_name
  }
  const namesPath = path.join(OUT_DIR, 'validator-names.json')
  fs.writeFileSync(namesPath, JSON.stringify(nameMap, null, 0))
  console.log(`Saved → ${namesPath}  (${Object.keys(nameMap).length} named validators)`)

  const metaPath = path.join(OUT_DIR, 'meta.json')
  fs.writeFileSync(
    metaPath,
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        validatorCount,
        winningTotalPmpe: auctionResult.winningTotalPmpe,
        epoch: auctionResult.auctionData.epoch,
      },
      null,
      2,
    ),
  )
  console.log(`Saved → ${metaPath}`)
  console.log('Done.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
