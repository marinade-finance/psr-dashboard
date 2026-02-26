import { useState } from "react";

/* ══════════════════════════════════════════════════════════════════════════
   MARINADE PSR DASHBOARD v3
   Informed by SAM Validator Feedback Summary — addresses:
   1. Profitability opacity → Net P&L estimator in detail view
   2. Auction mechanics opacity → "Why this rank?" constraint explainer
   3. Bond lifecycle uncertainty → Depletion timeline + epoch runway
   4. No predictive signals → What-if sliders for bid/bond/WANT
   5. Simulation = survival-only → Rich per-constraint feedback
   6. Missing alerts → Bond/stake alert indicators
   7. Penalty fear → Penalty preview on parameter changes
   8. Competitive opacity → Bid distribution + peer comparison
   9. Documentation gaps → Contextual (?) help tooltips
   10. Conservative bidding → Clear "safe range" indicators
   ══════════════════════════════════════════════════════════════════════════ */

const T = {
  primary: "#0C9790", primaryLight: "rgba(12,151,144,0.15)",
  primaryLight10: "rgba(12,151,144,0.08)", primaryLight05: "rgba(12,151,144,0.04)",
  bg: "#F3F7F7", card: "#FFFFFF", border: "#DDE7E8", borderGrid: "#E7EEEF",
  fg: "#182120", fgSecondary: "#3A4E4D", muted: "#6C8383", mutedBg: "#F3F7F7",
  secondary: "#E7EEEF",
  destructive: "#DC2626", destructiveLight: "rgba(220,38,38,0.12)",
  warning: "#E59606", warningLight: "rgba(229,150,6,0.12)",
  info: "#6366F1", infoLight: "rgba(99,102,241,0.12)",
  shadow: "0 2px 10px rgba(0,0,0,0.05)", shadowLg: "0 4px 18px 3px rgba(0,0,0,0.08)",
};
const fontSans = "'Geist', -apple-system, BlinkMacSystemFont, sans-serif";
const fontMono = "'Geist Mono', 'SF Mono', monospace";

const NETWORK = {
  inflationBaseRate: 5.82, mevTipsRate: 1.42, blockRewardsRate: 0.88,
};
const WINNING_APY = 7.29;
const WINNING_COUNT = 66;
const EPOCH_HOURS = 52; // current epoch duration estimate

// ─── HELP TOOLTIP CONTENT (addresses feedback §9: documentation gaps) ───
const HELP = {
  maxApy: "Maximum APY offered to stakers. Composed of inflation rewards, MEV tips, block rewards, and your stake bid. Higher Max APY = higher rank in the auction.",
  bond: "SOL deposited as collateral. Protects stakers if you fail to deliver promised APY. Bond utilization shows how much of your bond is backing active stake — higher means less runway.",
  stakeDelta: "Difference between your target stake allocation and current active stake. Positive = gaining stake next epoch. Negative = losing stake.",
  stBid: "Additional APY you offer on top of base rewards. This is the primary lever to improve your auction rank. Bid is deducted from your bond over time.",
  effBid: "The clearing price of the auction — the minimum APY that won stake this epoch. You must exceed this to be in the winning set.",
  want: "Maximum stake you're willing to accept. Setting WANT too low may leave stake on the table. Reducing WANT may trigger penalties.",
  bondHealth: "Healthy = bond can sustain current stake for 10+ epochs. Watch = 5-10 epochs runway. Critical = <5 epochs, risk of forced unstaking.",
  sfdp: "Stake Focused Delegation Program alignment. Validators aligned with SFDP criteria receive favorable stake weighting.",
  penalty: "Reducing your bid, WANT, or bond below certain thresholds within an epoch may result in temporary ranking penalties. Changes take effect next epoch.",
  simulation: "Explore how parameter changes affect your rank, stake allocation, and bond runway. Shows constraint-by-constraint impact, not just survival.",
  profitability: "Estimated net return after accounting for bond cost, operational expenses, and opportunity cost. Varies by validator infrastructure.",
  bidDistribution: "Shows how your bid compares to the full distribution of bids across all auction participants. Helps gauge competitive positioning.",
};

