import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features | TIA" },
      {
        name: "description",
        content:
          "TIA features — universal parsing, AI OCR correction, validation, payroll calculation, invoicing, voice agent, client portal.",
      },
    ],
  }),
  component: FeaturesPage,
});

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 font-mono text-xs font-bold text-[#64748B]">{children}</p>;
}

function FeatureRow({
  n,
  title,
  body,
  visual,
  reverse,
}: {
  n: string;
  title: string;
  body: string;
  visual: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <section className="mx-auto grid max-w-[1180px] grid-cols-1 items-center gap-10 border-t border-[#E2E8F0] px-6 py-16 sm:px-10 lg:grid-cols-2 lg:gap-16 lg:py-[70px]">
      <div className={reverse ? "lg:order-2" : ""}>
        <Eyebrow>{n}</Eyebrow>
        <h2 className="mb-4 text-[26px] font-bold leading-[1.15] tracking-[-0.02em] text-[#00020A] sm:text-[30px]">{title}</h2>
        <p className="text-[15px] leading-relaxed text-[#64748B]">{body}</p>
      </div>
      <div className={reverse ? "lg:order-1" : ""}>{visual}</div>
    </section>
  );
}

function VisualCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="card-3d glass flex h-[220px] flex-col justify-center gap-3 rounded-2xl border border-[#E2E8F0] bg-white/70 p-7">
      {children}
    </div>
  );
}

