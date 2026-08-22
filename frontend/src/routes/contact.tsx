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
  "font-['Inter'] rounded-[9px] border border-[#D4E8EF] px-3.5 py-3 text-sm outline-none transition-colors focus:border-[#0D6E8A]";

function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="w-full overflow-x-clip bg-white text-[#0D3B4C]">
      <MarketingHeader />

      <section className="mx-auto grid max-w-[1180px] grid-cols-1 gap-16 px-6 py-20 sm:px-10 sm:py-28 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div>
          <p className="mb-5 text-[11.5px] font-bold uppercase tracking-[0.16em] text-[#5A8A99]">Get in touch</p>
          <h1 className="mb-5 text-[36px] font-bold leading-[1.05] tracking-[-0.03em] text-[#0D3B4C] sm:text-[48px]">
            Let's look at your billing cycle together.
          </h1>
          <p className="mb-11 text-[15.5px] leading-relaxed text-[#5A8A99]">
            Tell us a bit about your team and we'll set up a 15-minute walkthrough — with your own timesheet data,
            if you'd like.
          </p>

          <div className="flex flex-col gap-6">
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.08em] text-[#5A8A99]">What happens next</p>
              <p className="text-sm leading-relaxed text-[#0D3B4C]">
                We reply within one business day to schedule a walkthrough of the pipeline — ingestion through
                invoice.
              </p>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.08em] text-[#5A8A99]">Email</p>
              <p className="text-sm leading-relaxed text-[#0D3B4C]">
                <a href="mailto:hello@tia.app" className="text-[#0D6E8A] no-underline hover:underline">
                  hello@tia.app
                </a>
              </p>
            </div>
          </div>
        </div>

        <div>
          {submitted ? (
            <div className="rounded-2xl border border-[#D4E8EF] bg-[#F5F9FB] px-10 py-14 text-center">
              <div
                className="mx-auto mb-5 h-11 w-11 rounded-full"
                style={{ background: "linear-gradient(135deg, #00B4D8, #2DC653)" }}
              />
              <p className="mb-2.5 text-xl font-bold text-[#0D3B4C]">Request received</p>
              <p className="text-sm leading-relaxed text-[#5A8A99]">
                Thanks — someone from our team will reach out within one business day.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5 rounded-2xl border border-[#D4E8EF] p-10">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-[12.5px] font-semibold text-[#0D3B4C]">Full name</label>
                  <input type="text" required placeholder="Jordan Lee" className={fieldClass} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[12.5px] font-semibold text-[#0D3B4C]">Work email</label>
                  <input type="email" required placeholder="jordan@company.com" className={fieldClass} />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[12.5px] font-semibold text-[#0D3B4C]">Company</label>
                <input type="text" required placeholder="Your company" className={fieldClass} />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[12.5px] font-semibold text-[#0D3B4C]">Monthly timesheet volume</label>
                <select className={`${fieldClass} bg-white`} defaultValue="Under 100">
                  <option>Under 100</option>
                  <option>100 – 500</option>
                  <option>500 – 2,000</option>
                  <option>2,000+</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[12.5px] font-semibold text-[#0D3B4C]">What would you like to see?</label>
                <textarea
                  rows={4}
                  placeholder="e.g. Gmail ingestion, validation rules, the voice agent…"
                  className={`${fieldClass} resize-none`}
                />
              </div>
              <button
                type="submit"
                className="mt-2 rounded-full bg-[#0D6E8A] py-[15px] text-[15px] font-semibold text-white transition-colors hover:bg-[#0A5A72]"
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
