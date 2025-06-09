import React from "react";
import { Props } from "src/components/banner/banner";

export const getBannerData = () => ({
  title: "🚨 MaxStakeWanted is Back – Be Sure to Set It Up 🚨",
  body: <>

We are re-enabling MaxStakeWanted, a setting that lets validators cap how much
stake they want to receive from Marinade. This gives validators more control and
helps them better manage their bonding needs.  Once most validators have set
their MaxStakeWanted, we plan to relax bonding constraints, allowing more stake
with smaller bonds, even at higher bids.

<br/>
<br/>
💡 You can review your current setup in the "<a href="/bonds">Validator Bonds</a>" tab.

<br/>
<br/>
A reminder will go out mid-week to make sure everyone is ready.

<br/>
<br/>
👉 Please set your MaxStakeWanted value as soon as possible to benefit from these changes.

<br/>
Be sure to use the newest version of the CLI, at least 2.1.8.

<br/>
<br/>
read more: <a href="https://www.npmjs.com/package/@marinade.finance/validator-bonds-cli?activeTab=readme#bond-account-configuration">Validator Bonds CLI - docs</a>
</>,
})
