import React from 'react'

import type { Props } from 'src/components/banner/banner'

export const getBannerData = (): Props => ({
  title: '⚠️⚠️⚠️ Bond Risk Reduction Mechanism now active',
  body: (
    <>
      <p>
        Validators with insufficient bond coverage (with "Cover. [ep]" at or
        less than zero) now pay a fee to cover the redelegation of their
        stake.&nbsp;
        <a
          href="https://docs.marinade.finance/marinade-protocol/protocol-overview/stake-auction-market/bond-risk-reduction-mechanism"
          target="_blank"
          rel="noopener noreferrer"
        >
          Find out details↗
        </a>
      </p>
      <p>
        Stay on top of your bond coverage. Subscribe to get alerts for
        underfunding via Telegram or email.&nbsp;
        <a
          href="https://docs.marinade.finance/marinade-protocol/protocol-overview/stake-auction-market/bond-notifications"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn more↗
        </a>
      </p>
    </>
  ),
})
