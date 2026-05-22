// Typed error preserves status + url so callers (and downstream telemetry)
// can branch on transport vs application errors without parsing strings.
export class FetchError extends Error {
  public readonly status: number
  public readonly url: string

  constructor(status: number, statusText: string, url: string) {
    super(`${status} ${statusText}: ${url}`)
    this.name = 'FetchError'
    this.status = status
    this.url = url
  }
}

// `signal` is forwarded so react-query's automatic cancellation
// (passed via the queryFn context) actually aborts the in-flight fetch when
// a query is invalidated, the component unmounts, or a new query supersedes
// this one. Without it, react-query thinks it cancelled but the network
// request lingers and its eventual completion can race the newer one.
//
// `validate` is a runtime schema check at the API boundary. The default
// (`unknown`) preserves the existing trust-the-wire-format behavior; callers
// SHOULD pass a validator so a backend rename throws here with context
// instead of cascading `undefined` through downstream math (→ NaN displays).
export async function fetchJson<T>(
  url: string,
  signal?: AbortSignal,
  validate?: (body: unknown) => T,
): Promise<T> {
  const res = await fetch(url, { signal })
  if (!res.ok) {
    throw new FetchError(res.status, res.statusText, url)
  }
  // No content-type assertion: the Marinade backends serve JSON with
  // `text/plain; charset=utf-8` (misconfigured but the entrenched reality),
  // so an `application/json` check would false-positive on every real call.
  // Instead, wrap `res.json()` so a parse failure carries URL context — that
  // covers the captive-portal / CDN-error-page case without the false reject.
  let body: unknown
  try {
    body = await res.json()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new FetchError(res.status, `JSON parse failed: ${msg}`, url)
  }
  if (validate) {
    try {
      return validate(body)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      throw new FetchError(res.status, `Schema validation: ${msg}`, url)
    }
  }
  return body as T
}

// Small, dependency-free helpers for the most common boundary checks.
// Throwing inside validate() bubbles up as a FetchError with context.
//
// If the validation surface grows past a handful of fields per endpoint —
// nested shapes, unions, optional/nullable variants, derived types — replace
// these helpers with `zod` (or `valibot` for a lighter footprint). Both give
// you composable schemas + inferred TypeScript types + better error messages
// than what we can hand-roll here. ~10 KB gzipped is a fair price once
// runtime validation becomes load-bearing.
export const expectArray = (value: unknown, label: string): unknown[] => {
  if (!Array.isArray(value)) {
    throw new Error(`Expected ${label} to be an array, got ${typeof value}`)
  }
  return value
}

export const expectObject = (
  value: unknown,
  label: string,
): Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Expected ${label} to be an object, got ${typeof value}`)
  }
  return value as Record<string, unknown>
}

export const expectKey = (
  obj: Record<string, unknown>,
  key: string,
  label: string,
): unknown => {
  if (!(key in obj)) {
    throw new Error(`Missing key '${key}' in ${label}`)
  }
  return obj[key]
}
