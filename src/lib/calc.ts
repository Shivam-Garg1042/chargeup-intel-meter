// Battery OEM Intel Meter — calculation engine
// All monetary values in INR.

export type FaultKey =
  | "warranty"
  | "deepDischarge"
  | "thermal"
  | "cellImbalance"
  | "bms"
  | "sensor";

export interface CalcInputs {
  totalBatteries: number;
  monthlyFaultRatePct: number; // % of fleet faulting per month
  manualRcaHours: number; // hours per fault for root cause analysis
  hourlyTechnicianRate: number; // INR / hour
  avgBatteryValue: number; // INR replacement cost
  dailyRevenuePerAsset: number; // INR / day per running asset
  // Per-fault manual detection rate override (0..100, %). When omitted, defaults are used.
  faultManualDetectionPct?: Partial<Record<FaultKey, number>>;
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

  // Fault Intelligence Mini-Meters (what Chargeup IoT detects that manual ops misses)
  faultMeters: {
    key: FaultKey;
    label: string;
    sublabel?: string;
    detected: number; // count per month detected by Chargeup IoT
    missedByManual: number; // count per month invisible to manual ops
    manualDetectionPct: number; // 0..100 — current manual detection % (user-tunable)
    valueAtRisk: number; // monthly INR exposure
  }[];

  // SoH (State of Health) portfolio split — what a Battery Passport reveals
  sohSplit: {
    healthy: number; // >95%
    moderate: number; // 85-95%
    atRisk: number; // <85%
  };
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

export const DEFAULT_MANUAL_DETECTION_PCT: Record<FaultKey, number> = {
  warranty: 5,
  deepDischarge: 10,
  thermal: 8,
  cellImbalance: 5,
  bms: 15,
  sensor: 10,
};

export const FAULT_META: Record<
  FaultKey,
  { label: string; sublabel: string; sharePct: number; severity: number }
> = {
  warranty: { label: "Warranty Violations", sublabel: "Customer abuse / out-of-spec usage", sharePct: 0.18, severity: 0.45 },
  deepDischarge: { label: "Deep Discharge Events", sublabel: "Capacity-killing over-drain", sharePct: 0.16, severity: 0.18 },
  thermal: { label: "Thermal Alerts", sublabel: "Overheating → fire risk", sharePct: 0.12, severity: 0.6 },
  cellImbalance: { label: "Cell Imbalance", sublabel: "Early-warning of pack failure", sharePct: 0.22, severity: 0.15 },
  bms: { label: "BMS Faults", sublabel: "Brain of the battery misbehaving", sharePct: 0.18, severity: 0.25 },
  sensor: { label: "Sensor Faults (NTC / Voltage)", sublabel: "Blind instrumentation", sharePct: 0.14, severity: 0.12 },
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
  const extraUptimeDaysPerAsset = (uptimeDeltaPct / 100) * 30;
  const uptimeLeak = inputs.totalBatteries * extraUptimeDaysPerAsset * inputs.dailyRevenuePerAsset;

  // C. Warranty Leak
  const warrantyAnnual =
    inputs.totalBatteries * BENCHMARKS.warrantyDisputeRatePct * inputs.avgBatteryValue;
  const warrantyLeak = warrantyAnnual / 12;

  // D. Resale
  const resaleAnnual =
    (inputs.totalBatteries * inputs.avgBatteryValue * BENCHMARKS.resaleUpliftPct) / 5;
  const resaleLeak = resaleAnnual / 12;

  // E. Prevented faults
  const preventedFaultsPerMonth = faultsPerMonth * BENCHMARKS.proactiveFailurePreventionPct;
  const avgRepairCost = inputs.avgBatteryValue * 0.15;
  const preventedRepairValue = preventedFaultsPerMonth * avgRepairCost;

  const monthlyLeak = laborLeak + uptimeLeak + warrantyLeak + resaleLeak + preventedRepairValue;
  const annualLeak = monthlyLeak * 12;
  const fiveYearLeak = annualLeak * 5;

  const portfolioValue = inputs.totalBatteries * inputs.avgBatteryValue;
  const annualRoaGain = portfolioValue * BENCHMARKS.roaUpliftPct;

  // Fault meters — built from FAULT_META + user-tunable manual detection %
  const faultKeys = Object.keys(FAULT_META) as FaultKey[];
  const faultMeters = faultKeys.map((key) => {
    const meta = FAULT_META[key];
    const manualDetectionPct =
      inputs.faultManualDetectionPct?.[key] ?? DEFAULT_MANUAL_DETECTION_PCT[key];
    const detected = faultsPerMonth * meta.sharePct;
    const missedByManual = detected * (1 - manualDetectionPct / 100);
    const valueAtRisk = missedByManual * inputs.avgBatteryValue * meta.severity;
    return {
      key,
      label: meta.label,
      sublabel: meta.sublabel,
      detected,
      missedByManual,
      manualDetectionPct,
      valueAtRisk,
    };
  });

  // Intel Index — driven primarily by tunable fault visibility + ops inputs
  //   Fault visibility (0-50): share-weighted manual detection %
  //   Fault rate (0-15), RCA speed (0-15), Scale (0-10), Asset (0-5), Revenue (0-5)
  const totalShare = faultMeters.reduce((s, m) => s + FAULT_META[m.key].sharePct, 0);
  const weightedDetection =
    faultMeters.reduce(
      (s, m) => s + (m.manualDetectionPct / 100) * FAULT_META[m.key].sharePct,
      0,
    ) / (totalShare || 1);
  const visibilityScore = weightedDetection * 50;
  const faultScore = Math.max(0, 15 - (inputs.monthlyFaultRatePct - 1) * 1.25);
  const rcaScore = Math.max(0, 15 - inputs.manualRcaHours * 2.5);
  const scaleScore = Math.max(0, 10 - Math.log10(Math.max(50, inputs.totalBatteries)) * 2.3);
  const assetScore = Math.max(0, 5 - (inputs.avgBatteryValue / 200000) * 5);
  const revenueScore = Math.max(0, 5 - (inputs.dailyRevenuePerAsset / 2000) * 5);
  const rawIndex =
    visibilityScore + faultScore + rcaScore + scaleScore + assetScore + revenueScore;
  const intelIndex = Math.round(Math.min(100, Math.max(0, rawIndex)));

  let intelTier: CalcResults["intelTier"] = "dark";
  let intelTierLabel = "The Dark Zone";
  if (intelIndex >= 70) {
    intelTier = "leader";
    intelTierLabel = "Fi-Ne-Tech Leader";
  } else if (intelIndex >= 40) {
    intelTier = "fragmented";
    intelTierLabel = "Fragmented Data";
  }

  // SoH portfolio split — Chargeup-style benchmark from the user's screenshot
  const sohSplit = {
    healthy: Math.round(inputs.totalBatteries * 0.56),
    moderate: Math.round(inputs.totalBatteries * 0.27),
    atRisk: Math.round(inputs.totalBatteries * 0.17),
  };

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
    faultMeters,
    sohSplit,
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
