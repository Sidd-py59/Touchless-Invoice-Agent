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

const fieldClass = "tech-input w-full";

function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="w-full overflow-x-clip bg-transparent text-slate-900">
      <MarketingHeader />

      <section className="mx-auto grid max-w-[1180px] grid-cols-1 gap-16 px-6 py-20 sm:px-10 sm:py-28 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div>
          <p className="mb-5 tech-text">Get in touch</p>
          <h1 className="mb-5 text-[36px] font-extrabold uppercase leading-[1.05] tracking-[-0.03em] text-primary sm:text-[48px]">
            Let's look at your billing cycle together.
          </h1>
          <p className="mb-11 text-[15.5px] leading-relaxed text-slate-600">
            Tell us a bit about your team and we'll set up a 15-minute walkthrough — with your own timesheet data,
            if you'd like.
          </p>

          <div className="flex flex-col gap-6">
            <div>
              <p className="mb-1.5 tech-text">What happens next</p>
              <p className="text-sm leading-relaxed text-slate-900">
                We reply within one business day to schedule a walkthrough of the pipeline — ingestion through
                invoice.
              </p>
            </div>
            <div>
              <p className="mb-1.5 tech-text">Email</p>
              <p className="text-sm leading-relaxed font-mono">
                <a href="mailto:hello@tia.app" className="text-accent no-underline hover:underline">
                  hello@tia.app
                </a>
              </p>
            </div>
          </div>
        </div>

        <div className="tech-bracket">
          {submitted ? (
            <div className="tech-panel px-10 py-14 text-center">
              <div
                className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-accent text-white"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="mb-2.5 text-xl font-bold uppercase tracking-wider text-primary">Request received</p>
              <p className="text-sm leading-relaxed text-slate-600">
                Thanks — someone from our team will reach out within one business day.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="tech-panel flex flex-col gap-5 p-10">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-[12px] font-mono font-bold uppercase tracking-wider text-slate-500">Full name</label>
                  <input type="text" required placeholder="Jordan Lee" className={fieldClass} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[12px] font-mono font-bold uppercase tracking-wider text-slate-500">Work email</label>
                  <input type="email" required placeholder="jordan@company.com" className={fieldClass} />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-mono font-bold uppercase tracking-wider text-slate-500">Company</label>
                <input type="text" required placeholder="Your company" className={fieldClass} />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-mono font-bold uppercase tracking-wider text-slate-500">Monthly timesheet volume</label>
                <select className={`${fieldClass}`} defaultValue="Under 100">
                  <option>Under 100</option>
                  <option>100 – 500</option>
                  <option>500 – 2,000</option>
                  <option>2,000+</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-mono font-bold uppercase tracking-wider text-slate-500">What would you like to see?</label>
                <textarea
                  rows={4}
                  placeholder="e.g. Gmail ingestion, validation rules, the voice agent…"
                  className={`${fieldClass} resize-none`}
                />
              </div>
              <button
                type="submit"
                className="tech-btn mt-4 w-full"
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
