import React from 'react'

import type { Props } from 'src/components/banner/banner'

export const getBannerData = (): Props => ({
  title: '✓✓✓ Introducing Dynamic Commissions ✓✓✓',
  body: (
    <>
      <p>
        📜 You can now bid not only by setting a static bid (
        <code>--cpmpe</code>), but also by setting commissions on inflation,
        MEV, and block rewards in your bond, which directly affects your
        effective bid in the auction. This allows you to set the bid to track
        inflation, MEV and block rewards and not worry about getting penalized
        for undercutting the auction. See more at{' '}
        <a
          target="_blank"
          href="https://docs.marinade.finance/marinade-protocol/protocol-overview/stake-auction-market"
        >
          Marinade Doc page
        </a>
        &nbsp;and{' '}
        <a
          target="_blank"
          href="https://github.com/marinade-finance/validator-bonds/tree/main/packages/validator-bonds-cli#core-concepts"
        >
          Validator Bonds CLI README
        </a>
      </p>
    </>
  ),
})
