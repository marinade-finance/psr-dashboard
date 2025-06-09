import React from "react";
import { Props } from "src/components/banner/banner";

export const getBannerData = (): Props => ({
  title: "🚨 Max Stake Wanted is Back – Be Sure to Set It Up 🚨",
  body: <>

<p>
We are re-enabling max-stake-wanted, a setting that lets validators cap how much
stake they want to receive from Marinade. This gives validators more control and
helps them better manage their bonding needs.  Once most validators have set
their max-stake-wanted, we plan to <strong>relax bond constraints</strong>, allowing more stake
with smaller bonds, even at higher bids.
</p>

<p>
💡 You can review your current setup in the " <a href="/bonds">Validator Bonds</a> " tab.
</p>

<p>
A reminder will go out mid-week to make sure everyone is ready.
</p>

<p>
👉 Please set your <strong><u>--max-stake-wanted</u></strong> value as soon as possible to benefit from these changes.
</p>

<p>
Be sure to use the newest version of the CLI, at least 2.1.8.
</p>

<p>
read more: <a href="https://www.npmjs.com/package/@marinade.finance/validator-bonds-cli?activeTab=readme#bond-account-configuration">Validator Bonds CLI - docs</a>
</p>

</>,
})
