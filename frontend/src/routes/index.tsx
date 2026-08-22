import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TIA — Touchless Invoice Agent" },
      {
        name: "description",
        content: "AI-powered payroll-to-invoice automation for finance operations teams. Zero manual data entry.",
      },
    ],
  }),
  component: HomePage,
});

const steps = [
  { n: "01", title: "Ingest", body: "Gmail OAuth2 poller picks up timesheets every 30 seconds, dedup'd automatically." },
  { n: "02", title: "Parse", body: "PDF, Excel, image, or inline email body — every format is read and normalised." },
  { n: "03", title: "Correct", body: "Groq's Llama 4 Scout cleans up scanned and handwritten OCR noise." },
  { n: "04", title: "Validate", body: "Five business rules catch duplicates, mismatches, and threshold breaches." },
  { n: "05", title: "Calculate", body: "Pro-rated salary, overtime, allowances, fees and tax — resolved per contract." },
  { n: "06", title: "Invoice", body: "A client-ready PDF is generated, tracked, and dispatched — lifecycle managed end to end." },
];

const capabilities = [
  { title: "Universal document parser", body: "PDF, Excel, CSV, images, and email body — every timesheet format, handled." },
  { title: "AI OCR correction", body: "Groq Llama 4 Scout reconstructs misread scans and handwritten sheets." },
  { title: "5-rule validation engine", body: "Duplicates, mismatches, and threshold breaches flagged before they cost you." },
  { title: "Payroll calculation engine", body: "Pro-rated salary, overtime, allowances, fees, and tax against contract terms." },
  { title: "Invoice lifecycle", body: "Draft, sent, paid, overdue, void — tracked automatically end to end." },
  { title: "Immutable audit trail", body: "Every upload, override, and status change logged for compliance." },
];

const testimonials = [
  {
    quote:
      "Invoice turnaround went from days to minutes. The validation queue alone caught errors we used to find after the client did.",
    author: "Finance Director — Payroll Outsourcing Group",
  },
  {
    quote:
      "We stopped asking clients to resend timesheets in 'the right format.' TIA just reads whatever lands in the inbox.",
    author: "Operations Manager — Workforce Staffing Firm",
  },
];

