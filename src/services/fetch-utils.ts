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
export async function fetchJson<T>(
  url: string,
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetch(url, { signal })
  if (!res.ok) {
    throw new FetchError(res.status, res.statusText, url)
  }
  // Guard against captive portals / CDN error pages that return 200 with HTML.
  // Without this check, .json() throws a confusing parse error far from the
  // actual source of the problem.
  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new FetchError(
      res.status,
      `Unexpected content-type: ${contentType || '(none)'}`,
      url,
    )
  }
  return res.json() as Promise<T>
}
