import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact | TIA" },
      { name: "description", content: "Contact TIA — request a demo of touchless payroll-to-invoice automation." },
    ],
  }),
  component: ContactPage,
});

const fieldClass =
  "neu-inset bg-white/50 font-['Inter'] rounded-[9px] border border-[#E2E8F0] px-3.5 py-3 text-sm outline-none transition-colors focus:border-[#00020A]";

function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="w-full overflow-x-clip bg-white text-[#00020A]">
      <MarketingHeader />

      <section className="mx-auto grid max-w-[1180px] grid-cols-1 gap-16 px-6 py-20 sm:px-10 sm:py-28 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div>
          <p className="mb-5 text-[11.5px] font-bold uppercase tracking-[0.16em] text-[#64748B]">Get in touch</p>
          <h1 className="mb-5 text-[36px] font-bold leading-[1.05] tracking-[-0.03em] text-[#00020A] sm:text-[48px]">
            Let's look at your billing cycle together.
          </h1>
          <p className="mb-11 text-[15.5px] leading-relaxed text-[#64748B]">
            Tell us a bit about your team and we'll set up a 15-minute walkthrough — with your own timesheet data,
            if you'd like.
          </p>

          <div className="flex flex-col gap-6">
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.08em] text-[#64748B]">What happens next</p>
              <p className="text-sm leading-relaxed text-[#00020A]">
                We reply within one business day to schedule a walkthrough of the pipeline — ingestion through
                invoice.
              </p>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.08em] text-[#64748B]">Email</p>
              <p className="text-sm leading-relaxed text-[#00020A]">
                <a href="mailto:hello@tia.app" className="text-[#00020A] no-underline hover:underline">
                  hello@tia.app
                </a>
              </p>
            </div>
          </div>
        </div>

        <div>
          {submitted ? (
            <div className="glass neu-raised rounded-2xl border border-[#E2E8F0] px-10 py-14 text-center">
              <div
                className="mx-auto mb-5 h-11 w-11 rounded-full shadow-[0_0_15px_rgba(45,198,83,0.5)]"
                style={{ background: "linear-gradient(135deg, #3B82F6, #2DC653)" }}
              />
              <p className="mb-2.5 text-xl font-bold text-[#00020A]">Request received</p>
              <p className="text-sm leading-relaxed text-[#64748B]">
                Thanks — someone from our team will reach out within one business day.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="glass neu-raised flex flex-col gap-5 rounded-2xl border border-[#E2E8F0] p-10">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-[12.5px] font-semibold text-[#00020A]">Full name</label>
                  <input type="text" required placeholder="Jordan Lee" className={fieldClass} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[12.5px] font-semibold text-[#00020A]">Work email</label>
                  <input type="email" required placeholder="jordan@company.com" className={fieldClass} />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[12.5px] font-semibold text-[#00020A]">Company</label>
                <input type="text" required placeholder="Your company" className={fieldClass} />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[12.5px] font-semibold text-[#00020A]">Monthly timesheet volume</label>
                <select className={`${fieldClass}`} defaultValue="Under 100">
                  <option>Under 100</option>
                  <option>100 – 500</option>
                  <option>500 – 2,000</option>
                  <option>2,000+</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[12.5px] font-semibold text-[#00020A]">What would you like to see?</label>
                <textarea
                  rows={4}
                  placeholder="e.g. Gmail ingestion, validation rules, the voice agent…"
                  className={`${fieldClass} resize-none`}
                />
              </div>
              <button
                type="submit"
                className="neu-btn mt-2 rounded-full px-[15px] py-[15px] text-[15px] font-semibold text-white shadow-[0_0_15px_rgba(30,58,138,0.5)] transition-all hover:scale-105"
                style={{ background: "linear-gradient(135deg, #00020A, #00020A)" }}
              >
                Request a demo
              </button>
            </form>
          )}
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
