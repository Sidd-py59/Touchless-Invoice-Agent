import { Link } from "@tanstack/react-router";
import { TiaLogo } from "@/components/TiaLogo";

export function MarketingFooter() {
  return (
    <footer className="glass-dark border-t border-white/10 px-6 pb-8 pt-16 text-[#94A3B8] sm:px-10">
      <div className="mx-auto max-w-[1180px]">
        <div className="grid grid-cols-2 gap-10 pb-12 sm:grid-cols-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="col-span-2 sm:col-span-4 lg:col-span-1">
            <Link to="/" className="mb-3.5 flex items-baseline gap-[3px] no-underline">
              <TiaLogo size="lg" variant="light" withDot />
            </Link>
            <p className="max-w-[240px] text-[13px] leading-relaxed text-[#64748B]">
              Touchless payroll-to-invoice automation for finance operations teams.
            </p>
          </div>
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.1em] text-white">Product</p>
            <div className="flex flex-col gap-2.5">
              <Link to="/features" className="text-[13.5px] text-[#94A3B8] no-underline hover:text-white">
                Features
              </Link>
              <Link to="/pricing" className="text-[13.5px] text-[#94A3B8] no-underline hover:text-white">
                Pricing
              </Link>
            </div>
          </div>
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.1em] text-white">Company</p>
            <div className="flex flex-col gap-2.5">
              <Link to="/about" className="text-[13.5px] text-[#94A3B8] no-underline hover:text-white">
                About
              </Link>
              <Link to="/contact" className="text-[13.5px] text-[#94A3B8] no-underline hover:text-white">
                Contact
              </Link>
            </div>
          </div>
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.1em] text-white">Integrations</p>
            <div className="flex flex-col gap-2.5">
              <span className="text-[13.5px] text-[#94A3B8]">Groq</span>
              <span className="text-[13.5px] text-[#94A3B8]">Smallest.ai</span>
              <span className="text-[13.5px] text-[#94A3B8]">Gmail</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-[#1E293B] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12.5px] text-[#64748B]">© 2026 TIA. All rights reserved.</p>
          <p className="text-[12.5px] text-[#64748B]">Finance Operations Automation Platform</p>
        </div>
      </div>
    </footer>
  );
}
