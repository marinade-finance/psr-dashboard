export const HELP_TEXT = {
  maxApy:
    'Maximum APY offered to stakers. Composed of inflation rewards, MEV tips, block rewards, and your stake bid. Higher Max APY = higher rank in the auction.',
  bond: 'SOL deposited as collateral. Protects stakers if you fail to deliver promised APY. Bond utilization shows how much of your bond is backing active stake \u2014 higher means less runway.',
  stakeDelta:
    'Difference between your target stake allocation and current active stake. Positive = gaining stake next epoch. Negative = losing stake.',
  stakeBid:
    'Additional APY you offer on top of base rewards. This is the primary lever to improve your auction rank. Bid is deducted from your bond over time.',
  winningApy:
    'The clearing price of the auction \u2014 the minimum APY that won stake this epoch. You must exceed this to be in the winning set.',
  want: "Maximum stake you're willing to accept. Setting WANT too low may leave stake on the table. Reducing WANT may trigger penalties.",
  bondHealth:
    'Bond health is based on coverage, not time. Critical = claimable bond is below the penalty floor (bid penalties start). Watch = bond covers minimum but not the ideal level needed to receive more stake. Healthy = bond fully covers the ideal threshold.',
  sfdp: 'Stake Focused Delegation Program alignment. Validators aligned with SFDP criteria receive favorable stake weighting.',
  penalty:
    'Reducing your bid, WANT, or bond below certain thresholds within an epoch may result in temporary ranking penalties. Changes take effect next epoch.',
  simulation:
    'Explore how parameter changes affect your rank, stake allocation, and bond runway. Shows constraint-by-constraint impact, not just survival.',
  profitability:
    'Estimated net return after accounting for bond cost, operational expenses, and opportunity cost. Varies by validator infrastructure.',
  bidDistribution:
    'Shows how your bid compares to the full distribution of bids across all auction participants. Helps gauge competitive positioning.',
  effectiveBid:
    'The actual bid rate applied in the last-price auction. All winners pay the same clearing rate (the lowest winning bid), regardless of their submitted bid.',
  bondRunway:
    'Number of epochs the bond will remain valid at the current bid rate, as computed by the SDK. Lower means higher risk of forced unstaking.',
  totalAuctionStake:
    'Total SOL targeted by Marinade across all auction winners this epoch. This is the sum of each winning validator\u2019s SAM target allocation, not the currently active stake.',
  projectedApy:
    'Expected staker return this epoch, computed as total bid+commission revenue across all winning validators divided by Marinade\u2019s SAM TVL, compounded annually.',
  winningValidators:
    'Count of validators that received a non-zero stake target this epoch. Validators with zero target are below the auction cutoff.',
  bondCoverage:
    'Whether the bond balance covers the minimum required threshold. Below minimum = bid penalties apply. Below ideal = bond is adequate but limits stake growth.',
  bidGap:
    'Difference between your submitted bid and the auction\u2019s effective bid (clearing price). A positive gap means you bid more than required \u2014 you still pay only the clearing price.',
} as const
