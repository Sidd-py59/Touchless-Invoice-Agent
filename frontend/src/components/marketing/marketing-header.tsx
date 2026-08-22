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
    <header className="sticky top-0 z-50 border-b border-white/30 bg-white/40 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[1180px] items-center justify-between px-6 sm:px-10">
        <Link to="/" className="flex items-baseline gap-[3px] no-underline">
          <TiaLogo size="md" withDot />
        </Link>

        <nav className="hidden items-center gap-10 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm text-[#64748B] no-underline transition-colors hover:text-[#00020A] [&.active]:font-semibold [&.active]:text-[#00020A]"
              activeOptions={{ exact: link.to === "/" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-5">
          <Link
            to="/app"
            className="hidden text-sm font-medium text-[#64748B] no-underline transition-colors hover:text-[#00020A] sm:inline"
          >
            Login
          </Link>
          <Link
            to="/contact"
            className="neu-btn whitespace-nowrap rounded-full bg-[#00020A] px-[22px] py-[11px] text-[13.5px] font-semibold text-white no-underline transition-colors hover:bg-[#00020A] hover:shadow-[0_0_15px_rgba(30,58,138,0.5)]"
          >
            Request a demo
          </Link>
        </div>
      </div>
    </header>
  );
}