// ─── DATA ───
const validators = [
  { rank: 1, pubkey: "Ec55BotYh...3kMp", name: "Laine", infl: 0, mev: 0, block: 100, stBid: 0.476, bond: 315, maxApy: 16.27, samActive: 438612, samTarget: 461161, bondUtilPct: 42, inSet: true, want: 500000, sfdpAligned: true, epochsRunway: 28, bondDelta: -2.1 },
  { rank: 2, pubkey: "5s3vajJva...9xKq", name: "Shinobi Systems", infl: 0, mev: 0, block: 100, stBid: 0.08, bond: 400, maxApy: 8.02, samActive: 297026, samTarget: 461161, bondUtilPct: 28, inSet: true, want: 500000, sfdpAligned: true, epochsRunway: 42, bondDelta: -1.2 },
  { rank: 3, pubkey: "773eL4qyo...2nBe", name: "Overclock", infl: 0, mev: 0, block: 100, stBid: 0.27, bond: 353, maxApy: 11.90, samActive: 402688, samTarget: 425746, bondUtilPct: 55, inSet: true, want: 450000, sfdpAligned: true, epochsRunway: 18, bondDelta: -3.8 },
  { rank: 4, pubkey: "D3wscqsBC...7fRp", name: "Chorus One", infl: 0, mev: 0, block: 100, stBid: 0.461, bond: 250, maxApy: 15.95, samActive: 337282, samTarget: 360341, bondUtilPct: 72, inSet: true, want: 400000, sfdpAligned: false, epochsRunway: 9, bondDelta: -5.4 },
  { rank: 5, pubkey: "7sBYPueer...4vTx", name: "Everstake", infl: 0, mev: 0, block: 100, stBid: 0.465, bond: 190, maxApy: 16.04, samActive: 318284, samTarget: 341342, bondUtilPct: 78, inSet: true, want: 350000, sfdpAligned: true, epochsRunway: 7, bondDelta: -6.2 },
  { rank: 6, pubkey: "Luna8BkZN...qD5s", name: "Lunanova", infl: 0, mev: 0, block: 0, stBid: 0.05, bond: 162, maxApy: 8.14, samActive: 354, samTarget: 198640, bondUtilPct: 5, inSet: true, want: 200000, sfdpAligned: true, epochsRunway: 60, bondDelta: -0.1 },
  { rank: 7, pubkey: "JnGGar3Xb...2mPk", name: "Triton", infl: 0, mev: 0, block: 100, stBid: 0.2631, bond: 136, maxApy: 11.76, samActive: 160002, samTarget: 183060, bondUtilPct: 68, inSet: true, want: 200000, sfdpAligned: true, epochsRunway: 11, bondDelta: -3.1 },
  { rank: 8, pubkey: "EGg6LTZDg...9nWe", name: "P2P.org", infl: 0, mev: 0, block: 100, stBid: 0.2561, bond: 128, maxApy: 11.61, samActive: 152767, samTarget: 169332, bondUtilPct: 74, inSet: true, want: 180000, sfdpAligned: true, epochsRunway: 8, bondDelta: -4.0 },
  { rank: 9, pubkey: "soLStAcku...8jYr", name: "SolanaFloor", infl: 0, mev: 0, block: 0, stBid: 0.45, bond: 86, maxApy: 16.49, samActive: 159748, samTarget: 159748, bondUtilPct: 45, inSet: true, want: 160000, sfdpAligned: false, epochsRunway: 15, bondDelta: -1.8 },
  { rank: 10, pubkey: "86Sw9R6yn...5kLq", name: "Helius", infl: 0, mev: 0, block: 100, stBid: 0.06, bond: 119, maxApy: 7.62, samActive: 40377, samTarget: 148260, bondUtilPct: 22, inSet: true, want: 200000, sfdpAligned: true, epochsRunway: 36, bondDelta: -0.8 },
  { rank: 65, pubkey: "VaL1d8Rnx...4tPq", name: "Figment", infl: 0, mev: 0, block: 100, stBid: 0.10, bond: 45, maxApy: 7.35, samActive: 18200, samTarget: 19500, bondUtilPct: 62, inSet: true, want: 25000, sfdpAligned: true, epochsRunway: 12, bondDelta: -1.1 },
  { rank: 66, pubkey: "St4k3rZzz...9mKw", name: "Coinbase Cloud", infl: 0, mev: 0, block: 100, stBid: 0.09, bond: 38, maxApy: 7.29, samActive: 15800, samTarget: 15800, bondUtilPct: 70, inSet: true, want: 20000, sfdpAligned: true, epochsRunway: 8, bondDelta: -1.4 },
  { rank: 67, pubkey: "6BUqzA7Gt...3wNr", name: "Stakewiz", infl: 5, mev: 0, block: 100, stBid: 0.5121, bond: 103, maxApy: 6.95, samActive: 137544, samTarget: 0, bondUtilPct: 88, inSet: false, want: 150000, sfdpAligned: true, epochsRunway: 3, bondDelta: -8.2 },
  { rank: 68, pubkey: "GakAanHMN...6pTs", name: "Jito", infl: 0, mev: 0, block: 100, stBid: 0.0721, bond: 105, maxApy: 6.80, samActive: 28321, samTarget: 0, bondUtilPct: 18, inSet: false, want: 50000, sfdpAligned: false, epochsRunway: 44, bondDelta: -0.4 },
  { rank: 69, pubkey: "i6PZjkPHG...7rQs", name: "Node Monster", infl: 5, mev: 0, block: 100, stBid: 0.11, bond: 66, maxApy: 6.42, samActive: 111609, samTarget: 0, bondUtilPct: 55, inSet: false, want: 120000, sfdpAligned: true, epochsRunway: 14, bondDelta: -1.5 },
];

// ─── UTILITIES ───
function getApyBreakdown(v) {
  const inflYield = NETWORK.inflationBaseRate * (1 - v.infl / 100);
  const mevYield = NETWORK.mevTipsRate * (1 - v.mev / 100);
  const blockYield = NETWORK.blockRewardsRate * (v.block / 100);
  const bidYield = v.stBid;
  return { inflYield, mevYield, blockYield, bidYield, total: inflYield + mevYield + blockYield + bidYield };
}
function getBondHealth(pct, runway) {
  if (runway <= 5 || pct >= 85) return "critical";
  if (runway <= 10 || pct >= 65) return "watch";
  return "healthy";
}
function getBondStyle(h) {
  if (h === "critical") return { color: T.destructive, bg: T.destructiveLight, label: "Critical" };
  if (h === "watch") return { color: T.warning, bg: T.warningLight, label: "Watch" };
  return { color: T.primary, bg: T.primaryLight10, label: "Healthy" };
}
function formatDelta(v) {
  if (!v.inSet) return { text: "—", color: T.muted, arrow: "" };
  const d = v.samTarget - v.samActive;
  if (d > 0) return { text: `+${d.toLocaleString()}`, color: T.primary, arrow: "↑" };
  if (d < 0) return { text: `${d.toLocaleString()}`, color: T.destructive, arrow: "↓" };
  return { text: "0", color: T.muted, arrow: "→" };
}

