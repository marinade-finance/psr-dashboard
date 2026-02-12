import React from 'react'

import type { Props } from 'src/components/banner/banner'

export const getBannerData = (): Props => ({
  title: 'Validator Stake Cap Increasing — Step 1 Live at Epoch 924',
  body: (
    <>
      <p>
        Per-validator stake cap raised from 4% to 8% of TVL as part of MIP-19.
        Top-performing validators can now acquire more stake by adjusting{' '}
        <code>maxStakeWanted</code>, topping up bonds and offering competitive
        bids.
      </p>
    </>
  ),
})