function FeaturesPage() {
  return (
    <div className="w-full overflow-x-clip bg-white text-[#00020A]">
      <MarketingHeader />

      {/* HERO */}
      <section className="mx-auto max-w-[900px] px-6 pb-16 pt-24 text-center sm:px-10 sm:pt-28">
        <p className="mb-5 text-[11.5px] font-bold uppercase tracking-[0.16em] text-[#64748B]">Features</p>
        <h1 className="text-[38px] font-bold leading-[1.08] tracking-[-0.03em] text-[#00020A] sm:text-5xl lg:text-[60px] lg:leading-[1.04] lg:tracking-[-0.035em]">
          Every stage of payroll-to-invoice, automated.
        </h1>
        <p className="mx-auto mt-6 max-w-[560px] text-base leading-relaxed text-[#64748B] sm:text-[17px]">
          Ten capabilities that replace the manual timesheet-to-invoice cycle with an auditable, AI-driven pipeline.
        </p>
      </section>

      <FeatureRow
        n="01"
        title="Touchless Gmail ingestion"
        body="Connects to a configured Gmail account via OAuth2 and polls every 30 seconds. PDF attachments, Excel files, images, or inline email bodies are automatically saved, classified, and parsed — no downloading, renaming, or uploading by hand. Every processed message ID is tracked to guarantee zero duplicate ingestion, even across restarts."
        visual={
          <VisualCard>
            {[
              { name: "timesheet_june_dubaiairports.pdf" },
              { name: "payroll_esi_2026_06.xlsx" },
            ].map((f) => (
              <div
                key={f.name}
                className="flex items-center gap-3 rounded-[10px] border border-[#E2E8F0] bg-white px-4 py-3"
              >
                <div
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: "linear-gradient(135deg, #3B82F6, #2DC653)" }}
                />
                <span className="truncate text-[13px] font-semibold text-[#00020A]">{f.name}</span>
                <span className="ml-auto shrink-0 rounded-full bg-[#E8F5EC] px-2.5 py-0.5 text-[11px] font-semibold text-[#2D7A42]">
                  Ingested
                </span>
              </div>
            ))}
            <p className="mt-1 font-mono text-[11.5px] text-[#64748B]">polling gmail · every 30s</p>
          </VisualCard>
        }
      />

      <FeatureRow
        n="02"
        title="Universal multi-format parser"
        body="Layout-aware PDF extraction with OCR fallback for scans. Dynamic header detection across Excel and CSV. OpenCV preprocessing plus Tesseract for images and handwritten sheets. Direct extraction from inline email tables. Whatever format a client sends, TIA reads it — no rejections, no resubmission requests."
        reverse
        visual={
          <div className="card-3d glass grid h-[220px] grid-cols-2 gap-3 rounded-2xl border border-[#E2E8F0] bg-white/70 p-7">
            {["PDF", "Excel / CSV", "Images", "Email body"].map((label) => (
              <div
                key={label}
                className="neu-raised flex flex-col items-center justify-center gap-1.5 rounded-[10px] border border-[#E2E8F0] bg-white p-4"
              >
                <div
                  className="h-7 w-7 rounded-lg shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                  style={{ background: "linear-gradient(135deg, #3B82F6, #2DC653)" }}
                />
                <span className="text-xs font-semibold text-[#00020A]">{label}</span>
              </div>
            ))}
          </div>
        }
      />

      <FeatureRow
        n="03"
        title="AI-powered OCR correction"
        body="Scanned and handwritten timesheets produce noisy raw OCR — misread characters, broken columns, misaligned rows. TIA sends the extracted table to Groq's Llama 4 Scout 17B Instruct model, which reconstructs column alignment and returns a clean, structured payload ready for validation."
        visual={
          <div className="card-3d glass flex h-[220px] flex-col justify-center gap-3 rounded-2xl border border-[#E2E8F0] bg-white/70 p-7" style={{ perspective: "1000px" }}>
            <div className="flex items-center gap-3.5 transform-style-3d">
              <div className="neu-inset flex-1 rounded-[10px] border border-[#E2E8F0] bg-white/50 p-3.5 font-mono text-[11.5px] leading-snug text-[#64748B] transform translate-z-[-20px]">
                EmpCd Ov3rt1me
                <br />
                0O77 l2.5
              </div>
              <span className="text-base text-[#64748B]">→</span>
              <div
                className="neu-raised flex-1 rounded-[10px] p-3.5 font-mono text-[11.5px] leading-snug text-white transform translate-z-[20px] shadow-[0_15px_30px_rgba(30,58,138,0.3)]"
                style={{ background: "linear-gradient(135deg, #00020A, #00020A)" }}
              >
                EmpCode Overtime
                <br />
                0077 12.5
              </div>
            </div>
            <p className="font-mono text-[11.5px] text-[#64748B]">groq · llama-4-scout-17b-instruct</p>
          </div>
        }
      />

      <FeatureRow
        n="04"
        title="Business validation engine"
        body="Every row runs through five configurable rules before a single invoice line is calculated: employee exists, client match, working days limit, duplicate employee, overtime limits. Violations surface in a Validation Queue by severity — review, override with reason, or escalate, all logged to the audit trail."
        reverse
        visual={
          <div className="overflow-hidden rounded-2xl border border-[#E2E8F0]">
            {[
              { label: "Duplicate Employee", tone: "Error", bg: "#f7ecec", fg: "#8a3a3a" },
              { label: "Working Days Limit", tone: "Warning", bg: "#f7f0e2", fg: "#8a6a2f" },
              { label: "Employee Exists", tone: "Error", bg: "#f7ecec", fg: "#8a3a3a" },
              { label: "Overtime Limits", tone: "Info", bg: "#F8FAFC", fg: "#64748B" },
            ].map((row, i, arr) => (
              <div
                key={row.label}
                className={`flex items-center justify-between bg-white px-5 py-3.5 ${i < arr.length - 1 ? "border-b border-[#E2E8F0]" : ""}`}
              >
                <span className="text-[13px] font-semibold text-[#00020A]">{row.label}</span>
                <span
                  className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                  style={{ background: row.bg, color: row.fg }}
                >
                  {row.tone}
                </span>
              </div>
            ))}
          </div>
        }
      />

      <FeatureRow
        n="05"
        title="Payroll calculation engine"
        body="Resolves each employee's billing against a PayrollMaster contract — basic salary, housing, transport, food and phone allowances, deductions, service fee, and tax. Salary overrides on a timesheet row take priority. Output: pro-rated gross salary, overtime earnings, and net billable amount per employee."
        visual={
          <VisualCard>
            {[
              { label: "Basic salary (pro-rated)", value: "AED 9,200.00" },
              { label: "Allowances", value: "AED 2,150.00" },
              { label: "Overtime", value: "AED 640.00" },
              { label: "Service fee + tax", value: "AED 1,120.50" },
            ].map((row) => (
              <div key={row.label} className="flex justify-between text-[13px]">
                <span className="text-[#64748B]">{row.label}</span>
                <span className="font-mono font-semibold text-[#00020A]">{row.value}</span>
              </div>
            ))}
            <div className="mt-1.5 flex justify-between border-t border-[#E2E8F0] pt-2.5 text-sm font-bold">
              <span className="text-[#00020A]">Net billable</span>
              <span className="font-mono text-[#00020A]">AED 13,110.50</span>
            </div>
          </VisualCard>
        }
      />

      {/* Invoice lifecycle */}
      <section className="mx-auto max-w-[1180px] border-t border-[#E2E8F0] px-6 py-16 sm:px-10 sm:py-[70px]">
        <div className="mx-auto mb-12 max-w-[640px] text-center">
          <Eyebrow>06</Eyebrow>
          <h2 className="mb-4 text-[26px] font-bold leading-[1.15] tracking-[-0.02em] text-[#00020A] sm:text-[30px]">
            Invoice generation & lifecycle
          </h2>
          <p className="text-[15px] leading-relaxed text-[#64748B]">
            Validated timesheets produce professional PDF invoices with line-item breakdowns, subtotals, fees, taxes,
            and totals — then track through a full lifecycle from the dashboard.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {["Draft", "Sent", "Paid"].map((s, i) => (
            <div key={s} className="flex items-center gap-3">
              {i > 0 && <span className="text-[#64748B]">→</span>}
              <div className="rounded-full bg-[#00020A] px-6 py-3 text-[13.5px] font-semibold text-white">{s}</div>
            </div>
          ))}
          {["Overdue", "Void"].map((s) => (
            <div key={s} className="flex items-center gap-3">
              <span className="text-[#64748B]">/</span>
              <div className="rounded-full border-[1.5px] border-[#E2E8F0] px-6 py-3 text-[13.5px] font-semibold text-[#00020A]">
                {s}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Agent + Portal dark band */}
      <section className="bg-[#00020A] px-6 py-20 text-white sm:px-10 sm:py-24">
        <div className="mx-auto grid max-w-[1180px] grid-cols-1 gap-px overflow-hidden rounded-2xl border border-[#1E293B] bg-[#1E293B] md:grid-cols-2">
          <div className="bg-[#00020A] p-9 sm:p-11">
            <p className="mb-4 font-mono text-xs font-bold text-[#64748B]">07</p>
            <h3 className="mb-3.5 text-2xl font-bold tracking-[-0.02em]">Finance Command Agent</h3>
            <p className="text-[14.5px] leading-relaxed text-[#94A3B8]">
              Natural-language questions and commands — "how many invoices are pending?", "generate invoice for
              CL001" — answered as text and as synthesized voice via Smallest.ai Lightning TTS. Six voice options,
              24kHz MP3 output.
            </p>
          </div>
          <div className="bg-[#00020A] p-9 sm:p-11">
            <p className="mb-4 font-mono text-xs font-bold text-[#64748B]">08</p>
            <h3 className="mb-3.5 text-2xl font-bold tracking-[-0.02em]">Client Self-Service Portal</h3>
            <p className="text-[14.5px] leading-relaxed text-[#94A3B8]">
              Each client gets an isolated, branded portal to upload timesheets, view invoice history, track
              outstanding amounts, and submit support queries — without emailing anyone.
            </p>
          </div>
        </div>
      </section>

      {/* Audit trail */}
      <section className="mx-auto max-w-[900px] border-b border-[#E2E8F0] px-6 py-20 text-center sm:px-10 sm:py-24">
        <p className="mb-4 font-mono text-xs font-bold text-[#64748B]">09</p>
        <h2 className="mb-4 text-[26px] font-bold tracking-[-0.02em] text-[#00020A] sm:text-[30px]">Immutable audit trail</h2>
        <p className="text-[15px] leading-relaxed text-[#64748B]">
          Every action — upload, extraction, override, approval, status change, query resolution — is logged to an
          append-only trail with timestamps and user attribution. A complete, structured record for compliance and
          disputes.
        </p>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 text-center sm:px-10 sm:py-28">
        <h2 className="mb-5 text-[32px] font-bold tracking-[-0.03em] text-[#00020A] sm:text-[42px]">Ready to see it on your own data?</h2>
        <Link
          to="/contact"
          className="neu-btn inline-block rounded-full bg-[#00020A] px-[34px] py-4 text-[15px] font-semibold text-white no-underline shadow-[0_0_15px_rgba(30,58,138,0.5)] transition-all hover:scale-105 hover:bg-[#00020A]"
        >
          Request a demo
        </Link>
      </section>

      <MarketingFooter />
    </div>
  );
}
