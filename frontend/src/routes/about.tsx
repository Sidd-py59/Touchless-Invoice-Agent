import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About | TIA" },
      {
        name: "description",
        content: "About TIA — why we built a touchless invoice agent for finance operations teams.",
      },
    ],
  }),
  component: AboutPage,
});

const principles = [
  {
    shape: "rounded",
    title: "Zero manual entry",
    body: "If a human is retyping a number, the system has already failed.",
  },
  {
    shape: "circle",
    title: "Audit-first",
    body: "Every override and status change is logged. Automation without a trail isn't trustworthy.",
  },
  {
    shape: "diamond",
    title: "Built for finance, not IT",
    body: "No integrations team required. Connect Gmail, configure contracts, go.",
  },
  {
    shape: "rounded",
    title: "AI where it counts",
    body: "Used to read messy documents and answer questions — never to make silent billing decisions.",
  },
];

const stats = [
  { value: "10", label: "Automated capabilities, ingestion to audit trail" },
  { value: "6", label: "Voice options for the Finance Agent" },
  { value: "5", label: "Lifecycle states tracked per invoice" },
];

function shapeClass(shape: string) {
  if (shape === "circle") return "rounded-full";
  if (shape === "diamond") return "rotate-45 rounded-[4px]";
  return "rounded-[9px]";
}

function AboutPage() {
  return (
    <div className="w-full overflow-x-clip bg-white text-[#0D3B4C]">
      <MarketingHeader />

      {/* HERO */}
      <section className="mx-auto max-w-[800px] px-6 pb-8 pt-24 text-center sm:px-10 sm:pt-28">
        <p className="mb-5 text-[11.5px] font-bold uppercase tracking-[0.16em] text-[#5A8A99]">About</p>
        <h1 className="text-[32px] font-bold leading-[1.1] tracking-[-0.03em] text-[#0D3B4C] sm:text-[44px] lg:text-[60px] lg:leading-[1.04] lg:tracking-[-0.035em]">
          Finance teams shouldn't retype what's already been typed.
        </h1>
      </section>

      {/* MISSION */}
      <section className="mx-auto max-w-[720px] px-6 py-16 sm:px-10 sm:py-[70px]">
        <p className="mb-6 text-lg leading-relaxed text-[#5A8A99]">
          TIA started as an answer to a specific, unglamorous problem inside a staffing and payroll-outsourcing
          operation: timesheets arrive in every format imaginable — PDFs, spreadsheets, phone photos of handwritten
          sheets, tables pasted straight into email bodies — and someone still has to key every row into a
          spreadsheet before an invoice can go out.
        </p>
        <p className="mb-6 text-lg leading-relaxed text-[#5A8A99]">
          That someone loses days every billing cycle to work that isn't judgment — it's transcription. And
          transcription is where billing errors, missed overtime, and duplicate entries quietly creep in.
        </p>
        <p className="text-lg leading-relaxed text-[#5A8A99]">
          We built TIA to remove that step entirely: parse whatever arrives, validate it against real business
          rules, calculate against the actual contract, and generate the invoice — so the finance team's time goes
          to the exceptions that actually need a human, not the rows that don't.
        </p>
      </section>

      {/* PRINCIPLES */}
      <section className="border-y border-[#D4E8EF] bg-[#F5F9FB] px-6 py-20 sm:px-10 sm:py-24">
        <div className="mx-auto max-w-[1180px]">
          <p className="mb-12 text-center text-[11.5px] font-bold uppercase tracking-[0.16em] text-[#5A8A99]">
            What we believe
          </p>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {principles.map((p) => (
              <div key={p.title}>
                <div
                  className={`mb-5 h-8 w-8 ${shapeClass(p.shape)}`}
                  style={{ background: "linear-gradient(135deg, #00B4D8, #2DC653)" }}
                />
                <p className="mb-2 text-[15px] font-bold text-[#0D3B4C]">{p.title}</p>
                <p className="text-[13px] leading-relaxed text-[#5A8A99]">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="mx-auto max-w-[1180px] px-6 py-20 text-center sm:px-10 sm:py-24">
        <h2 className="mx-auto mb-14 max-w-[600px] text-[28px] font-bold tracking-[-0.03em] text-[#0D3B4C] sm:text-4xl">
          One pipeline, built to replace an entire manual cycle
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-[#D4E8EF] p-8">
              <p className="font-mono text-4xl font-bold text-[#0D6E8A]">{s.value}</p>
              <p className="mt-2 text-[13px] text-[#5A8A99]">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0D3B4C] px-6 py-24 text-center text-white sm:px-10 sm:py-28">
        <h2 className="mb-5 text-[32px] font-bold tracking-[-0.03em] sm:text-[42px]">Let's talk about your billing cycle.</h2>
        <Link
          to="/contact"
          className="inline-block rounded-full px-[34px] py-4 text-[15px] font-semibold text-white no-underline"
          style={{ background: "linear-gradient(135deg, #00B4D8, #2DC653)" }}
        >
          Get in touch
        </Link>
      </section>

      <MarketingFooter />
    </div>
  );
}
