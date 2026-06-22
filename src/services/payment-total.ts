import { selectAmount } from './protected-events'

import type { ProtectedEvent } from './protected-events'

export type PaymentTotal = {
  psrTotal: number
  penaltyTotal: number
  total: number
}

export function computePaymentTotal(args: {
  biddingTotalSol: number
  bidTooLowPenaltySol: number
  blacklistPenaltySol: number
  bondRiskFeeSol: number
  psrEstimates: ProtectedEvent[]
}): PaymentTotal {
  const psrTotal = args.psrEstimates.reduce(
    (sum, e) => sum + selectAmount(e),
    0,
  )
  const penaltyTotal =
    args.bidTooLowPenaltySol +
    args.blacklistPenaltySol +
    args.bondRiskFeeSol +
    psrTotal
  return {
    psrTotal,
    penaltyTotal,
    total: args.biddingTotalSol + penaltyTotal,
  }
}
