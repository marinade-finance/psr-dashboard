import React from 'react'

import type { Props } from 'src/components/banner/banner'

export const getBannerData = (): Props => ({
  title: 'Validator Stake Cap Increasing — Step 2 Live at Epoch 946',
  body: (
    <>
      <p>
        Per-validator stake cap raised from 8% to 15% of TVL, moving yet a bit closer to MIP-19 completion.
        Following the successful Step 1 raise at Epoch 924, top-performing
        validators can now acquire even more stake by adjusting{' '}
        <code>maxStakeWanted</code>, topping up bonds and offering competitive
        bids.
      </p>
    </>
  ),
})
