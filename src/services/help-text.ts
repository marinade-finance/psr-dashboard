export const HELP_TEXT = {
  maxApy:
    'The yearly return your validator promises stakers — inflation rewards, network tips, block rewards, plus the bid you pay on top. Higher Max APY means a better rank and more stake from Marinade.',
  bond: 'SOL you lock up as a safety deposit. If you under-deliver on the promised APY, stakers get reimbursed from this. The fuller your bond is being drawn down, the sooner it runs out.',
  stakeDelta:
    "How much stake you'll gain or lose next epoch. Positive means Marinade will send you more SOL; negative means some will be pulled back.",
  stakeBid:
    'Extra yearly return you pay stakers out of your own pocket — added on top of normal validator rewards. This is the main knob to climb the ranking. The cost comes out of your bond each epoch.',
  winningApy:
    'The lowest yearly return that still won stake this epoch. Your Max APY has to clear this bar — beat it and you receive stake, fall short and you don’t.',
  want: 'The cap you set on how much stake you’ll take. Set it too low and you miss out; lower it mid-epoch and you may be penalised.',
  bondHealth:
    'How well your bond covers the upcoming bid costs. Critical — too thin, fee penalties already kicking in. Watch — covers the minimum, but too low to qualify for more stake. Healthy — comfortably covers what you’ll owe.',
  sfdp: 'Whether you meet Solana Foundation’s SFDP criteria — the foundation’s own delegation programme. Meeting it gives you a small boost in Marinade’s auction too.',
  penalty:
    'Cutting your bid, WANT, or bond too aggressively mid-epoch is treated as bailing on commitments — you get a temporary rank hit. Adjustments only land in the next epoch anyway, so plan ahead.',
  simulation:
    'Try out different commission and bid values to see how your rank, stake, and bond would change — without actually committing anything.',
  bidDistribution:
    'Where your bid sits compared to everyone else’s. Use it to spot whether you’re well above the pack, mid, or barely in.',
  effectiveBid:
    'What you actually pay per stake. Marinade auctions are settled at one shared price — the lowest winning bid — so everyone pays the same rate, even if some bid higher.',
  bondRunway:
    'How many epochs your bond can keep paying your bid before it runs dry. When it hits zero, Marinade pulls its stake back from you.',
  totalAuctionStake:
    'Total SOL Marinade plans to spread across the winners of this epoch’s auction — the goal allocation, which the network will move toward over the next few epochs.',
  projectedApy:
    'What stakers should expect to earn in a year if every winning validator delivers what they promised this epoch.',
  winningValidators:
    'How many validators won at least some stake this epoch. The rest bid too low to make the cut.',
  bondCoverage:
    'Whether your bond is fat enough for Marinade to feel comfortable. Under the minimum and you start paying fee penalties; under the ideal and you can stay in but won’t be given more stake.',
  bidGap:
    'How much higher your own bid was than what you’ll actually pay. Bid a lot more than needed and this number grows — but you still only pay the auction-wide rate.',
} as const
