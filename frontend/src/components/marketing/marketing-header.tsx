import { Link } from "@tanstack/react-router";
import { TiaLogo } from "@/components/TiaLogo";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/features", label: "Features" },
  { to: "/pricing", label: "Pricing" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 bg-white/95 border-b-2 border-primary/10 tech-panel">
      <div className="mx-auto flex h-[72px] max-w-[1180px] items-center justify-between px-6 sm:px-10">
        <Link to="/" className="flex items-center gap-[15px] no-underline">
          <div className="hidden sm:block tech-bracket">
            <TiaLogo size="md" withDot className="px-2" />
          </div>
          <div className="sm:hidden">
            <TiaLogo size="md" withDot />
          </div>
          <div className="hidden lg:flex flex-col gap-0.5">
            <span className="tech-text text-primary">SYS.ID: TIA-2025-001</span>
            <span className="tech-text text-accent">STATUS: ONLINE</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-10 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm font-mono font-semibold uppercase tracking-wider text-slate-500 no-underline transition-colors hover:text-primary [&.active]:text-primary"
              activeOptions={{ exact: link.to === "/" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-5">
          <Link
            to="/app"
            className="hidden text-sm font-mono font-semibold uppercase tracking-wider text-slate-500 no-underline transition-colors hover:text-primary sm:inline"
          >
            Login
          </Link>
          <Link
            to="/contact"
            className="tech-btn no-underline"
          >
            Request Demo
          </Link>
        </div>
      </div>
    </header>
  );
}
