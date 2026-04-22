// Battery OEM Intel Meter — calculation engine
// All monetary values in INR.

export interface CalcInputs {
  totalBatteries: number;
  monthlyFaultRatePct: number; // % of fleet faulting per month
  manualRcaHours: number; // hours per fault for root cause analysis
  hourlyTechnicianRate: number; // INR / hour
  avgBatteryValue: number; // INR replacement cost
  dailyRevenuePerAsset: number; // INR / day per running asset
}

export interface CalcResults {
  // A. Labor Leak
  manualRcaCost: number;
  intelligentRcaCost: number;
  laborLeak: number;
  laborSavingsPct: number;

  // B. Uptime Earnings Gap
  manualUptimePct: number;
  chargeupUptimePct: number;
  extraUptimeDays: number;
  uptimeLeak: number;

  // C. Warranty Leakage
  warrantyDisputeRatePct: number;
  warrantyLeak: number;

  // D. Resale / Devaluation Gap
  resaleUpliftPct: number;
  resaleLeak: number;

  // E. Breakdown reduction (proactive)
  faultsPerMonth: number;
  preventedFaultsPerMonth: number;
  preventedRepairValue: number;

  // Totals
  monthlyLeak: number;
  annualLeak: number;
  fiveYearLeak: number;

  // RoA
  portfolioValue: number;
  roaUpliftPct: number;
  annualRoaGain: number;

  // Intel Index 0-100
  intelIndex: number;
  intelTier: "dark" | "fragmented" | "leader";
  intelTierLabel: string;
}

export const DEFAULTS: CalcInputs = {
  totalBatteries: 1000,
  monthlyFaultRatePct: 8,
  manualRcaHours: 3,
  hourlyTechnicianRate: 350,
  avgBatteryValue: 45000,
  dailyRevenuePerAsset: 250,
};

// Chargeup verified benchmarks
export const BENCHMARKS = {
  intelligentRcaHours: 5 / 60, // 5 minutes
  faultReductionPct: 0.5, // 50% fewer breakdowns
  serviceCostReductionPct: 0.5,
  proactiveFailurePreventionPct: 0.8,
  manualUptimePct: 85,
  chargeupUptimePct: 99.3,
  warrantyDisputeRatePct: 0.02, // 2% of fleet/yr disputed without IoT
  resaleUpliftPct: 0.4,
  roaUpliftPct: 0.07,
};

export function calculate(inputs: CalcInputs): CalcResults {
  const faultsPerMonth = inputs.totalBatteries * (inputs.monthlyFaultRatePct / 100);

  // A. Labor Leak
  const manualRcaCost = faultsPerMonth * inputs.manualRcaHours * inputs.hourlyTechnicianRate;
  const intelligentFaults = faultsPerMonth * (1 - BENCHMARKS.faultReductionPct);
  const intelligentRcaCost =
    intelligentFaults * BENCHMARKS.intelligentRcaHours * inputs.hourlyTechnicianRate;
  const laborLeak = manualRcaCost - intelligentRcaCost;
  const laborSavingsPct = manualRcaCost > 0 ? (laborLeak / manualRcaCost) * 100 : 0;

  // B. Uptime Earnings Gap
  const uptimeDeltaPct = BENCHMARKS.chargeupUptimePct - BENCHMARKS.manualUptimePct; // 14.3
  const extraUptimeDaysPerAsset = (uptimeDeltaPct / 100) * 30; // ~4.29 days/mo
  const uptimeLeak = inputs.totalBatteries * extraUptimeDaysPerAsset * inputs.dailyRevenuePerAsset;

  // C. Warranty Leak (annual / 12 for monthly)
  const warrantyAnnual =
    inputs.totalBatteries * BENCHMARKS.warrantyDisputeRatePct * inputs.avgBatteryValue;
  const warrantyLeak = warrantyAnnual / 12;

  // D. Resale (one-time over asset life ~ 5 yrs → monthly amortized)
  const resaleAnnual =
    (inputs.totalBatteries * inputs.avgBatteryValue * BENCHMARKS.resaleUpliftPct) / 5;
  const resaleLeak = resaleAnnual / 12;

  // E. Prevented faults (proactive predictive alerts)
  const preventedFaultsPerMonth = faultsPerMonth * BENCHMARKS.proactiveFailurePreventionPct;
  const avgRepairCost = inputs.avgBatteryValue * 0.15; // ~15% of battery value per repair
  const preventedRepairValue = preventedFaultsPerMonth * avgRepairCost;

  const monthlyLeak = laborLeak + uptimeLeak + warrantyLeak + resaleLeak + preventedRepairValue;
  const annualLeak = monthlyLeak * 12;
  const fiveYearLeak = annualLeak * 5;

  // RoA
  const portfolioValue = inputs.totalBatteries * inputs.avgBatteryValue;
  const annualRoaGain = portfolioValue * BENCHMARKS.roaUpliftPct;

  // Intel Index — based on inputs (lower is darker)
  // Heuristic: higher manual hours + higher fault rate => lower score
  const faultScore = Math.max(0, 40 - inputs.monthlyFaultRatePct * 3); // 0..40
  const rcaScore = Math.max(0, 35 - inputs.manualRcaHours * 7); // 0..35
  const baseIntel = 25; // assume some monitoring exists
  const intelIndex = Math.round(Math.min(100, Math.max(0, faultScore + rcaScore + baseIntel - 25)));

  let intelTier: CalcResults["intelTier"] = "dark";
  let intelTierLabel = "The Dark Zone";
  if (intelIndex >= 70) {
    intelTier = "leader";
    intelTierLabel = "Fi-Ne-Tech Leader";
  } else if (intelIndex >= 40) {
    intelTier = "fragmented";
    intelTierLabel = "Fragmented Data";
  }

  return {
    manualRcaCost,
    intelligentRcaCost,
    laborLeak,
    laborSavingsPct,
    manualUptimePct: BENCHMARKS.manualUptimePct,
    chargeupUptimePct: BENCHMARKS.chargeupUptimePct,
    extraUptimeDays: extraUptimeDaysPerAsset,
    uptimeLeak,
    warrantyDisputeRatePct: BENCHMARKS.warrantyDisputeRatePct * 100,
    warrantyLeak,
    resaleUpliftPct: BENCHMARKS.resaleUpliftPct * 100,
    resaleLeak,
    faultsPerMonth,
    preventedFaultsPerMonth,
    preventedRepairValue,
    monthlyLeak,
    annualLeak,
    fiveYearLeak,
    portfolioValue,
    roaUpliftPct: BENCHMARKS.roaUpliftPct * 100,
    annualRoaGain,
    intelIndex,
    intelTier,
    intelTierLabel,
  };
}

export function formatINR(n: number, opts: { compact?: boolean } = {}): string {
  if (!isFinite(n)) return "₹0";
  if (opts.compact) {
    if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
    if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
    if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
    return `₹${Math.round(n)}`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}
