export const HELP_TEXT = {
  maxApy:
    'The yearly return your validator promises stakers — inflation rewards, network tips, block rewards, plus the bid you pay on top. Higher Max APY means a better rank and more stake from Marinade, but also a higher bid you pay on the activating stake.',
  bond: 'SOL you lock up as a safety deposit. If you under-deliver on the promised APY, stakers get reimbursed from this. The fuller your bond is being drawn down, the sooner it runs out.',
  stakeDelta:
    "How much stake you'll gain or lose next epoch. Positive means Marinade will send you more SOL; negative means some will be pulled back.",
  staticBid:
    'Extra yearly return you pay stakers out of your own pocket — added on top of normal validator rewards. This is the main knob to climb the ranking. The cost comes out of your bond each epoch.',
  winningApy:
    'The lowest yearly return that still won stake this epoch. Your Max APY has to clear this level — beat it and you receive stake, fall short and you don’t.',
  want: 'The cap you set on how much stake you’ll take. Set it too low and you miss out on stake you could have earned.',
  bondHealth:
    'How well your bond covers the upcoming bid costs. Critical — too thin, fee penalties already kicking in. Watch — too thin to keep current stake; some will be pulled back unless you top up. Adequate — covers current stake but below the ideal buffer; no fee risk yet, topping up unlocks room for more stake. Healthy — comfortably covers what you’ll owe.',
  sfdp: 'Whether you meet Solana Foundation’s SFDP criteria — the foundation’s own delegation programme. Meeting it gives you a small boost in Marinade’s auction too.',
  penalty:
    "Charged when your bid drops this epoch and your bond obligation drops below the worst bid you'd committed in recent history (minus the permitted deviation). The amount scales with how far the bond obligation sits below that floor.",
  simulation:
    'Try out different commission and bid values to see how your rank, stake, and bond would change — without actually committing anything.',
  bidDistribution:
    'Where your bid sits compared to everyone else’s. Use it to spot whether you’re well above the pack, mid, or barely in.',
  effectiveBid:
    'What you actually pay per stake. Marinade auctions are settled at one shared price — the lowest winning bid — so everyone pays the same rate, even if some bid higher.',
  bondRunway:
    'How many epochs your bond can keep paying your bid before it runs dry. Once it slips below the penalty threshold, Marinade charges a bond risk fee.',
  totalAuctionStake:
    "Total SOL Marinade aims to allocate across this epoch's winners — the target distribution Marinade's stake bot will work toward over the next few epochs, limited by Solana's cooldown and reactivation rules.",
  bondCoverage:
    'Whether your bond is big enough to cover the risks it backs. Below the minimum you start paying fee penalties; below the ideal you still receive stake but have less headroom — topping up extends runway.',
  bidGap:
    "How much higher your own static bid was than the auction's clearing rate. You only ever pay the clearing rate, but your full static bid still counts toward your total PMPE — so a larger gap does push you up the ranking, even though it costs nothing extra at settlement.",
} as const
