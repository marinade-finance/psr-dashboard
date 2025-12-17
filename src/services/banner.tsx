import React from "react";
import { Props } from "src/components/banner/banner";

export const getBannerData = (): Props => ({
  title: "✓✓✓ Introducing Dynamic Commissions ✓✓✓",
  body: <>
<p>
📜 Validators can bid not only with a static bid (<code>--cpmpe</code>),
but also by setting commissions on inflation, MEV, and block rewards in bond,
which are used to calculate the effective auction bid.
See more at <a target="_blank" href="https://docs.marinade.finance/marinade-protocol/protocol-overview/stake-auction-market">Marinade Doc page</a>
&nbsp;and <a target="_blank" href="https://github.com/marinade-finance/validator-bonds/tree/main/packages/validator-bonds-cli#core-concepts">Validator Bonds CLI README</a>
</p>
</>,
})
