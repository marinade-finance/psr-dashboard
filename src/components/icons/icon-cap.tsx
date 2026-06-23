// Non-directional "cap reached" glyph — the No-Entry traffic sign:
// a circle with a horizontal bar across the middle. Universally
// recognised "you cannot proceed past this line", and the bar IS
// the cap itself. Distinct from ICON_ALERT (octagon, bond fee alarm),
// ICON_BID (rank ladder, bid lever) and ICON_BOND (shield) so each
// lever still reads as a separate glyph at chip size.
export const ICON_CAP = (
  <svg
    viewBox="0 0 12 12"
    width={14.4}
    height={14.4}
    stroke="currentColor"
    fill="none"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="6" cy="6" r="4.5" />
  </svg>
)
