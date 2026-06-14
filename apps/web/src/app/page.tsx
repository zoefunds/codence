import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import {
  Shield,
  GitBranch,
  Lock,
  BarChart3,
  Zap,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Multi-Validator Consensus",
    description:
      "5 independent AI validators analyze your code. Findings are only confirmed when validators agree — drastically reducing false positives.",
  },
  {
    icon: Lock,
    title: "On-Chain Audit Trail",
    description:
      "Every review, finding, and consensus result is anchored to Genlayer. Immutable, verifiable, tamper-proof.",
  },
  {
    icon: GitBranch,
    title: "GitHub Integration",
    description:
      "Connect your repos via GitHub App. Auto-review PRs on open, push, or manual trigger. Paste code for ad-hoc reviews.",
  },
  {
    icon: BarChart3,
    title: "Security Analytics",
    description:
      "Track vulnerability trends, consensus confidence, and risk metrics across your organization over time.",
  },
  {
    icon: Zap,
    title: "Genlayer-Native",
    description:
      "Built on Genlayer Intelligent Contracts. Validator consensus happens on-chain using Genlayer LLMs — no external AI providers.",
  },
  {
    icon: CheckCircle2,
    title: "Per-Finding Consensus",
    description:
      "Each vulnerability, code smell, and performance issue is independently voted on. Granular, high-fidelity results.",
  },
];

const steps = [
  {
    step: "01",
    title: "Submit Code",
    description: "Push via GitHub, paste a snippet, or upload a zip file.",
  },
  {
    step: "02",
    title: "AI Validators Analyze",
    description:
      "5 validators independently review for vulnerabilities, code quality, and architecture.",
  },
  {
    step: "03",
    title: "On-Chain Consensus",
    description:
      "Genlayer Intelligent Contract aggregates votes and establishes consensus on each finding.",
  },
  {
    step: "04",
    title: "Actionable Report",
    description:
      "Receive a consensus-backed report with severity, confidence scores, and remediation guidance.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/8 via-background to-background" />
        <div className="relative mx-auto max-w-7xl px-6 py-28 text-center lg:py-40">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm text-primary">
            <Shield className="h-4 w-4" />
            Powered by Genlayer Intelligent Contracts
          </div>
          <h1 className="mx-auto max-w-4xl text-5xl font-bold tracking-tight lg:text-7xl">
            Consensus-Driven{" "}
            <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
              AI Code Reviews
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Stop trusting a single AI opinion. Codence uses multiple validators
            to independently review your code and establish on-chain consensus
            on every finding.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/signup">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8"
              >
                Start for Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="#how-it-works">
              <Button variant="outline" size="lg">
                See How It Works
              </Button>
            </Link>
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
            AI reviews are non-deterministic. Codence turns disagreement into
            signal.
          </p>
          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-xl border border-border/40 bg-card p-6 transition-colors hover:border-primary/25"
              >
                <f.icon className="h-8 w-8 text-primary" />
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
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
              <div key={s.step} className="relative">
                <div className="text-5xl font-bold text-primary/20">
                  {s.step}
                </div>
                <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
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
              className="mt-8 bg-primary hover:bg-primary/90 text-primary-foreground px-8"
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
