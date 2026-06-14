import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import {
  Terminal,
  GitBranch,
  Lock,
  BarChart3,
  Zap,
  CheckCircle2,
  ArrowRight,
  Braces,
  ShieldCheck,
  Cpu,
  FileCode2,
} from "lucide-react";

const features = [
  {
    icon: ShieldCheck,
    tag: "01",
    title: "Multi-Validator Consensus",
    description:
      "5 independent AI validators analyze your code. Findings are only confirmed when validators agree — drastically reducing false positives.",
  },
  {
    icon: Lock,
    tag: "02",
    title: "On-Chain Audit Trail",
    description:
      "Every review result is anchored to Genlayer. Immutable, verifiable, and tamper-proof records for compliance.",
  },
  {
    icon: GitBranch,
    tag: "03",
    title: "GitHub Integration",
    description:
      "Connect your repos via GitHub App. Auto-review PRs on open, push, or manual trigger.",
  },
  {
    icon: BarChart3,
    tag: "04",
    title: "Security Analytics",
    description:
      "Track vulnerability trends, consensus confidence, and risk metrics across your entire organization over time.",
  },
];

const steps = [
  {
    num: "01_SUBMIT",
    title: "Submit Code",
    description:
      "Push via GitHub, paste a snippet, or upload a zip file for instant analysis.",
  },
  {
    num: "02_ANALYZE",
    title: "Validators Analyze",
    description:
      "5 validators independently review for vulnerabilities, quality, and architecture.",
  },
  {
    num: "03_VOTE",
    title: "On-Chain Consensus",
    description:
      "Genlayer Intelligent Contracts aggregate votes and establish consensus on findings.",
  },
  {
    num: "04_REPORT",
    title: "Actionable Report",
    description:
      "Receive a consensus-backed report with severity, confidence, and remediation guidance.",
  },
];

const codeLines = [
  { num: "01", content: "async function processTransaction(tx) {", color: "text-blue-600" },
  { num: "02", content: '  const verified = await verifySignature(tx.sig);', color: "text-foreground/80" },
  { num: "03", content: '  if (!verified) return "Error"; // Potential logic leak', color: "text-red-500", highlight: true },
  { num: "04", content: "  return await execute(tx.payload);", color: "text-foreground/80" },
  { num: "05", content: "}", color: "text-blue-600" },
];

const validators = [
  { name: "AI_VALIDATOR_1", vote: "APPROVE", color: "text-green-600 bg-green-50 border-green-200" },
  { name: "AI_VALIDATOR_2", vote: "FLAG", color: "text-red-600 bg-red-50 border-red-200" },
  { name: "AI_VALIDATOR_3", vote: "FLAG", color: "text-red-600 bg-red-50 border-red-200" },
  { name: "AI_VALIDATOR_4", vote: "FLAG", color: "text-red-600 bg-red-50 border-red-200" },
  { name: "AI_VALIDATOR_5", vote: "FLAG", color: "text-red-600 bg-red-50 border-red-200" },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/8 via-background to-background" />
        <div className="relative mx-auto max-w-7xl px-6 py-24 text-center lg:py-32">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 font-mono text-xs text-primary">
            <Braces className="h-3.5 w-3.5" />
            POWERED BY GENLAYER INTELLIGENT CONTRACTS
          </div>
          <h1 className="mx-auto max-w-4xl text-5xl font-bold tracking-tight lg:text-7xl">
            Consensus-Driven{" "}
            <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
              AI Code Reviews
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Stop trusting a single AI opinion. Codence uses multiple independent validators to
            review your code and establish on-chain consensus on every finding.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/signup">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 font-mono"
              >
                Start for Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="#how-it-works">
              <Button variant="outline" size="lg" className="font-mono">
                See How It Works
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Code Preview + Validator Visualization */}
      <section className="border-t border-border/40 py-4">
        <div className="mx-auto max-w-4xl px-6">
          {/* Terminal Window */}
          <div className="overflow-hidden rounded-xl border border-border/60 bg-[#1e1e2e] shadow-2xl">
            {/* Title bar */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-yellow-400" />
                <div className="h-3 w-3 rounded-full bg-green-400" />
              </div>
              <span className="font-mono text-xs text-white/40">
                codence-cli — review-session: 0x4f...2a
              </span>
              <div />
            </div>

            {/* Code content */}
            <div className="p-5">
              <div className="space-y-0.5">
                {codeLines.map((line) => (
                  <div
                    key={line.num}
                    className={`flex gap-4 rounded px-2 py-0.5 font-mono text-sm ${
                      line.highlight ? "bg-red-500/10" : ""
                    }`}
                  >
                    <span className="w-6 select-none text-right text-white/25">
                      {line.num}
                    </span>
                    <span className={line.color === "text-foreground/80" ? "text-white/70" : line.color === "text-blue-600" ? "text-blue-400" : "text-red-400"}>
                      {line.content}
                    </span>
                  </div>
                ))}
              </div>

              {/* Consensus section */}
              <div className="mt-6 border-t border-white/10 pt-5">
                <div className="mb-3 font-mono text-xs uppercase tracking-widest text-white/40">
                  Consensus Verification
                </div>
                <div className="flex flex-wrap gap-2">
                  {validators.map((v) => (
                    <div
                      key={v.name}
                      className="flex flex-col items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                    >
                      <span className="font-mono text-[10px] text-white/50">
                        {v.name}
                      </span>
                      <span
                        className={`font-mono text-xs font-bold ${
                          v.vote === "APPROVE"
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {v.vote}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5">
                  <div className="h-2 w-2 rounded-full bg-red-400" />
                  <span className="font-mono text-xs text-red-300">
                    Consensus Reached: Security vulnerability identified in line 03.
                  </span>
                  <span className="ml-auto font-mono text-xs text-white/40">
                    CONFIDENCE: 80%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border/40 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-center text-3xl font-bold">
            Why teams trust Codence
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
            AI reviews are non-deterministic. Codence turns disagreement into signal.
          </p>
          <div className="mt-16 grid gap-6 md:grid-cols-2">
            {features.map((f) => (
              <div
                key={f.title}
                className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-8 transition-all hover:border-primary/25 hover:shadow-md"
              >
                <div className="absolute right-4 top-4 font-mono text-4xl font-bold text-primary/8">
                  {f.tag}
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section
        id="how-it-works"
        className="border-t border-border/40 bg-muted/30 py-24"
      >
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-center text-3xl font-bold">How It Works</h2>
          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <div key={s.num} className="relative">
                <div className="font-mono text-sm font-bold text-primary/60">
                  {s.num}
                </div>
                <h3 className="mt-3 text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/40 py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold">
            Ready to upgrade your code reviews?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Free tier available. No credit card required.
          </p>
          <Link href="/signup">
            <Button
              size="lg"
              className="mt-8 bg-primary hover:bg-primary/90 text-primary-foreground px-8 font-mono"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
