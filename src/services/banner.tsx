import React from "react";
import { Props } from "src/components/banner/banner";

export const getBannerData = (): Props => ({
  title: "🚨 Bond requirements are now relaxed 🚨",
  body: <>

<p>You can now bid high with a reasonably sized bond and still get decent stake delegation.</p>

<p>
👉 Please set your <strong><u>--max-stake-wanted</u></strong> to benefit from these changes.
<br/> Note that you can never request less than 10k SOL from the auction.
</p>

<p>
💡 You can review your current setup in the " <a href="/bonds">Validator Bonds</a> " tab.
</p>

<p>
Be sure to use the newest version of the CLI, at least 2.1.8.
</p>

<p>
read more: <a href="https://www.npmjs.com/package/@marinade.finance/validator-bonds-cli?activeTab=readme#bond-account-configuration">Validator Bonds CLI - docs</a>
</p>

</>,
})