// ─── TIP ENGINE (addresses feedback §3, §5: constraint-aware reasoning) ───
function getTip(v) {
  const delta = v.samTarget - v.samActive;
  const health = getBondHealth(v.bondUtilPct, v.epochsRunway);

  if (!v.inSet) {
    const gap = (WINNING_APY - v.maxApy).toFixed(2);
    return { text: `Outside winning set. Increase bid by ~${gap}% or lower commission to qualify.`, urgency: "critical", constraint: "rank" };
  }
  if (health === "critical" && v.epochsRunway <= 5) {
    return { text: `Bond depletes in ~${v.epochsRunway} epochs (${Math.round(v.epochsRunway * EPOCH_HOURS / 24)}d). Top up to avoid forced unstaking.`, urgency: "critical", constraint: "bond" };
  }
  if (health === "critical") return { text: "Bond utilization >85%. Top up bond or reduce WANT to lower exposure.", urgency: "critical", constraint: "bond" };
  if (health === "watch" && v.stBid < 0.15) {
    return { text: `Bid at ${v.stBid}% is below median. Raise to 0.15-0.25% to gain rank without major bond cost.`, urgency: "warning", constraint: "bid" };
  }
  if (health === "watch") return { text: `Bond runway ~${v.epochsRunway} epochs. Consider topping up before next cycle.`, urgency: "warning", constraint: "bond" };
  if (v.stBid < 0.1 && delta > 50000) return { text: `Low bid (${v.stBid}%) limits rank. Raising to 0.15% could gain ~${(delta/1000).toFixed(0)}K◎ more stake.`, urgency: "info", constraint: "bid" };
  if (delta > 100000) return { text: `Gaining +${(delta/1000).toFixed(0)}K◎ stake next epoch. Bond and bid are well-positioned.`, urgency: "positive", constraint: "none" };
  if (delta > 0) return { text: `On track: +${delta.toLocaleString()}◎ incoming. ${v.epochsRunway > 20 ? "Strong runway." : "Monitor bond."}`, urgency: "positive", constraint: "none" };
  if (delta === 0) return { text: "At target allocation. Raise bid to grow, or reduce WANT to free bond capacity.", urgency: "neutral", constraint: "none" };
  return { text: `Losing ${Math.abs(delta).toLocaleString()}◎ stake. Raise bid or check if commission changed.`, urgency: "critical", constraint: "bid" };
}
function getTipStyle(u) {
  if (u === "critical") return { color: T.destructive, bg: T.destructiveLight, icon: "⚠" };
  if (u === "warning") return { color: T.warning, bg: T.warningLight, icon: "↗" };
  if (u === "info") return { color: T.info, bg: T.infoLight, icon: "💡" };
  if (u === "positive") return { color: T.primary, bg: T.primaryLight10, icon: "✓" };
  return { color: T.muted, bg: T.mutedBg, icon: "→" };
}

// ─── CONTEXTUAL HELP TOOLTIP (addresses feedback §9) ───
function HelpTip({ text }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 14, height: 14, borderRadius: "50%", background: T.secondary, color: T.muted, fontSize: 9, fontWeight: 700, cursor: "help", marginLeft: 4, userSelect: "none", fontFamily: fontSans }}
      >?</span>
      {show && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)",
          width: 260, padding: "10px 12px", borderRadius: 8, background: T.fg, color: "#fff",
          fontSize: 11, lineHeight: 1.5, fontWeight: 400, fontFamily: fontSans, zIndex: 200,
          boxShadow: T.shadowLg, pointerEvents: "none",
        }}>
          {text}
          <div style={{ position: "absolute", bottom: -4, left: "50%", transform: "translateX(-50%) rotate(45deg)", width: 8, height: 8, background: T.fg }} />
        </div>
      )}
    </span>
  );
}

