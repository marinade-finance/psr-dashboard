import React from 'react'

import type { Props } from 'src/components/banner/banner'

export const getBannerData = (): Props => ({
  title: 'Bond Notifications Are Now Live',
  body: (
    <>
      <p>
        Stay on top of your bond without manual checks. Subscribe to get alerts
        for underfunding, auction exits, eligibility changes, and more — via
        Telegram or email.
      </p>
      <p>
        <a href="https://docs.marinade.finance/marinade-protocol/protocol-overview/stake-auction-market/bond-notifications">
          Learn more
        </a>
      </p>
    </>
  ),
})
