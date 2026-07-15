// CardStatusSeverity and the CardStatus/CardStatusAction decision shapes live
// in @marinade.finance/ds-sam-calc (the calc layer decides whether there is an
// action, its label and its severity). The click mechanism is UI, so we
// intersect onClick back in here — the dashboard owns what clicking the action does.
import type {
  CardStatus as CalcCardStatus,
  CardStatusAction as CalcCardStatusAction,
} from '@marinade.finance/ds-sam-calc'

export type { CardStatusSeverity } from '@marinade.finance/ds-sam-calc'

export type CardStatusAction = CalcCardStatusAction & { onClick: () => void }
export type CardStatus = Omit<CalcCardStatus, 'action'> & {
  action?: CardStatusAction
}
