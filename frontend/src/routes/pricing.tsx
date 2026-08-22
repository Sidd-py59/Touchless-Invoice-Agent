import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing | TIA" },
      { name: "description", content: "TIA pricing — plans for finance operations teams of every size." },
    ],
  }),
  component: PricingPage,
});

const plans = [
  {
    name: "Starter",
    blurb: "For a single client relationship getting off email-based timesheets.",
    highlighted: false,
    features: [
      { label: "Universal document parser", included: true },
      { label: "5-rule validation engine", included: true },
      { label: "Invoice generation & lifecycle", included: true },
      { label: "1 client portal", included: true },
      { label: "AI OCR correction", included: false },
      { label: "Finance voice agent", included: false },
    ],
  },
  {
    name: "Growth",
    blurb: "For finance ops teams running the full multi-client pipeline.",
    highlighted: true,
    features: [
      { label: "Everything in Starter", included: true },
      { label: "Touchless Gmail ingestion", included: true },
      { label: "AI OCR correction (Groq)", included: true },
      { label: "Payroll calculation engine", included: true },
      { label: "Unlimited client portals", included: true },
      { label: "Finance voice agent", included: false },
    ],
  },
  {
    name: "Enterprise",
    blurb: "For payroll-outsourcing operations at scale, with compliance needs.",
    highlighted: false,
    features: [
      { label: "Everything in Growth", included: true },
      { label: "Finance voice agent (Smallest.ai)", included: true },
      { label: "Immutable audit trail & exports", included: true },
      { label: "Dedicated onboarding", included: true },
      { label: "Custom SLAs & support", included: true },
      { label: "Single sign-on", included: true },
    ],
  },
];

const faqs = [
  {
    q: "Does pricing depend on document volume?",
    a: "Yes — plans scale by monthly timesheets processed and number of active clients. We size a plan to your pipeline during onboarding.",
  },
  {
    q: "Can I start with Growth and add the voice agent later?",
    a: "Yes. The Finance Agent and voice synthesis can be added to any plan at any time with no migration required.",
  },
  {
    q: "Is there a setup or implementation fee?",
    a: "Starter and Growth are self-serve. Enterprise includes dedicated onboarding for Gmail integration, payroll contract migration, and client portal branding.",
  },
];

function PricingPage() {
  return (
    <div className="w-full overflow-x-clip bg-white text-[#00020A]">
      <MarketingHeader />

      {/* HERO */}
      <section className="mx-auto max-w-[800px] px-6 pb-14 pt-24 text-center sm:px-10 sm:pt-28">
        <p className="mb-5 text-[11.5px] font-bold uppercase tracking-[0.16em] text-[#64748B]">Pricing</p>
        <h1 className="text-4xl font-bold leading-[1.08] tracking-[-0.03em] text-[#00020A] sm:text-5xl lg:text-[56px] lg:tracking-[-0.035em]">
          Priced to the size of your pipeline.
        </h1>
        <p className="mx-auto mt-6 max-w-[520px] text-base leading-relaxed text-[#64748B] sm:text-[17px]">
          Every plan includes the full automation pipeline. Tiers scale with document volume and number of clients.
        </p>
      </section>

      {/* PLANS */}
      <section className="mx-auto max-w-[1180px] px-6 pb-24 sm:px-10">
        <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`card-3d glass neu-raised relative flex flex-col rounded-2xl p-9 bg-white/70 ${
                plan.highlighted ? "border-2 border-[#00020A] shadow-[0_0_25px_rgba(59,130,246,0.3)]" : "border border-[#E2E8F0]"
              }`}
            >
              {plan.highlighted && (
                <span
                  className="absolute -top-[13px] left-9 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.05em] text-white"
                  style={{ background: "linear-gradient(135deg, #3B82F6, #2DC653)" }}
                >
                  Most popular
                </span>
              )}
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-[#64748B]">{plan.name}</p>
              <p className="mb-7 text-[15px] leading-relaxed text-[#64748B]">{plan.blurb}</p>
              <Link
                to="/contact"
                className={`neu-btn mb-7 rounded-full py-3 text-center text-sm font-semibold no-underline transition-all hover:scale-105 ${
                  plan.highlighted
                    ? "text-white shadow-[0_0_15px_rgba(30,58,138,0.5)]"
                    : "border-[1.5px] border-[#E2E8F0] text-[#00020A] hover:border-[#00020A]"
                }`}
                style={plan.highlighted ? { background: "linear-gradient(135deg, #00020A, #00020A)" } : {}}
              >
                Talk to sales
              </Link>
              <div className="flex flex-col gap-3.5 border-t border-[#E2E8F0] pt-6">
                {plan.features.map((f) => (
                  <p
                    key={f.label}
                    className={`flex items-center gap-2 text-[13.5px] ${
                      f.included ? "text-[#00020A]" : "text-[#B8D4DE]"
                    }`}
                  >
                    <span>✓</span>
                    {f.label}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-[13px] text-[#64748B]">
          All plans billed annually. Contact sales for a volume quote tailored to your document flow.
        </p>
      </section>

      {/* FAQ */}
      <section className="border-y border-[#E2E8F0] bg-[#F8FAFC] px-6 py-20 sm:px-10 sm:py-24">
        <div className="mx-auto max-w-[900px]">
          <p className="mb-10 text-center text-[11.5px] font-bold uppercase tracking-[0.16em] text-[#64748B]">
            Frequently asked
          </p>
          <div className="flex flex-col gap-4">
            {faqs.map((f) => (
              <div key={f.q} className="neu-raised rounded-xl bg-white px-7 py-6 transition-transform hover:-translate-y-1">
                <p className="mb-2 text-[15.5px] font-bold text-[#00020A]">{f.q}</p>
                <p className="text-sm leading-relaxed text-[#64748B]">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 text-center sm:px-10 sm:py-28">
        <h2 className="mb-5 text-[32px] font-bold tracking-[-0.03em] text-[#00020A] sm:text-[42px]">Not sure which plan fits?</h2>
        <p className="mb-9 text-base text-[#64748B]">
          Tell us your document volume and client count — we'll recommend a tier.
        </p>
        <Link
          to="/contact"
          className="neu-btn inline-block rounded-full px-[34px] py-4 text-[15px] font-semibold text-white no-underline shadow-[0_0_15px_rgba(30,58,138,0.5)] transition-all hover:scale-105"
          style={{ background: "linear-gradient(135deg, #00020A, #00020A)" }}
        >
          Talk to sales
        </Link>
      </section>

      <MarketingFooter />
    </div>
  );
}
