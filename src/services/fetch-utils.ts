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

// Like schema.parse() but warns instead of throwing when the API drifts from
// the generated spec. Production should never break over a new optional field
// or a renamed enum value the dashboard doesn't use.
export function safeParseLenient<T>(
  schema: { safeParse: (v: unknown) => { success: boolean; data?: T; error?: { message: string } } },
  body: unknown,
): T {
  const result = schema.safeParse(body)
  if (!result.success) {
    console.warn('[schema] validation warning (returning raw body):', result.error?.message)
    return body as T
  }
  return result.data as T
}

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

