import { useEffect, useMemo, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Battery,
  Clock,
  Cpu,
  Eye,
  Flame,
  Gauge,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  Wallet,
  Zap,
  ArrowRight,
  Activity,
  Wrench,
  BatteryWarning,
  Radio,
} from "lucide-react";
import { calculate, DEFAULTS, formatINR, type CalcInputs, type FaultKey } from "@/lib/calc";
import logo from "@/assets/chargeup-logo.png";

function AnimatedNumber({
  value,
  format = (v: number) => formatINR(v, { compact: true }),
  className,
}: {
  value: number;
  format?: (v: number) => string;
  className?: string;
}) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 80, damping: 20 });
  const display = useTransform(spring, (v) => format(v));
  useEffect(() => {
    mv.set(value);
  }, [value, mv]);
  return <motion.span className={className}>{display}</motion.span>;
}

function FieldNumber({
  label,
  value,
  onChange,
  min,
  max,
  step,
  prefix,
  suffix,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  prefix?: string;
  suffix?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <Label className="text-sm font-semibold text-primary-foreground/90">{label}</Label>
        <div className="flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 font-mono text-sm font-semibold text-white ring-1 ring-white/15">
          {prefix && <span className="text-white/60">{prefix}</span>}
          <Input
            type="number"
            value={value}
            onChange={(e) => onChange(Number(e.target.value) || 0)}
            min={min}
            max={max}
            step={step}
            className="h-6 w-20 border-0 bg-transparent p-0 text-right font-mono text-sm font-semibold text-white shadow-none focus-visible:ring-0"
          />
          {suffix && <span className="text-white/60">{suffix}</span>}
        </div>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0])}
        className="[&_[data-slot=slider-range]]:bg-[var(--brand-green-bright)] [&_[data-slot=slider-thumb]]:border-[var(--brand-green-bright)] [&_[data-slot=slider-thumb)]]:bg-white"
      />
      {hint && <p className="text-xs text-white/50">{hint}</p>}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  manualValue,
  intelValue,
  leak,
  tone = "navy",
  formula,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  manualValue: string;
  intelValue: string;
  leak: number;
  tone?: "navy" | "amber" | "red";
  formula?: string;
}) {
  const toneRing =
    tone === "red"
      ? "ring-[var(--brand-red)]/30"
      : tone === "amber"
        ? "ring-[var(--brand-amber)]/30"
        : "ring-border";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`group relative overflow-hidden rounded-2xl bg-card p-6 shadow-card ring-1 ${toneRing}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-navy)]/5 text-[var(--brand-navy)]">
            <Icon className="h-5 w-5" />
          </div>
          <h4 className="text-base font-bold text-foreground">{label}</h4>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-[var(--brand-red)]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--brand-red)]">
          <TrendingDown className="h-3 w-3" /> Leak
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-dashed border-[var(--brand-red)]/30 bg-[var(--brand-red)]/5 p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-red)]/80">
            Manual
          </div>
          <div className="mt-1 font-mono text-sm font-bold text-foreground">{manualValue}</div>
        </div>
        <div className="rounded-xl border border-[var(--brand-green)]/30 bg-[var(--brand-green)]/8 p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-green)]">
            Chargeup
          </div>
          <div className="mt-1 font-mono text-sm font-bold text-foreground">{intelValue}</div>
        </div>
      </div>

      <div className="mt-5 flex items-end justify-between gap-3 border-t border-border pt-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Monthly bleed
          </div>
          <AnimatedNumber
            value={leak}
            className="font-mono text-2xl font-extrabold text-[var(--brand-red)]"
          />
        </div>
        {formula && (
          <code className="hidden max-w-[55%] rounded-md bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground sm:block">
            {formula}
          </code>
        )}
      </div>
    </motion.div>
  );
}

function CircularIntelGauge({
  score,
  tierLabel,
  tierColor,
}: {
  score: number;
  tierLabel: string;
  tierColor: string;
}) {
  const clamped = Math.min(100, Math.max(0, score));
  const R = 90;
  const C = 2 * Math.PI * R; // circumference

  // Animated stroke offset (ring fill)
  const target = useMotionValue(clamped);
  const spring = useSpring(target, { stiffness: 80, damping: 18 });
  useEffect(() => {
    target.set(clamped);
  }, [clamped, target]);
  const dashOffset = useTransform(spring, (v) => C - (v / 100) * C);

  // Stroke color reacts to score
  const stroke =
    clamped >= 70
      ? "var(--brand-green-bright)"
      : clamped >= 40
        ? "var(--brand-amber)"
        : "var(--brand-red)";

  return (
    <div className="relative mx-auto mt-2 aspect-square w-full max-w-[260px]">
      <svg viewBox="0 0 220 220" className="h-full w-full -rotate-90">
        {/* Track */}
        <circle
          cx="110"
          cy="110"
          r={R}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="16"
        />
        {/* Glow under-ring */}
        <motion.circle
          cx="110"
          cy="110"
          r={R}
          fill="none"
          stroke={stroke}
          strokeWidth="22"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={dashOffset}
          opacity={0.18}
          style={{ filter: "blur(6px)" }}
        />
        {/* Active ring */}
        <motion.circle
          cx="110"
          cy="110"
          r={R}
          fill="none"
          stroke={stroke}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={dashOffset}
        />
      </svg>

      {/* Center content (not rotated) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/50">
          Intel Index
        </div>
        <AnimatedNumber
          value={clamped}
          format={(v) => Math.round(v).toString()}
          className="font-mono text-6xl font-extrabold leading-none text-white"
        />
        <div className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-white/50">
          / 100
        </div>
        <div
          className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold"
          style={{ backgroundColor: tierColor, color: "#0F2C44" }}
        >
          {tierLabel}
        </div>
      </div>
    </div>
  );
}

export default function IntelMeter() {
  const [inputs, setInputs] = useState<CalcInputs>(DEFAULTS);
  const results = useMemo(() => calculate(inputs), [inputs]);

  const update = <K extends keyof CalcInputs>(key: K, value: CalcInputs[K]) =>
    setInputs((p) => ({ ...p, [key]: value }));

  const updateFaultDetection = (key: FaultKey, pct: number) =>
    setInputs((p) => ({
      ...p,
      faultManualDetectionPct: { ...(p.faultManualDetectionPct ?? {}), [key]: pct },
    }));

  const resetFaultDetection = () =>
    setInputs((p) => ({ ...p, faultManualDetectionPct: undefined }));

  const tierColor =
    results.intelTier === "leader"
      ? "var(--brand-green)"
      : results.intelTier === "fragmented"
        ? "var(--brand-amber)"
        : "var(--brand-red)";

  return (
    <div className="min-h-screen bg-background">
      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-2">
            <img src={logo} alt="Chargeup" className="h-8 w-auto" />
          </a>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-foreground/70 md:flex">
            <a href="#calculator" className="hover:text-[var(--brand-green)]">
              Calculator
            </a>
            <a href="#breakdown" className="hover:text-[var(--brand-green)]">
              Loss Breakdown
            </a>
            <a href="#faults" className="hover:text-[var(--brand-green)]">
              Fault Intel
            </a>
            <a href="#index" className="hover:text-[var(--brand-green)]">
              Intel Index
            </a>
          </nav>
          <Button
            asChild
            className="rounded-full bg-[var(--brand-green)] font-semibold text-white shadow-green hover:bg-[var(--brand-green-bright)]"
          >
            <a href="#cta">
              Stop the Bleed <ArrowRight className="ml-1 h-4 w-4" />
            </a>
          </Button>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-hero text-white">
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute -left-20 top-10 h-96 w-96 rounded-full bg-[var(--brand-green)]/30 blur-3xl" />
          <div className="absolute right-0 top-40 h-96 w-96 rounded-full bg-[var(--brand-green-bright)]/20 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-12 lg:pb-24 lg:pt-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--brand-green-bright)]">
              <Activity className="h-3.5 w-3.5" /> Battery OEM Intel Meter
            </div>
            <h1 className="mt-6 text-5xl font-extrabold leading-[1.05] tracking-tight md:text-7xl">
              Without Chargeup IoT,
              <br />
              <span className="bg-gradient-to-r from-[var(--brand-green-bright)] to-white bg-clip-text text-transparent">
                you don't sell batteries — you ship blind spots.
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-white/70 md:text-xl">
              Every battery you ship without intelligence becomes a warranty risk, a thermal event
              waiting to happen, a customer churn trigger. See — in rupees — what your fleet is
              bleeding every month because it can't talk back.
            </p>
          </motion.div>

          {/* CALCULATOR + BIG REVEAL */}
          <div id="calculator" className="mt-12 grid gap-6 lg:mt-16 lg:grid-cols-[1.1fr_1fr]">
            {/* Inputs panel */}
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl md:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">Your Operational Inputs</h3>
                  <p className="text-sm text-white/60">
                    All calculations run live from Chargeup's verified benchmarks.
                  </p>
                </div>
                <Battery className="h-6 w-6 text-[var(--brand-green-bright)]" />
              </div>

              <div className="mt-8 grid gap-6 md:grid-cols-2">
                <FieldNumber
                  label="Total Batteries Deployed"
                  value={inputs.totalBatteries}
                  onChange={(v) => update("totalBatteries", v)}
                  min={50}
                  max={20000}
                  step={50}
                  suffix="units"
                />
                <FieldNumber
                  label="Monthly Fault Rate"
                  value={inputs.monthlyFaultRatePct}
                  onChange={(v) => update("monthlyFaultRatePct", v)}
                  min={1}
                  max={25}
                  step={0.5}
                  suffix="%"
                  hint="Industry average: 5–10%"
                />
                <FieldNumber
                  label="Manual RCA Hours / Fault"
                  value={inputs.manualRcaHours}
                  onChange={(v) => update("manualRcaHours", v)}
                  min={0.5}
                  max={8}
                  step={0.5}
                  suffix="hrs"
                  hint="Chargeup Service Genie: 5 minutes"
                />
                <FieldNumber
                  label="Technician Hourly Rate"
                  value={inputs.hourlyTechnicianRate}
                  onChange={(v) => update("hourlyTechnicianRate", v)}
                  min={100}
                  max={1500}
                  step={25}
                  prefix="₹"
                />
                <FieldNumber
                  label="Avg Battery Replacement Value"
                  value={inputs.avgBatteryValue}
                  onChange={(v) => update("avgBatteryValue", v)}
                  min={10000}
                  max={200000}
                  step={1000}
                  prefix="₹"
                />
                <FieldNumber
                  label="Daily Revenue / Asset"
                  value={inputs.dailyRevenuePerAsset}
                  onChange={(v) => update("dailyRevenuePerAsset", v)}
                  min={50}
                  max={2000}
                  step={25}
                  prefix="₹"
                  hint="Driver/operator earnings per running day"
                />
              </div>

              {inputs.monthlyFaultRatePct < 1.5 && (
                <div className="mt-6 flex items-start gap-3 rounded-xl border border-[var(--brand-amber)]/40 bg-[var(--brand-amber)]/10 p-4">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--brand-amber)]" />
                  <div className="text-sm text-white/80">
                    <strong className="text-[var(--brand-amber)]">
                      High Risk / Blind Spot Zone.
                    </strong>{" "}
                    Reporting near-zero faults usually means you're flying blind — likely losing ~7%
                    on Return on Assets.
                  </div>
                </div>
              )}
            </div>

            {/* Big Reveal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative overflow-hidden rounded-3xl border border-[var(--brand-red)]/40 bg-gradient-leak p-8 text-white shadow-brand"
            >
              <div className="absolute -right-10 -top-10 h-48 w-48 animate-pulse-leak rounded-full bg-white/10 blur-2xl" />
              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest">
                  <TrendingDown className="h-3 w-3" /> Live Leakage Counter
                </div>
                <p className="mt-6 text-sm font-medium uppercase tracking-wider text-white/80">
                  Your fleet is bleeding
                </p>
                <AnimatedNumber
                  value={results.annualLeak}
                  className="mt-2 block font-mono text-5xl font-extrabold leading-none md:text-6xl"
                />
                <p className="mt-2 text-sm text-white/80">per year — and counting.</p>

                <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/20 pt-6">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-white/70">
                      Per month
                    </div>
                    <AnimatedNumber
                      value={results.monthlyLeak}
                      className="font-mono text-xl font-bold"
                    />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-white/70">
                      Over 5 years
                    </div>
                    <AnimatedNumber
                      value={results.fiveYearLeak}
                      className="font-mono text-xl font-bold"
                    />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-white/70">
                      Faults / month
                    </div>
                    <div className="font-mono text-xl font-bold">
                      {Math.round(results.faultsPerMonth)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-white/70">
                      Portfolio at risk
                    </div>
                    <div className="font-mono text-xl font-bold">
                      {formatINR(results.portfolioValue, { compact: true })}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* BENCHMARK STRIP */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-border md:grid-cols-4">
          {[
            { label: "Service Cost Cut", value: "50%", icon: Wrench },
            { label: "Faster Diagnosis", value: "5 min", icon: Clock },
            { label: "Verified Uptime", value: "99.3%", icon: Gauge },
            { label: "Higher Resale", value: "+40%", icon: Wallet },
          ].map((b) => (
            <div key={b.label} className="flex items-center gap-4 px-6 py-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand-green)]/10 text-[var(--brand-green)]">
                <b.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="font-mono text-2xl font-extrabold text-foreground">{b.value}</div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {b.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* LOSS BREAKDOWN */}
      <section id="breakdown" className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-12 max-w-2xl">
          <div className="text-xs font-bold uppercase tracking-widest text-[var(--brand-green)]">
            The Loss Breakdown
          </div>
          <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
            Where your money is silently leaving the building.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Each card below is one of five active leaks in an unmonitored OEM fleet. The math is
            transparent — recalculated every time you move a slider.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            icon={Wrench}
            label="A. Labor Leak (Diagnostic)"
            manualValue={`${inputs.manualRcaHours} hrs / fault`}
            intelValue="5 min / fault"
            leak={results.laborLeak}
            tone="red"
            formula="(faults × hrs × ₹/hr)"
          />
          <MetricCard
            icon={Gauge}
            label="B. Uptime Earnings Gap"
            manualValue={`${results.manualUptimePct}% uptime`}
            intelValue={`${results.chargeupUptimePct}% uptime`}
            leak={results.uptimeLeak}
            tone="amber"
            formula="+4.3 days × ₹/day"
          />
          <MetricCard
            icon={ShieldCheck}
            label="C. Warranty Field-Blindness"
            manualValue="Weeks of disputes"
            intelValue="Seconds, auto-validated"
            leak={results.warrantyLeak}
            tone="navy"
            formula="2% × battery value"
          />
          <MetricCard
            icon={Wallet}
            label="D. Resale / Devaluation"
            manualValue="Standard market"
            intelValue="+40% w/ Battery Passport"
            leak={results.resaleLeak}
            tone="navy"
            formula="40% uplift / 5 yrs"
          />
          <MetricCard
            icon={Zap}
            label="E. Preventable Breakdowns"
            manualValue="Reactive only"
            intelValue="80% prevented (7–30d alerts)"
            leak={results.preventedRepairValue}
            tone="red"
            formula="80% × repair value"
          />
          <MetricCard
            icon={Sparkles}
            label="F. Return on Assets Uplift"
            manualValue="Standard RoA"
            intelValue="+7% RoA on portfolio"
            leak={results.annualRoaGain / 12}
            tone="amber"
            formula="7% × portfolio / 12"
          />
        </div>
      </section>

      {/* COMBINED — FAULT INTELLIGENCE + MASTER INTEL INDEX */}
      <section id="faults" className="relative overflow-hidden bg-gradient-hero text-white">
        <div className="pointer-events-none absolute inset-0 opacity-30">
          <div className="absolute -left-20 top-20 h-96 w-96 rounded-full bg-[var(--brand-green)]/30 blur-3xl" />
          <div className="absolute right-0 bottom-10 h-96 w-96 rounded-full bg-[var(--brand-green-bright)]/20 blur-3xl" />
        </div>

        <div id="index" className="relative mx-auto max-w-7xl px-6 py-20">
          <div className="mb-10 max-w-3xl">
            <div className="text-xs font-bold uppercase tracking-widest text-[var(--brand-green-bright)]">
              Fault Intelligence × Intel Index
            </div>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight md:text-5xl">
              Six silent killers feed one master meter.
            </h2>
            <p className="mt-3 text-base text-white/70">
              Drag each fault's manual detection rate to match what your team actually catches
              today. The needle on the right swings live to show your fleet's intelligence score.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            {/* LEFT — Tunable mini-meters */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Fault mini-meters</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                  Drag to set manual detection %
                </span>
              </div>

              <div className="divide-y divide-white/10">
                {results.faultMeters.map((m, i) => {
                  const Icon = [ShieldAlert, BatteryWarning, Flame, Battery, Cpu, Radio][i] ?? Eye;
                  return (
                    <motion.div
                      key={m.key}
                      initial={{ opacity: 0, x: -8 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-3 py-3"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-red)]/15 text-[var(--brand-red)] ring-1 ring-[var(--brand-red)]/30">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <div className="truncate text-sm font-semibold text-white">{m.label}</div>
                          <div className="font-mono text-[11px] font-bold text-white/60">
                            {Math.round(m.detected)} faults/mo
                          </div>
                        </div>
                        <div className="mt-1.5 flex items-center gap-3">
                          <Slider
                            value={[m.manualDetectionPct]}
                            min={0}
                            max={100}
                            step={1}
                            onValueChange={(v) => updateFaultDetection(m.key, v[0])}
                            className="flex-1 [&_[data-slot=slider-track]]:h-1.5 [&_[data-slot=slider-track]]:bg-white/15 [&_[data-slot=slider-range]]:bg-gradient-to-r [&_[data-slot=slider-range]]:from-[var(--brand-red)] [&_[data-slot=slider-range]]:via-[var(--brand-amber)] [&_[data-slot=slider-range]]:to-[var(--brand-green-bright)] [&_[data-slot=slider-thumb]]:h-3.5 [&_[data-slot=slider-thumb]]:w-3.5 [&_[data-slot=slider-thumb]]:border-white [&_[data-slot=slider-thumb]]:bg-white"
                          />
                          <span className="w-10 text-right font-mono text-[11px] font-bold text-white">
                            {Math.round(m.manualDetectionPct)}%
                          </span>
                          <AnimatedNumber
                            value={m.valueAtRisk}
                            className="w-20 text-right font-mono text-[11px] font-bold text-[var(--brand-red)]"
                          />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center justify-between rounded-lg border border-[var(--brand-red)]/30 bg-[var(--brand-red)]/15 px-3 py-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white">
                  Total value at risk this month
                </span>
                <AnimatedNumber
                  value={results.faultMeters.reduce((s, m) => s + m.valueAtRisk, 0)}
                  className="font-mono text-sm font-extrabold text-white"
                />
              </div>

              {/* Tier legend */}
              <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
                {[
                  { range: "70–100", label: "Fi-Ne-Tech Leader", color: "var(--brand-green)" },
                  { range: "40–69", label: "Fragmented Data", color: "var(--brand-amber)" },
                  { range: "0–39", label: "The Dark Zone", color: "var(--brand-red)" },
                ].map((t) => (
                  <div
                    key={t.label}
                    className="flex flex-col gap-1 rounded-lg border border-white/10 bg-white/5 p-2"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                      <span className="font-mono text-[10px] font-bold text-white">{t.range}</span>
                    </div>
                    <span className="text-[10px] text-white/70">{t.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT — Master Intel Meter (needle) */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-[var(--brand-green-bright)]">
                    Master Intel Meter
                  </div>
                  <div className="text-[11px] text-white/60">
                    Live • {results.faultMeters.length} fault classes tracked
                  </div>
                </div>
                <Activity className="h-4 w-4 text-[var(--brand-green-bright)]" />
              </div>

              <NeedleGauge score={results.intelIndex} />

              <div className="mt-2 text-center">
                <AnimatedNumber
                  value={results.intelIndex}
                  format={(v) => Math.round(v).toString()}
                  className="font-mono text-6xl font-extrabold text-white"
                />
                <div className="text-[10px] font-semibold uppercase tracking-widest text-white/60">
                  / 100 Intel Index
                </div>
                <div
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold"
                  style={{ backgroundColor: tierColor, color: "#0F2C44" }}
                >
                  {results.intelTierLabel}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4 text-center">
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-white/60">
                    Faults missed/mo
                  </div>
                  <div className="font-mono text-lg font-extrabold text-[var(--brand-red)]">
                    {Math.round(results.faultMeters.reduce((s, m) => s + m.missedByManual, 0))}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-white/60">
                    Prevented/mo
                  </div>
                  <div className="font-mono text-lg font-extrabold text-[var(--brand-green-bright)]">
                    {Math.round(results.preventedFaultsPerMonth)}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-white/60">
                    RoA gain/yr
                  </div>
                  <div className="font-mono text-sm font-extrabold text-white">
                    {formatINR(results.annualRoaGain, { compact: true })}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={resetFaultDetection}
                className="mt-4 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-[11px] font-semibold text-white/80 transition hover:bg-white/10"
              >
                Reset to industry baseline
              </button>
            </div>
          </div>

          {/* SoH Portfolio strip */}
          <div className="mt-10 overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
            <div className="flex flex-col items-start justify-between gap-4 border-b border-white/10 p-5 md:flex-row md:items-center">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-[var(--brand-green-bright)]">
                  Battery Performance — State of Health
                </div>
                <p className="text-sm text-white/70">
                  What a Chargeup Battery Passport reveals across your{" "}
                  {inputs.totalBatteries.toLocaleString("en-IN")}-unit fleet.
                </p>
              </div>
              <div className="text-xs text-white/60">
                Without IoT, you don't know which bucket each battery is in.
              </div>
            </div>
            <div className="grid divide-y divide-white/10 md:grid-cols-3 md:divide-x md:divide-y-0">
              {[
                {
                  label: "Healthy SoH",
                  range: ">95%",
                  count: results.sohSplit.healthy,
                  pct: 56,
                  color: "var(--brand-green-bright)",
                },
                {
                  label: "Moderate SoH",
                  range: "85–95%",
                  count: results.sohSplit.moderate,
                  pct: 27,
                  color: "var(--brand-amber)",
                },
                {
                  label: "At Risk",
                  range: "<85%",
                  count: results.sohSplit.atRisk,
                  pct: 17,
                  color: "var(--brand-red)",
                },
              ].map((s) => (
                <div key={s.label} className="p-5">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="text-sm font-bold text-white">{s.label}</span>
                    <span className="text-xs text-white/60">({s.range})</span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="font-mono text-3xl font-extrabold text-white">
                      {s.count.toLocaleString("en-IN")}
                    </span>
                    <span className="text-sm text-white/60">{s.pct}%</span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${s.pct}%`, backgroundColor: s.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="relative overflow-hidden bg-card py-24">
        <div className="absolute inset-0 -z-10 opacity-50">
          <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--brand-green)]/10 blur-3xl" />
        </div>
        <div className="mx-auto max-w-3xl px-6 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-[var(--brand-green)]" />
          <h2 className="mt-6 text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
            Stop a{" "}
            <span className="bg-gradient-to-r from-[var(--brand-green)] to-[var(--brand-navy)] bg-clip-text text-transparent">
              {formatINR(results.monthlyLeak, { compact: true })}
            </span>{" "}
            monthly leak.
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            Move from Manual to Intelligent. Turn every battery into a self-reporting,
            self-validating, self-financeable digital asset — backed by Chargeup's ₹50 Cr in
            disbursed financing with &lt;2% defaults.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              className="rounded-full bg-[var(--brand-green)] px-8 text-base font-bold text-white shadow-green hover:bg-[var(--brand-green-bright)]"
            >
              Book an Intel Audit <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full border-2 border-[var(--brand-navy)] px-8 text-base font-bold text-[var(--brand-navy)] hover:bg-[var(--brand-navy)] hover:text-white"
            >
              Download Report
            </Button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border bg-background py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-sm text-muted-foreground md:flex-row">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Chargeup" className="h-6 w-auto opacity-80" />
            <span>From Electric Vehicles to Intelligent Vehicles.</span>
          </div>
          <div>© {new Date().getFullYear()} Chargeup • Battery OEM Intel Meter</div>
        </div>
      </footer>
    </div>
  );
}
