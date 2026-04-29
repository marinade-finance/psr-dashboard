import React from 'react'

import type { Props } from 'src/components/banner/banner'

export const getBannerData = (): Props => ({
  title: '📢 Activating Stake Fee is live',
  body: (
    <>
      <p>
        A new fee under SAM applies to activating stake delegated through the
        auction. It unlocks a bottleneck in re-delegation: Marinade can now move
        more stake to high-bidding validators, meaning faster access to stake
        for validators who bid for it and higher APY for stakers.
      </p>
      <p>
        <strong>How it works.</strong> A new term is added to the bid payment,
        charged on top of the existing payment for active stake:&nbsp;
        <code>
          max(0, bidPmpe − auctionEffectiveBidPmpe) × activatingStake / 1000
        </code>
        . The fee is sized by the overbid — the gap between a validator's bid
        and the auction's effective bid. A larger overbid means a larger fee per
        unit of activating stake, but also stake delivered sooner. Charged once
        per unit of new stake, in the epoch it activates; validators receiving
        new stake across multiple epochs are charged on each new allocation.
        Same auction rank means same fee, regardless of commission.
      </p>
      <p>
        <strong>Phased rollout.</strong> Epoch 963: 10% of the full fee. Epoch
        964: 20%. Epoch 965 onward: 100%.
      </p>
      <p>
        <strong>Heads up.</strong> Significant redelegation is happening right
        now as some validators exit — a good window for high-bidding validators
        to win new stake.&nbsp;
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
