export const ICON_ALERT = (
  <svg
    viewBox="0 0 12 12"
    width={14.4}
    height={14.4}
    stroke="currentColor"
    fill="none"
    strokeWidth="1.5"
    strokeLinecap="round"
    // strokeLinejoin="miter" keeps the eight corners crisp so the octagon
    // reads as a stop-sign at 14.4px. With "round" the joins blur into a
    // near-circle — the alert glyph then looks like the generic info dot
    // and stops doing its severity-glyph job.
    strokeLinejoin="miter"
  >
    <polygon points="4,1 8,1 11,4 11,8 8,11 4,11 1,8 1,4" />
    <path d="M6 3.4v3.4" />
    <path d="M6 8.8h0.01" />
  </svg>
)