// ─── STATS BAR ───
function StatsBar() {
  const stats = [
    { label: "Total Auction Stake", value: "5,764,515", unit: "◎" },
    { label: "Winning APY", value: "7.29", unit: "%", help: HELP.effBid },
    { label: "Projected APY", value: "6.80", unit: "%" },
    { label: "Winning Validators", value: "66 / 211", unit: "" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
      {stats.map(s => (
        <div key={s.label} style={{ background: T.card, borderRadius: 12, padding: "16px 20px", border: `1px solid ${T.border}`, boxShadow: T.shadow }}>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 4, fontFamily: fontSans }}>
            {s.label}{s.help && <HelpTip text={s.help} />}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
            <span style={{ fontSize: 22, fontWeight: 600, color: T.fg, fontFamily: fontMono }}>{s.value}</span>
            {s.unit && <span style={{ fontSize: 14, color: T.muted, fontFamily: fontMono }}>{s.unit}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── CLEAN TABLE ───
function CleanTable({ onSelectValidator }) {
  const [hoveredRow, setHoveredRow] = useState(null);
  const [tooltipRow, setTooltipRow] = useState(null);
  const inSetValidators = validators.filter(v => v.inSet);
  const outSetValidators = validators.filter(v => !v.inSet);

  const renderRow = (v) => {
    const delta = formatDelta(v);
    const tip = getTip(v);
    const tipStyle = getTipStyle(tip.urgency);
    const health = getBondHealth(v.bondUtilPct, v.epochsRunway);
    const bondStyle = getBondStyle(health);
    const isHovered = hoveredRow === v.rank;
    const hasAlert = v.epochsRunway <= 5 || (v.bondUtilPct >= 85);

    return (
      <tr
        key={v.rank}
        onMouseEnter={() => setHoveredRow(v.rank)}
        onMouseLeave={() => setHoveredRow(null)}
        onClick={() => onSelectValidator(v)}
        style={{
          borderBottom: `1px solid ${T.borderGrid}`,
          background: isHovered ? T.primaryLight05 : (!v.inSet ? "rgba(220,38,38,0.02)" : T.card),
          transition: "background 0.12s", cursor: "pointer",
        }}
      >
        {/* Rank */}
        <td style={{ padding: "12px 14px", textAlign: "center", color: T.muted, fontWeight: 500, fontFamily: fontMono, width: 40, fontSize: 12 }}>{v.rank}</td>
        {/* Validator */}
        <td style={{ padding: "12px 14px", minWidth: 150 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: v.inSet ? T.fg : T.muted, fontWeight: 500, fontSize: 13 }}>{v.name}</span>
            {hasAlert && <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.destructive, flexShrink: 0, animation: "pulse 2s infinite" }} />}
          </div>
          <div style={{ color: T.muted, fontSize: 11, marginTop: 1, fontFamily: fontMono }}>{v.pubkey}</div>
        </td>
        {/* Max APY with hover breakdown */}
        <td
          style={{ padding: "12px 14px", position: "relative" }}
          onMouseEnter={(e) => { e.stopPropagation(); setTooltipRow(v.rank); }}
          onMouseLeave={() => setTooltipRow(null)}
          onClick={(e) => e.stopPropagation()}
        >
          <span style={{
            display: "inline-block", padding: "3px 10px", borderRadius: 6,
            background: v.inSet ? T.primaryLight : T.destructiveLight,
            color: v.inSet ? T.primary : T.destructive,
            fontWeight: 600, fontSize: 13, fontFamily: fontMono,
          }}>
            {v.maxApy.toFixed(2)}%
          </span>
          {tooltipRow === v.rank && (() => {
            const apy = getApyBreakdown(v);
            return (
              <div style={{
                position: "absolute", top: -4, left: "calc(100% - 16px)", zIndex: 100,
                background: T.card, border: `1px solid ${T.border}`, borderRadius: 10,
                padding: "12px 16px", minWidth: 230, boxShadow: T.shadowLg,
              }}>
                <div style={{ fontSize: 11, color: T.muted, marginBottom: 8, fontWeight: 500 }}>APY Composition</div>
                {[
                  { label: "Inflation", val: apy.inflYield, note: v.infl > 0 ? `${v.infl}% comm.` : "0% comm.", color: T.primary },
                  { label: "MEV Tips", val: apy.mevYield, note: v.mev > 0 ? `${v.mev}% comm.` : "0% comm.", color: T.info },
                  { label: "Block Rewards", val: apy.blockYield, note: v.block < 100 ? `${v.block}% shared` : "100% shared", color: "#FBBF24" },
                  { label: "Stake Bid", val: apy.bidYield, note: "your bid", color: "#C084FC" },
                ].map(r => (
                  <div key={r.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: r.color }} />
                      <span style={{ color: T.fgSecondary }}>{r.label}</span>
                      <span style={{ color: T.muted, fontSize: 10 }}>({r.note})</span>
                    </div>
                    <span style={{ color: T.fg, fontFamily: fontMono, fontWeight: 500 }}>{r.val.toFixed(2)}%</span>
                  </div>
                ))}
                <div style={{ borderTop: `1px solid ${T.borderGrid}`, marginTop: 6, paddingTop: 6, display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600 }}>
                  <span style={{ color: T.fgSecondary }}>Total</span>
                  <span style={{ color: T.primary, fontFamily: fontMono }}>{apy.total.toFixed(2)}%</span>
                </div>
              </div>
            );
          })()}
        </td>
        {/* Bond Health — now includes runway (addresses feedback §6) */}
        <td style={{ padding: "12px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6, background: bondStyle.bg }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: bondStyle.color }} />
              <span style={{ color: bondStyle.color, fontSize: 11, fontWeight: 500 }}>{bondStyle.label}</span>
            </div>
            <span style={{ color: T.muted, fontSize: 11, fontFamily: fontMono }}>{v.bond}◎</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
            <div style={{ height: 3, background: T.secondary, borderRadius: 2, width: 56, flexShrink: 0 }}>
              <div style={{ height: "100%", borderRadius: 2, width: `${Math.min(v.bondUtilPct, 100)}%`, background: bondStyle.color }} />
            </div>
            <span style={{ color: v.epochsRunway <= 10 ? bondStyle.color : T.muted, fontSize: 10, fontFamily: fontMono, whiteSpace: "nowrap" }}>
              ~{v.epochsRunway}ep
            </span>
          </div>
        </td>
        {/* Stake Delta */}
        <td style={{ padding: "12px 14px" }}>
          <span style={{ color: delta.color, fontWeight: 600, fontSize: 13, fontFamily: fontMono }}>
            {delta.arrow} {delta.text}{delta.text !== "—" ? " ◎" : ""}
          </span>
        </td>
        {/* Next Step — now constraint-aware (addresses feedback §5) */}
        <td style={{ padding: "12px 14px", maxWidth: 280 }}>
          <div style={{
            display: "inline-flex", alignItems: "flex-start", gap: 5,
            fontSize: 12, lineHeight: 1.35, color: tipStyle.color,
            padding: "4px 10px", borderRadius: 6, background: tipStyle.bg,
          }}>
            <span style={{ flexShrink: 0 }}>{tipStyle.icon}</span>
            <span>{tip.text}</span>
          </div>
        </td>
        {/* Chevron */}
        <td style={{ padding: "12px 10px", width: 40 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: isHovered ? T.primaryLight : T.mutedBg,
            border: `1px solid ${isHovered ? T.primary + "30" : T.borderGrid}`,
            transition: "all 0.12s",
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M4.5 3L7.5 6L4.5 9" stroke={isHovered ? T.primary : T.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: T.shadow, overflow: "hidden" }}>
      {/* Pulse animation */}
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: fontSans, fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${T.borderGrid}` }}>
            {[
              { label: "#", help: null },
              { label: "Validator", help: null },
              { label: "Max APY", help: HELP.maxApy },
              { label: "Bond", help: HELP.bondHealth },
              { label: "Stake Δ", help: HELP.stakeDelta },
              { label: "Next Step", help: null },
              { label: "", help: null },
            ].map((h, i) => (
              <th key={i} style={{
                padding: "11px 14px", textAlign: i === 0 ? "center" : "left",
                color: T.muted, fontSize: 11, fontWeight: 500, textTransform: "uppercase",
                letterSpacing: "0.06em", whiteSpace: "nowrap", background: T.mutedBg,
              }}>
                {h.label}{h.help && <HelpTip text={h.help} />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {inSetValidators.map(renderRow)}
          {/* ─── Winning Set Cutoff ─── */}
          <tr><td colSpan={7} style={{ padding: 0 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 16px",
              background: `linear-gradient(90deg, ${T.primaryLight10}, ${T.primaryLight}, ${T.primaryLight10})`,
              borderTop: `2px solid ${T.primary}`, borderBottom: `2px solid ${T.primary}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2L10 6H14L11 9L12 13L8 10.5L4 13L5 9L2 6H6L8 2Z" fill={T.primary} opacity="0.8"/></svg>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.primary }}>Winning Set Cutoff</span>
              </div>
              <div style={{ flex: 1, height: 1, background: T.primary, opacity: 0.2 }} />
              <span style={{ fontSize: 12, color: T.primary, fontFamily: fontMono, fontWeight: 600 }}>Winning APY: {WINNING_APY}%</span>
              <div style={{ flex: 1, height: 1, background: T.primary, opacity: 0.2 }} />
              <span style={{ fontSize: 11, color: T.muted }}>{WINNING_COUNT} of 211 validators</span>
            </div>
          </td></tr>
          {outSetValidators.map(renderRow)}
        </tbody>
      </table>
    </div>
  );
}

// ─── WHAT-IF SIMULATION PANEL (addresses feedback §4, §5, §7, §10) ───
function WhatIfPanel({ validator }) {
  const v = validator;
  const [simBid, setSimBid] = useState(v.stBid);
  const [simBond, setSimBond] = useState(v.bond);
  const [simWant, setSimWant] = useState(v.want);

  const bidChanged = Math.abs(simBid - v.stBid) > 0.001;
  const bondChanged = simBond !== v.bond;
  const wantChanged = simWant !== v.want;
  const anyChanged = bidChanged || bondChanged || wantChanged;

  // Simulated outcomes
  const newApy = getApyBreakdown({ ...v, stBid: simBid }).total;
  const apyDiff = newApy - v.maxApy;
  const newInSet = newApy >= WINNING_APY;
  const wasInSet = v.inSet;

  // Bond runway estimate
  const bondCostPerEpoch = (simBid / 100) * simWant * (EPOCH_HOURS / 8760);
  const newRunway = bondCostPerEpoch > 0 ? Math.floor(simBond / bondCostPerEpoch) : 999;

  // Penalty check (addresses feedback §7)
  const wantReduced = simWant < v.want;
  const bidReduced = simBid < v.stBid;
  const hasPenaltyRisk = wantReduced || bidReduced;

  // Constraint checks (addresses feedback §5)
  const constraints = [];
  if (!newInSet) constraints.push({ pass: false, label: "APY below winning cutoff", detail: `Need ${(WINNING_APY - newApy).toFixed(2)}% more` });
  else constraints.push({ pass: true, label: "APY above winning cutoff", detail: `+${(newApy - WINNING_APY).toFixed(2)}% margin` });
  
  if (newRunway < 5) constraints.push({ pass: false, label: "Bond runway critical", detail: `Only ~${newRunway} epochs left` });
  else if (newRunway < 10) constraints.push({ pass: null, label: "Bond runway limited", detail: `~${newRunway} epochs` });
  else constraints.push({ pass: true, label: "Bond runway healthy", detail: `~${newRunway} epochs` });

  if (simWant > simBond * 5000) constraints.push({ pass: false, label: "WANT exceeds bond capacity", detail: `Max ~${Math.floor(simBond * 5000).toLocaleString()}◎` });
  else constraints.push({ pass: true, label: "WANT within bond capacity", detail: `${simWant.toLocaleString()}◎` });

  if (hasPenaltyRisk) constraints.push({ pass: false, label: "Penalty risk", detail: wantReduced ? "Reducing WANT" : "Reducing bid" });

  return (
    <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 20, boxShadow: T.shadow }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500 }}>What-If Simulation</span>
          <HelpTip text={HELP.simulation} />
        </div>
        {anyChanged && (
          <button onClick={() => { setSimBid(v.stBid); setSimBond(v.bond); setSimWant(v.want); }} style={{
            fontSize: 11, color: T.muted, background: "none", border: `1px solid ${T.borderGrid}`, borderRadius: 6,
            padding: "3px 10px", cursor: "pointer", fontFamily: fontSans,
          }}>Reset</button>
        )}
      </div>

      {/* Sliders */}
      <div style={{ display: "grid", gap: 14, marginBottom: 16 }}>
        {/* Bid slider */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: T.fgSecondary }}>Stake Bid <HelpTip text={HELP.stBid} /></span>
            <span style={{ fontSize: 12, fontFamily: fontMono, fontWeight: 600, color: bidChanged ? T.primary : T.fg }}>{simBid.toFixed(3)}%</span>
          </div>
          <input type="range" min="0" max="1" step="0.005" value={simBid}
            onChange={e => setSimBid(parseFloat(e.target.value))}
            style={{ width: "100%", accentColor: T.primary, height: 4 }}
          />
          {bidReduced && (
            <div style={{ fontSize: 10, color: T.warning, marginTop: 2, fontFamily: fontSans }}>
              ⚠ Reducing bid may incur a temporary ranking penalty
            </div>
          )}
        </div>
        {/* Bond slider */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: T.fgSecondary }}>Bond Balance <HelpTip text={HELP.bond} /></span>
            <span style={{ fontSize: 12, fontFamily: fontMono, fontWeight: 600, color: bondChanged ? T.primary : T.fg }}>{simBond}◎</span>
          </div>
          <input type="range" min="0" max={Math.max(v.bond * 3, 500)} step="5" value={simBond}
            onChange={e => setSimBond(parseInt(e.target.value))}
            style={{ width: "100%", accentColor: T.primary, height: 4 }}
          />
        </div>
        {/* WANT slider */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: T.fgSecondary }}>Max Stake (WANT) <HelpTip text={HELP.want} /></span>
            <span style={{ fontSize: 12, fontFamily: fontMono, fontWeight: 600, color: wantChanged ? T.primary : T.fg }}>{simWant.toLocaleString()}◎</span>
          </div>
          <input type="range" min="0" max={Math.max(v.want * 2, 500000)} step="1000" value={simWant}
            onChange={e => setSimWant(parseInt(e.target.value))}
            style={{ width: "100%", accentColor: T.primary, height: 4 }}
          />
          {wantReduced && (
            <div style={{ fontSize: 10, color: T.warning, marginTop: 2, fontFamily: fontSans }}>
              ⚠ Reducing WANT below current stake may trigger forced unstaking penalties
            </div>
          )}
        </div>
      </div>

      {/* Constraint results (addresses feedback §5: "explain constraints, not just survival") */}
      {anyChanged && (
        <div style={{ borderTop: `1px solid ${T.borderGrid}`, paddingTop: 14 }}>
          <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, fontWeight: 500 }}>Simulation Checks</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {constraints.map((c, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 6, background: c.pass === true ? T.primaryLight05 : c.pass === false ? T.destructiveLight : T.warningLight }}>
                <span style={{ fontSize: 13 }}>{c.pass === true ? "✓" : c.pass === false ? "✗" : "!"}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: c.pass === true ? T.primary : c.pass === false ? T.destructive : T.warning }}>{c.label}</div>
                  <div style={{ fontSize: 11, color: T.muted }}>{c.detail}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: newInSet ? T.primaryLight10 : T.destructiveLight, border: `1px solid ${newInSet ? T.primary : T.destructive}18` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: newInSet ? T.primary : T.destructive }}>
                {newInSet ? (wasInSet ? "Stays in winning set" : "Enters winning set!") : "Drops out of winning set"}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, fontFamily: fontMono, color: apyDiff >= 0 ? T.primary : T.destructive }}>
                {newApy.toFixed(2)}% ({apyDiff >= 0 ? "+" : ""}{apyDiff.toFixed(2)}%)
              </span>
            </div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>
              Bond runway: ~{Math.min(newRunway, 999)} epochs ({Math.round(Math.min(newRunway, 999) * EPOCH_HOURS / 24)} days)
              {hasPenaltyRisk && <span style={{ color: T.warning }}> · Penalty risk active</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── BID DISTRIBUTION CHART (addresses feedback §8: competitive perception) ───
function BidDistribution({ validator }) {
  // Simulated bid distribution of all 211 validators
  const buckets = [
    { range: "0-0.05%", count: 42, color: T.secondary },
    { range: "0.05-0.10%", count: 38, color: T.secondary },
    { range: "0.10-0.20%", count: 35, color: T.secondary },
    { range: "0.20-0.35%", count: 30, color: T.secondary },
    { range: "0.35-0.50%", count: 40, color: T.secondary },
    { range: "0.50%+", count: 26, color: T.secondary },
  ];
  // Highlight the bucket this validator falls in
  const bid = validator.stBid;
  const yourBucket = bid < 0.05 ? 0 : bid < 0.10 ? 1 : bid < 0.20 ? 2 : bid < 0.35 ? 3 : bid < 0.50 ? 4 : 5;
  const maxCount = Math.max(...buckets.map(b => b.count));

  return (
    <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 20, boxShadow: T.shadow }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
        <span style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500 }}>Bid Distribution</span>
        <HelpTip text={HELP.bidDistribution} />
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 60, marginBottom: 6 }}>
        {buckets.map((b, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span style={{ fontSize: 9, color: T.muted, fontFamily: fontMono }}>{b.count}</span>
            <div style={{
              width: "100%", borderRadius: 3,
              height: `${(b.count / maxCount) * 48}px`,
              background: i === yourBucket ? T.primary : T.secondary,
              transition: "all 0.2s",
            }} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {buckets.map((b, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 9, color: i === yourBucket ? T.primary : T.muted, fontFamily: fontMono, fontWeight: i === yourBucket ? 600 : 400 }}>
            {b.range}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: T.muted }}>
        Your bid: <span style={{ color: T.primary, fontWeight: 600, fontFamily: fontMono }}>{validator.stBid}%</span>
        {" · "}Median bid: <span style={{ fontWeight: 500, fontFamily: fontMono }}>0.18%</span>
        {" · "}Winning floor: <span style={{ fontWeight: 500, fontFamily: fontMono }}>0.09%</span>
      </div>
    </div>
  );
}

