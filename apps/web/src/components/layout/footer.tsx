import { Terminal } from "lucide-react";
import Link from "next/link";

const footerLinks = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "Docs", href: "#" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Status", href: "#" },
    { label: "Security", href: "#" },
  ],
  Legal: [
    { label: "Privacy", href: "#" },
    { label: "Terms", href: "#" },
    { label: "GitHub Repo", href: "#" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Terminal className="h-3.5 w-3.5" />
              </div>
              <span className="font-mono text-base font-bold">Codence</span>
            </div>
            <p className="mt-3 max-w-xs font-mono text-xs leading-relaxed text-muted-foreground">
              Consensus-driven AI code reviews,
              <br />
              powered by Genlayer.
            </p>
            <p className="mt-4 font-mono text-[10px] text-muted-foreground/60">
              &copy; {new Date().getFullYear()} Codence. Terminal Verified.
            </p>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {category}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="font-mono text-sm text-foreground/70 transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
