import { ICON_ALERT } from './icon-alert'
import { ICON_BID } from './icon-bid'
import { ICON_BOND } from './icon-bond'
import { ICON_CAP } from './icon-cap'
import { ICON_DOWN } from './icon-down'
import { ICON_RIGHT } from './icon-right'
import { ICON_UP } from './icon-up'

import type React from 'react'
import type { TipIcon } from 'src/services/tip-engine'

// Component-layer adapter: maps the framework-agnostic TipIcon discriminator
// returned by tip-engine.getTipIcon() to actual icon components.
// Keeps the service layer pure (no React/component imports) — see
// 'src/services/tip-engine.ts'.
export const TIP_ICONS: Record<TipIcon, React.ReactNode> = {
  alert: ICON_ALERT,
  bond: ICON_BOND,
  bid: ICON_BID,
  cap: ICON_CAP,
  up: ICON_UP,
  down: ICON_DOWN,
  right: ICON_RIGHT,
}