// ─── PROFITABILITY ESTIMATOR (addresses feedback §1, §3, §8) ───
function ProfitabilityEstimate({ validator }) {
  const v = validator;
  const stakeK = v.samActive / 1000;
  // Simplified P&L model
  const annualBidCost = (v.stBid / 100) * v.samActive; // SOL paid from bond annually
  const epochBidCost = annualBidCost * (EPOCH_HOURS / 8760);
  const inflRevenue = (v.infl / 100) * NETWORK.inflationBaseRate / 100 * v.samActive; // commission earned
  const mevRevenue = (v.mev / 100) * NETWORK.mevTipsRate / 100 * v.samActive;
  const blockRevenue = ((100 - v.block) / 100) * NETWORK.blockRewardsRate / 100 * v.samActive;
  const annualCommRevenue = inflRevenue + mevRevenue + blockRevenue;

  return (
    <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 20, boxShadow: T.shadow }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
        <span style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500 }}>Economic Overview</span>
        <HelpTip text={HELP.profitability} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ padding: "10px 14px", borderRadius: 8, background: T.primaryLight05, border: `1px solid ${T.primary}12` }}>
          <div style={{ fontSize: 10, color: T.muted, marginBottom: 2 }}>Commission Revenue</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: T.primary, fontFamily: fontMono }}>{annualCommRevenue.toFixed(0)} ◎<span style={{ fontSize: 11, color: T.muted }}>/yr</span></div>
          <div style={{ fontSize: 10, color: T.muted }}>Infl: {v.infl}% · MEV: {v.mev}% · Block: {100 - v.block}%</div>
        </div>
        <div style={{ padding: "10px 14px", borderRadius: 8, background: T.destructiveLight, border: `1px solid ${T.destructive}12` }}>
          <div style={{ fontSize: 10, color: T.muted, marginBottom: 2 }}>Bond Cost (Bid)</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: T.destructive, fontFamily: fontMono }}>{annualBidCost.toFixed(0)} ◎<span style={{ fontSize: 11, color: T.muted }}>/yr</span></div>
          <div style={{ fontSize: 10, color: T.muted }}>{epochBidCost.toFixed(1)} ◎/epoch at {v.stBid}% bid</div>
        </div>
      </div>
      <div style={{ marginTop: 10, padding: "8px 14px", borderRadius: 8, background: (annualCommRevenue - annualBidCost) >= 0 ? T.primaryLight05 : T.warningLight, border: `1px solid ${T.borderGrid}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: T.fgSecondary }}>Net SAM P&L (excl. infra costs)</span>
          <span style={{ fontSize: 14, fontWeight: 700, fontFamily: fontMono, color: (annualCommRevenue - annualBidCost) >= 0 ? T.primary : T.destructive }}>
            {(annualCommRevenue - annualBidCost) >= 0 ? "+" : ""}{(annualCommRevenue - annualBidCost).toFixed(0)} ◎/yr
          </span>
        </div>
        <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>
          {annualCommRevenue > annualBidCost
            ? `Commission revenue covers bid cost. Net positive at ${stakeK.toFixed(0)}K◎ active stake.`
            : `Bid cost exceeds commission revenue. Consider lowering bid or raising commission.`
          }
        </div>
      </div>
      <div style={{ marginTop: 8, fontSize: 10, color: T.muted, lineHeight: 1.4 }}>
        Excludes server costs, opportunity cost of bonded SOL, and variable MEV/priority fee income. For detailed profitability modeling, see <span style={{ color: T.primary, cursor: "pointer", textDecoration: "underline" }}>validator economics guide</span>.
      </div>
    </div>
  );
}

// ─── DETAIL VIEW ───
function DetailView({ validator, onBack }) {
  const v = validator;
  const delta = formatDelta(v);
  const tip = getTip(v);
  const tipStyle = getTipStyle(tip.urgency);
  const health = getBondHealth(v.bondUtilPct, v.epochsRunway);
  const bondStyle = getBondStyle(health);
  const apy = getApyBreakdown(v);
  const apyDiff = v.maxApy - WINNING_APY;
  const isAboveLine = v.inSet;

  const segments = [
    { label: "Inflation", value: apy.inflYield, color: T.primary },
    { label: "MEV Tips", value: apy.mevYield, color: T.info },
    { label: "Block Rewards", value: apy.blockYield, color: "#FBBF24" },
    { label: "Stake Bid", value: apy.bidYield, color: "#C084FC" },
  ];

  // "Why this rank?" constraints (addresses feedback §2, §4)
  const rankReasons = [];
  rankReasons.push({ factor: "Max APY", value: `${v.maxApy.toFixed(2)}%`, impact: v.maxApy >= WINNING_APY ? "positive" : "negative", note: v.maxApy >= WINNING_APY ? `+${(v.maxApy - WINNING_APY).toFixed(2)}% above cutoff` : `${(v.maxApy - WINNING_APY).toFixed(2)}% below cutoff` });
  rankReasons.push({ factor: "Bond capacity", value: `${v.bond}◎`, impact: v.bondUtilPct < 65 ? "positive" : v.bondUtilPct < 85 ? "neutral" : "negative", note: `${v.bondUtilPct}% utilized, ~${v.epochsRunway} epochs runway` });
  rankReasons.push({ factor: "WANT", value: `${v.want.toLocaleString()}◎`, impact: v.want > v.samActive ? "positive" : "neutral", note: v.want > v.samActive ? `Can accept ${(v.want - v.samActive).toLocaleString()}◎ more` : "At capacity" });
  rankReasons.push({ factor: "SFDP alignment", value: v.sfdpAligned ? "Yes" : "No", impact: v.sfdpAligned ? "positive" : "negative", note: v.sfdpAligned ? "Eligible for favorable weighting" : "Not aligned — may lose ranking priority" });
  rankReasons.push({ factor: "Block production", value: `${v.block}%`, impact: v.block >= 100 ? "positive" : "negative", note: v.block >= 100 ? "Full uptime" : "Missed slots reduce APY" });

  return (
    <div>
      <button onClick={onBack} style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "8px 14px", borderRadius: 8, border: `1px solid ${T.border}`,
        background: T.card, color: T.fgSecondary, fontSize: 13, fontWeight: 500,
        cursor: "pointer", fontFamily: fontSans, marginBottom: 16, boxShadow: T.shadow,
      }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M8.75 10.5L5.25 7L8.75 3.5" stroke={T.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Back to rankings
      </button>

      {/* ─── HEADER ─── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: T.shadow, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ background: v.inSet ? T.primaryLight : T.destructiveLight, borderRadius: 10, padding: "8px 16px", textAlign: "center", border: `1px solid ${v.inSet ? T.primary : T.destructive}25` }}>
            <div style={{ color: v.inSet ? T.primary : T.destructive, fontSize: 24, fontWeight: 700, fontFamily: fontMono }}>#{v.rank}</div>
          </div>
          <div>
            <div style={{ color: T.fg, fontSize: 20, fontWeight: 700 }}>{v.name}</div>
            <div style={{ color: T.muted, fontSize: 12, fontFamily: fontMono }}>{v.pubkey}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {[
            { label: "Max APY", value: `${v.maxApy.toFixed(2)}%`, color: T.fg },
            { label: "Bond", value: `${v.bond}◎`, color: bondStyle.color },
            { label: "Stake Δ", value: `${delta.arrow} ${delta.text}`, color: delta.color },
            { label: "Runway", value: `${v.epochsRunway}ep`, color: v.epochsRunway <= 10 ? T.warning : T.primary },
          ].map(m => (
            <div key={m.label} style={{ textAlign: "center", padding: "6px 16px" }}>
              <div style={{ fontSize: 10, color: T.muted, marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>{m.label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: fontMono, color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── ACTION TIP BANNER ─── */}
      <div style={{ padding: "14px 20px", borderRadius: 10, background: tipStyle.bg, border: `1px solid ${tipStyle.color}18`, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <span style={{ fontSize: 16 }}>{tipStyle.icon}</span>
          <div>
            <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>
              {tip.urgency === "critical" ? "Action Required" : tip.urgency === "warning" ? "Recommendation" : "Status"}
              {tip.constraint !== "none" && <span style={{ color: tipStyle.color }}> · {tip.constraint === "bond" ? "Bond constraint" : tip.constraint === "bid" ? "Bid constraint" : "Rank constraint"}</span>}
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.5, color: tipStyle.color }}>{tip.text}</div>
          </div>
        </div>
      </div>

      {/* ─── TWO-COLUMN LAYOUT ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* LEFT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Why This Rank (addresses feedback §2) */}
          <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 20, boxShadow: T.shadow }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
              <span style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500 }}>Why Rank #{v.rank}?</span>
            </div>
            {rankReasons.map((r, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 10px", borderRadius: 6, marginBottom: 4,
                background: r.impact === "positive" ? T.primaryLight05 : r.impact === "negative" ? "rgba(220,38,38,0.03)" : T.mutedBg,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, width: 14, textAlign: "center" }}>
                    {r.impact === "positive" ? "✓" : r.impact === "negative" ? "✗" : "—"}
                  </span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: T.fg }}>{r.factor}</div>
                    <div style={{ fontSize: 10, color: T.muted }}>{r.note}</div>
                  </div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, fontFamily: fontMono, color: T.fg }}>{r.value}</span>
              </div>
            ))}
          </div>

          {/* Position vs Winning APY */}
          <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 20, boxShadow: T.shadow }}>
            <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14, fontWeight: 500 }}>Position vs Winning APY</div>
            <div style={{ position: "relative", marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: T.muted }}>0%</span><span style={{ fontSize: 10, color: T.muted }}>20%</span>
              </div>
              <div style={{ height: 10, background: T.secondary, borderRadius: 5, position: "relative" }}>
                <div style={{ position: "absolute", left: `${(WINNING_APY / 20) * 100}%`, top: -4, width: 2, height: 18, background: T.primary, borderRadius: 1 }} />
                <div style={{ position: "absolute", left: `${(WINNING_APY / 20) * 100}%`, top: -20, transform: "translateX(-50%)", fontSize: 10, color: T.primary, fontWeight: 600, fontFamily: fontMono }}>{WINNING_APY}%</div>
                <div style={{ position: "absolute", left: `${(v.maxApy / 20) * 100}%`, top: -6, width: 14, height: 14, borderRadius: "50%", background: v.inSet ? T.primary : T.destructive, border: `2px solid ${T.card}`, boxShadow: `0 0 0 2px ${v.inSet ? T.primary : T.destructive}40`, transform: "translateX(-50%)" }} />
                <div style={{ height: "100%", borderRadius: 5, width: `${Math.min((v.maxApy / 20) * 100, 100)}%`, background: `linear-gradient(90deg, ${T.primaryLight10}, ${v.inSet ? T.primaryLight : T.destructiveLight})` }} />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, background: isAboveLine ? T.primaryLight10 : T.destructiveLight }}>
              <span style={{ fontSize: 22, fontWeight: 700, fontFamily: fontMono, color: isAboveLine ? T.primary : T.destructive }}>
                {apyDiff > 0 ? "+" : ""}{apyDiff.toFixed(2)}%
              </span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: isAboveLine ? T.primary : T.destructive }}>
                  {isAboveLine ? "Above the winning cutoff" : "Below the winning cutoff"}
                </div>
                <div style={{ fontSize: 11, color: T.muted }}>
                  {isAboveLine ? "Margin of safety before losing stake" : "Gap to close to enter winning set"}
                </div>
              </div>
            </div>
          </div>

          {/* APY Composition */}
          <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 20, boxShadow: T.shadow }}>
            <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14, fontWeight: 500 }}>APY Composition</div>
            <div style={{ display: "flex", gap: 2, height: 24, borderRadius: 5, overflow: "hidden", marginBottom: 12 }}>
              {segments.map(seg => (
                seg.value > 0 && <div key={seg.label} style={{ flex: seg.value, background: seg.color, borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {seg.value > 1 && <span style={{ fontSize: 9, color: "#fff", fontWeight: 600, fontFamily: fontMono }}>{seg.value.toFixed(1)}%</span>}
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
              {segments.map(seg => (
                <div key={seg.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "3px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 9, height: 9, borderRadius: 2, background: seg.color }} />
                    <span style={{ fontSize: 12, color: T.fgSecondary }}>{seg.label}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.fg, fontFamily: fontMono }}>{seg.value.toFixed(2)}%</span>
                </div>
              ))}
            </div>
            <div style={{ borderTop: `1px solid ${T.borderGrid}`, marginTop: 6, paddingTop: 6, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: T.fg }}>Total</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.primary, fontFamily: fontMono }}>{apy.total.toFixed(2)}%</span>
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: T.muted, lineHeight: 1.4 }}>
              Base rates (0% comm.): Inflation {NETWORK.inflationBaseRate}% · MEV {NETWORK.mevTipsRate}% · Block {NETWORK.blockRewardsRate}%
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* What-If Simulation */}
          <WhatIfPanel validator={v} />
          {/* Bid Distribution */}
          <BidDistribution validator={v} />
          {/* Profitability */}
          <ProfitabilityEstimate validator={v} />
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ───
export default function Dashboard() {
  const [selectedValidator, setSelectedValidator] = useState(null);

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: fontSans }}>
      <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Nav */}
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="14" fill={T.primary}/><path d="M8 14.5C8 14.5 10.5 10 14 10C17.5 10 20 14.5 20 14.5C20 14.5 17.5 19 14 19C10.5 19 8 14.5 8 14.5Z" stroke="white" strokeWidth="1.5" fill="none"/><circle cx="14" cy="14.5" r="2" fill="white"/></svg>
          <span style={{ fontSize: 16, fontWeight: 700, color: T.fg }}>Marinade</span>
        </div>
        <div style={{ display: "flex", gap: 24, fontSize: 14, fontWeight: 500 }}>
          {["Portfolio", "Earn", "Borrow", "Validators"].map((item, i) => (
            <span key={item} style={{
              color: i === 3 ? T.primary : T.muted, cursor: "pointer",
              borderBottom: i === 3 ? `2px solid ${T.primary}` : "2px solid transparent",
              paddingBottom: 16, paddingTop: 16,
            }}>{item}</span>
          ))}
        </div>
        <div style={{ padding: "6px 14px", borderRadius: 8, background: T.mutedBg, border: `1px solid ${T.border}`, fontSize: 13, color: T.fgSecondary, fontFamily: fontMono }}>6QUX…PFb9</div>
      </div>

      <div style={{ maxWidth: 1260, margin: "0 auto", padding: "28px 24px" }}>
        <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: T.fg, margin: 0 }}>Stake Auction Marketplace</h1>
            <p style={{ color: T.muted, fontSize: 13, margin: "4px 0 0" }}>Epoch 924 · Per-validator stake cap: 8% of TVL (MIP-19)</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: T.card, border: `1px solid ${T.border}`, color: T.fgSecondary, cursor: "pointer" }}>Docs</button>
            <button style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: T.primary, border: "none", color: "#FFFFFF", cursor: "pointer" }}>Enter Simulation</button>
          </div>
        </div>

        <StatsBar />

        {selectedValidator ? (
          <DetailView validator={selectedValidator} onBack={() => setSelectedValidator(null)} />
        ) : (
          <CleanTable onSelectValidator={setSelectedValidator} />
        )}
      </div>
    </div>
  );
}
