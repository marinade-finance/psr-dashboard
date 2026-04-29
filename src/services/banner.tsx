import React from 'react'

import type { Props } from 'src/components/banner/banner'

export const getBannerData = (): Props => ({
  title: '📢 Activating Stake Fee is live',
  body: (
    <>
      <p>
        SAM now charges a fee on activating stake, unlocking re-delegation so
        stake moves faster to high-bidding validators. The charge scales with
        the gap between your bid and the auction's effective bid — review your
        bids before the fee takes full effect.
      </p>
      <p>
        Phased rollout: 10% at epoch 963, 20% at 964, 100% from 965.&nbsp;
        <a
          href="https://docs.marinade.finance/marinade-protocol/protocol-overview/stake-auction-market/activating-stake-fee"
          target="_blank"
          rel="noopener noreferrer"
        >
          Full docs↗
        </a>
      </p>
    </>
  ),
})
