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
    'Healthy = bond can sustain current stake for 10+ epochs. Watch = 5-10 epochs runway. Critical = <5 epochs, risk of forced unstaking.',
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
    'The bid value after accounting for penalties and adjustments. This is the actual bid used in the auction ranking.',
  bondRunway:
    'Number of epochs until bond is depleted at current bid rate. Lower runway means higher risk of forced unstaking.',
} as const