function HomePage() {
  return (
    <div className="w-full overflow-x-clip bg-white text-[#00020A]">
      <MarketingHeader />

      {/* HERO */}
      <section 
        className="relative mx-auto flex max-w-[1180px] flex-col items-center px-6 pb-20 pt-24 text-center sm:px-10 sm:pt-28"
        style={{ backgroundImage: 'radial-gradient(circle at 15% 50%, rgba(30,58,138,0.06), transparent 25%), radial-gradient(circle at 85% 30%, rgba(30,58,138,0.06), transparent 25%)' }}
      >
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-100/40 via-white to-white"></div>
        <p className="mb-5 text-[11.5px] font-bold uppercase tracking-[0.16em] text-[#64748B]">
          Finance Operations Automation Platform
        </p>
        <h1 className="max-w-[920px] text-[44px] font-bold leading-[1.02] tracking-[-0.03em] text-[#00020A] sm:text-[64px] sm:leading-[0.98] lg:text-[88px] lg:tracking-[-0.045em]">
          Payroll to invoice.
          <br />
          Touchless.
        </h1>
        <p className="mt-7 max-w-[560px] text-base leading-relaxed text-[#64748B] sm:text-[19px] sm:leading-[1.55]">
          Upload payroll files in any format. AI extracts, validates, and calculates — then issues a client-ready
          invoice. Zero manual data entry.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3.5">
          <Link
            to="/contact"
            className="neu-btn rounded-full bg-[#00020A] px-[30px] py-[15px] text-[15px] font-semibold text-white no-underline transition-colors hover:bg-[#00020A]"
          >
            Request a demo
          </Link>
          <Link
            to="/features"
            className="neu-raised rounded-full border-[1.5px] border-[#E2E8F0] bg-white px-[30px] py-[15px] text-[15px] font-semibold text-[#00020A] no-underline transition-colors hover:border-[#00020A]"
          >
            Explore features
          </Link>
        </div>
      </section>

      {/* METRICS STRIP */}
      <section className="border-y border-[#E2E8F0] bg-[#F8FAFC]">
        <div className="mx-auto grid max-w-[1180px] grid-cols-2 gap-4 px-6 py-9 text-center sm:grid-cols-4 sm:px-10">
          {[
            { value: "30s", label: "Gmail sync interval" },
            { value: "5", label: "Automated validation rules" },
            { value: "4", label: "Timesheet formats supported" },
            { value: "0", label: "Manual entries required" },
          ].map((m, i) => (
            <div key={m.label} className="glass neu-raised flex flex-col items-center justify-center rounded-xl p-4">
              <p className="font-mono text-[26px] font-bold tracking-[-0.02em] text-[#00020A] sm:text-[30px]">{m.value}</p>
              <p className="mt-1.5 text-[12.5px] text-[#64748B]">{m.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-[#00020A] px-6 py-20 text-white sm:px-10 sm:py-24">
        <div className="mx-auto max-w-[1180px]">
          <div className="mb-14 text-center">
            <p className="mb-4 text-[11.5px] font-bold uppercase tracking-[0.16em] text-[#64748B]">How it works</p>
            <h2 className="text-3xl font-bold tracking-[-0.03em] sm:text-[42px]">From inbox to invoice, automatically</h2>
          </div>
          <div className="relative grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-6 lg:gap-y-0">
            <div className="absolute left-[8%] right-[8%] top-[19px] hidden h-px bg-[#1E293B] lg:block" />
            {steps.map((s) => (
              <div key={s.n} className="relative flex flex-col items-center gap-4 px-2 text-center">
                <div
                  className="neu-raised flex h-[38px] w-[38px] items-center justify-center rounded-full font-mono text-[13px] font-bold text-white shadow-[0_0_15px_rgba(59,130,246,0.6)]"
                  style={{ background: "linear-gradient(135deg, #3B82F6, #2DC653)" }}
                >
                  {s.n}
                </div>
                <p className="text-sm font-semibold">{s.title}</p>
                <p className="text-[12.5px] leading-relaxed text-[#94A3B8]">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRODUCT SCREENSHOT */}
      <section className="mx-auto max-w-[1180px] px-6 py-24 text-center sm:px-10 sm:py-28">
        <p className="mb-4 text-[11.5px] font-bold uppercase tracking-[0.16em] text-[#64748B]">The dashboard</p>
        <h2 className="text-3xl font-bold tracking-[-0.03em] text-[#00020A] sm:text-[42px]">One command center for the entire pipeline</h2>
        <p className="mx-auto mt-4 max-w-[560px] text-base leading-relaxed text-[#64748B]">
          Documents processed, invoices issued, validation queues, revenue — live, in one view.
        </p>
        <div className="mt-14 overflow-hidden rounded-2xl border border-[#E2E8F0] text-left shadow-[0_30px_70px_-30px_rgba(13,62,74,0.25)]">
          <div className="flex h-[38px] items-center gap-1.5 border-b border-[#E2E8F0] bg-[#F8FAFC] px-4">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#E2E8F0]" />
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#E2E8F0]" />
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#E2E8F0]" />
          </div>
          <img src="/marketing/dashboard-screenshot.png" alt="TIA finance dashboard" className="block w-full" />
        </div>
      </section>

      {/* CAPABILITIES */}
      <section className="border-y border-[#E2E8F0] bg-[#F8FAFC] px-6 py-24 sm:px-10 sm:py-28">
        <div className="mx-auto max-w-[1180px]">
          <div className="mb-14 text-center">
            <p className="mb-4 text-[11.5px] font-bold uppercase tracking-[0.16em] text-[#64748B]">Capabilities</p>
            <h2 className="text-3xl font-bold tracking-[-0.03em] text-[#00020A] sm:text-[42px]">Built for finance operations, end to end</h2>
          </div>
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[#E2E8F0] sm:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((c) => (
              <div key={c.title} className="card-3d glass bg-white/70 p-8">
                <div
                  className="neu-raised mb-5 h-[34px] w-[34px] rounded-[9px]"
                  style={{ background: "linear-gradient(135deg, #3B82F6, #2DC653)" }}
                />
                <p className="mb-2 text-base font-bold text-[#00020A]">{c.title}</p>
                <p className="text-[13.5px] leading-relaxed text-[#64748B]">{c.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-11 text-center">
            <Link
              to="/features"
              className="border-b-[1.5px] border-[#00020A] pb-0.5 text-[14.5px] font-semibold text-[#00020A] no-underline"
            >
              See all features →
            </Link>
          </div>
        </div>
      </section>

      {/* FINANCE AGENT SPOTLIGHT */}
      <section className="mx-auto grid max-w-[1180px] grid-cols-1 items-center gap-14 px-6 py-24 sm:px-10 lg:grid-cols-2 lg:gap-[72px] lg:py-28">
        <div>
          <p className="mb-4 text-[11.5px] font-bold uppercase tracking-[0.16em] text-[#64748B]">Finance Agent</p>
          <h2 className="mb-5 text-[28px] font-bold leading-[1.1] tracking-[-0.03em] text-[#00020A] sm:text-4xl">
            Ask your finance data a question. Get a voice answer.
          </h2>
          <p className="mb-7 text-[15.5px] leading-relaxed text-[#64748B]">
            A natural-language agent answers billing questions instantly and speaks the response aloud via
            Smallest.ai Lightning TTS — six voices, generated in real time.
          </p>
          <div className="flex flex-col gap-3">
            <div className="rounded-[10px] border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-[13.5px]">
              "What's the total outstanding for Client XYZ?"
            </div>
            <div className="neu-inset rounded-[10px] border border-[#E2E8F0] bg-white/50 px-4 py-3 text-[13.5px]">
              "Generate invoice for CL001 for June 2026."
            </div>
          </div>
        </div>
        <div className="glass rounded-2xl border border-[#E2E8F0] p-8 shadow-lg">
          <div className="mb-6 flex items-center gap-2.5">
            <div
              className="h-8 w-8 rounded-full"
              style={{ background: "linear-gradient(135deg, #3B82F6, #2DC653)" }}
            />
            <div>
              <p className="text-[13px] font-bold text-[#00020A]">Finance Agent</p>
              <p className="text-[11px] text-[#64748B]">Voice: Jessica</p>
            </div>
          </div>
          <div className="mb-6 flex h-14 items-end gap-[3px]">
            {[20, 55, 80, 45, 95, 35, 70, 25, 60, 40, 85, 30].map((h, i) => (
              <span
                key={i}
                className="w-1 rounded-sm"
                style={{
                  height: `${h}%`,
                  background: "linear-gradient(135deg, #3B82F6, #2DC653)",
                }}
              />
            ))}
          </div>
          <p className="text-[13.5px] italic leading-relaxed text-[#00020A]">
            "Client XYZ has AED 306,590.89 outstanding across 2 invoices, both currently in draft."
          </p>
        </div>
      </section>

      {/* CLIENT PORTAL SPOTLIGHT */}
      <section className="mx-auto grid max-w-[1180px] grid-cols-1 items-center gap-14 px-6 pb-24 sm:px-10 lg:grid-cols-2 lg:gap-[72px] lg:pb-28">
        <div className="order-2 rounded-2xl border border-[#E2E8F0] p-7 lg:order-1">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.1em] text-[#64748B]">Invoice history</p>
          <div className="flex flex-col gap-px overflow-hidden rounded-[10px] border border-[#E2E8F0] bg-[#E2E8F0]">
            {[
              { id: "ESI-2026-06-0028", amount: "AED 256,110.52", status: "Paid", bg: "#E8F5EC", fg: "#2D7A42" },
              { id: "ESI-2026-06-0011", amount: "AED 0.00", status: "Draft", bg: "#F8FAFC", fg: "#64748B" },
              { id: "CL003-2026-06-0032", amount: "AED 306,590.89", status: "Overdue", bg: "#f7ecec", fg: "#8a3a3a" },
            ].map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-3 bg-white px-4 py-3.5">
                <span className="text-[13px] font-semibold text-[#00020A]">{row.id}</span>
                <span className="hidden font-mono text-[12.5px] text-[#64748B] sm:inline">{row.amount}</span>
                <span
                  className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                  style={{ background: row.bg, color: row.fg }}
                >
                  {row.status}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <p className="mb-4 text-[11.5px] font-bold uppercase tracking-[0.16em] text-[#64748B]">Client Portal</p>
          <h2 className="mb-5 text-[28px] font-bold leading-[1.1] tracking-[-0.03em] text-[#00020A] sm:text-4xl">
            Clients stop emailing for status. They just look.
          </h2>
          <p className="mb-5 text-[15.5px] leading-relaxed text-[#64748B]">
            Every client gets an isolated, branded portal to upload payroll files directly, track invoice status
            live, and raise support queries — no ops contact required.
          </p>
          <p className="text-[15.5px] leading-relaxed text-[#64748B]">
            Fewer inbound emails for your finance team. 24/7 visibility for theirs.
          </p>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="border-y border-[#E2E8F0] bg-[#F8FAFC] px-6 py-20 sm:px-10 sm:py-24">
        <div className="mx-auto max-w-[1180px]">
          <p className="mb-10 text-center text-[11.5px] font-bold uppercase tracking-[0.16em] text-[#64748B]">
            What finance teams say
          </p>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {testimonials.map((t) => (
              <div key={t.author} className="card-3d neu-raised rounded-2xl border border-[#E2E8F0] bg-white p-9">
                <p className="mb-6 text-lg font-medium leading-snug tracking-[-0.01em] text-[#00020A]">"{t.quote}"</p>
                <p className="text-[13px] font-semibold text-[#64748B]">{t.author}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TECH / INTEGRATIONS */}
      <section className="mx-auto max-w-[1180px] px-6 py-20 text-center sm:px-10 sm:py-24">
        <p className="mb-9 text-[11.5px] font-bold uppercase tracking-[0.16em] text-[#64748B]">Powered by</p>
        <div className="flex flex-wrap justify-center gap-4">
          {["Groq · Llama 4 Scout", "Smallest.ai · Lightning TTS", "Gmail OAuth2", "FastAPI", "React"].map((t) => (
            <span
              key={t}
              className="neu-raised rounded-full border border-[#E2E8F0] bg-white px-6 py-3 text-[14.5px] font-semibold text-[#00020A]"
            >
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#00020A] px-6 py-24 text-center text-white sm:px-10 sm:py-28">
        <h2 className="mx-auto max-w-[640px] text-[32px] font-bold leading-tight tracking-[-0.03em] sm:text-[46px]">
          See TIA turn a payroll file into an invoice, live.
        </h2>
        <p className="mt-5 text-base text-[#94A3B8] sm:text-[16px]">15 minutes. Your own timesheet, if you'd like.</p>
        <Link
          to="/contact"
          className="neu-btn mt-10 inline-block rounded-full px-[34px] py-4 text-[15px] font-semibold text-white no-underline shadow-[0_0_20px_rgba(45,198,83,0.4)] transition-all hover:scale-105"
          style={{ background: "linear-gradient(135deg, #3B82F6, #2DC653)" }}
        >
          Request a demo
        </Link>
      </section>

      <MarketingFooter />
    </div>
  );
}
