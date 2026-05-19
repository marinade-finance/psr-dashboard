// Non-directional "cap reached" glyph: a horizontal ceiling line with a
// vertical bar from below touching it (the stake column hitting the cap).
// Distinct from ICON_ALERT (octagon — bond fee alarm) and ICON_BID (rank
// ladder — bid lever). The cap CTA has no bond/bid lever, so the glyph
// must not imply user action — it just names the ceiling.
export const ICON_CAP = (
  <svg
    viewBox="0 0 12 12"
    width={14.4}
    height={14.4}
    stroke="currentColor"
    fill="none"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M1.5 3.5 H10.5" />
    <path d="M3 3.5 V1.5" />
    <path d="M9 3.5 V1.5" />
    <path d="M6 10.5 V5" />
  </svg>
)
