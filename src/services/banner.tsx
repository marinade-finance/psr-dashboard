import React from "react";
import { Props } from "src/components/banner/banner";

export const getBannerData = (): Props => ({
  title: "🚨 Stake Matching Now Live 🚨",
  body: <>
<p>
Marinade now matches 10% to 30% of external stake you attract, with no bond required for the matched portion.
</p>

<p>
You must still win stake through the auction to receive matching.
</p>

<p>
Up to 0.4% of Marinade TVL can be matched per validator.
</p>

Learn more in the <a href="https://docs.marinade.finance/marinade-protocol/protocol-overview/stake-auction-market#stake-matching">docs</a>.
</>,
})
