export const HELP_TEXT = {
  maxApy:
    'The yearly return your validator promises stakers — inflation rewards, network tips, block rewards, plus the bid you pay on top. Higher Max APY means a better rank and more stake from Marinade, but also a higher bid you pay on the activating stake.',
  bond: 'SOL you lock up as a safety deposit. If you under-deliver on the promised APY, stakers get reimbursed from this. The fuller your bond is being drawn down, the sooner it runs out.',
  stakeDelta:
    "How much stake you'll gain or lose next epoch. Positive means Marinade will send you more SOL; negative means some will be pulled back.",
  stakeBid:
    'Extra yearly return you pay stakers out of your own pocket — added on top of normal validator rewards. This is the main knob to climb the ranking. The cost comes out of your bond each epoch.',
  winningApy:
    'The lowest yearly return that still won stake this epoch. Your Max APY has to clear this bar — beat it and you receive stake, fall short and you don’t.',
  want: 'The cap you set on how much stake you’ll take. Set it too low and you miss out on stake you could have earned.',
  bondHealth:
    'How well your bond covers the upcoming bid costs. Critical — too thin, fee penalties already kicking in. Watch — covers the minimum, but too low to qualify for more stake. Soft — covers current stake but not the ideal buffer; no fee risk yet, though topping up opens room for more stake. Healthy — comfortably covers what you’ll owe.',
  sfdp: 'Whether you meet Solana Foundation’s SFDP criteria — the foundation’s own delegation programme. Meeting it gives you a small boost in Marinade’s auction too.',
  penalty:
    "Charged when your bid drops from the previous epoch and your bond obligation doesn't cover what you previously committed to pay. The shortfall is collected as forced stake undelegation — Marinade withdraws stake proportional to how much you under-delivered on your prior bid.",
  simulation:
    'Try out different commission and bid values to see how your rank, stake, and bond would change — without actually committing anything.',
  bidDistribution:
    'Where your bid sits compared to everyone else’s. Use it to spot whether you’re well above the pack, mid, or barely in.',
  effectiveBid:
    'What you actually pay per stake. Marinade auctions are settled at one shared price — the lowest winning bid — so everyone pays the same rate, even if some bid higher.',
  bondRunway:
    'How many epochs your bond can keep paying your bid before it runs dry. Once it slips below the penalty threshold, Marinade both charges a bond risk fee from your bond and pulls stake back.',
  totalAuctionStake:
    "Total SOL Marinade aims to allocate across this epoch's winners — the target distribution Marinade's stake bot will work toward over the next few epochs, limited by Solana's cooldown and reactivation rules.",
  projectedApy:
    "Projected annualized SAM yield using each validator's total PMPE — inflation, MEV and clearing bid combined — weighted by Marinade's current active stake and divided by total SAM TVL. Based on how stake is spread across validators today, not next epoch's target split or the single marginal Winning APY.",
  winningValidators:
    'How many validators won at least some stake this epoch. The rest bid too low to make the cut.',
  bondCoverage:
    'Whether your bond is big enough to cover the risks it backs. Below the minimum you start paying fee penalties; below the ideal you can stay in but won’t be given more stake.',
  bidGap:
    'How much higher your own bid was than what you’ll actually pay. A larger gap means you rank higher and gain stake faster — but also increases the activating fee. You still pay only the auction-wide clearing rate.',
} as const
