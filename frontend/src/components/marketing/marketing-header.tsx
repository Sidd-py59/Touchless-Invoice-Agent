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
    <header className="sticky top-0 z-50 border-b border-[#D4E8EF] bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-[1180px] items-center justify-between px-6 sm:px-10">
        <Link to="/" className="flex items-baseline gap-[3px] no-underline">
          <TiaLogo size="md" withDot />
        </Link>

        <nav className="hidden items-center gap-10 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm text-[#5A8A99] no-underline transition-colors hover:text-[#0D6E8A] [&.active]:font-semibold [&.active]:text-[#0D6E8A]"
              activeOptions={{ exact: link.to === "/" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-5">
          <Link
            to="/app"
            className="hidden text-sm font-medium text-[#5A8A99] no-underline transition-colors hover:text-[#0D6E8A] sm:inline"
          >
            Login
          </Link>
          <Link
            to="/contact"
            className="whitespace-nowrap rounded-full bg-[#0D6E8A] px-[22px] py-[11px] text-[13.5px] font-semibold text-white no-underline transition-colors hover:bg-[#0A5A72]"
          >
            Request a demo
          </Link>
        </div>
      </div>
    </header>
  );
}
