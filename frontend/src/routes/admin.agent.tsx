import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  ChevronDown,
  Clock,
  Database,
  Loader2,
  Play,
  SendHorizontal,
  ShieldAlert,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import { PageTitle } from "@/components/app/page-title";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, type AgentCommandResponse } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/agent")({
  head: () => ({
    meta: [
      { title: "Agent | TIA" },
      { name: "description", content: "Finance command agent for live invoice operations." },
    ],
  }),
  component: AdminAgentPage,
});

const quickCommands = [
  "how many invoices are pending",
  "how many timesheets need review",
  "show failed extractions",
  "show finance overview",
  "show invoice status for client CL001",
  "generate invoice for client CL001 for June 2026",
];

const statusStyles: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  success: {
    label: "Success",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: CheckCircle2,
  },
  blocked: {
    label: "Blocked",
    className: "border-amber-200 bg-amber-50 text-amber-700",
    icon: ShieldAlert,
  },
  needs_clarification: {
    label: "Clarify",
    className: "border-blue-200 bg-blue-50 text-blue-700",
    icon: AlertCircle,
  },
  not_found: {
    label: "Not Found",
    className: "border-slate-200 bg-slate-50 text-slate-700",
    icon: AlertCircle,
  },
  error: {
    label: "Error",
    className: "border-red-200 bg-red-50 text-red-700",
    icon: AlertCircle,
  },
};

function AdminAgentPage() {
  const [command, setCommand] = useState("how many invoices are pending");
  const [history, setHistory] = useState<AgentCommandResponse[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [autoPlay, setAutoPlay] = useState(true);

  const { data: voicesData } = useQuery({
    queryKey: ["agent-voices"],
    queryFn: () => api.listVoices(),
    staleTime: Infinity,
  });

  useEffect(() => {
    if (voicesData && !selectedVoice) {
      setSelectedVoice(voicesData.default);
    }
  }, [voicesData, selectedVoice]);

  const mutation = useMutation({
    mutationFn: (text: string) => api.runAgentCommand(text, selectedVoice || undefined),
    onSuccess: (response) => {
      setHistory((items) => [response, ...items].slice(0, 6));
    },
  });

  const latest = mutation.data ?? history[0];
  const dataRows = useMemo(() => flattenData(latest?.data), [latest]);

  const submitCommand = (text = command) => {
    const value = text.trim();
    if (!value || mutation.isPending) return;
    setCommand(value);
    mutation.mutate(value);
  };

  return (
    <div className="space-y-5">
      <PageTitle
        title="Finance Agent"
        description="Run live finance commands against the connected backend data."
      />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,0.9fr)]">
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-foreground text-background">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Command Console</p>
                  <p className="text-[11px] text-muted-foreground">Backend route: /api/v1/agent/command</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <VoiceControls
                  voices={voicesData?.voices ?? []}
                  selected={selectedVoice}
                  onSelect={setSelectedVoice}
                  autoPlay={autoPlay}
                  onToggleAutoPlay={() => setAutoPlay((v) => !v)}
                />
                <Badge variant="outline" className="gap-1.5 border-border bg-background text-muted-foreground">
                  <Database className="h-3 w-3" />
                  Live DB
                </Badge>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <div className="flex gap-2">
                <Input
                  value={command}
                  onChange={(event) => setCommand(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") submitCommand();
                  }}
                  className="h-10 font-mono text-sm"
                  placeholder="Ask a finance command"
                />
                <Button className="h-10 shrink-0 gap-2" onClick={() => submitCommand()} disabled={mutation.isPending}>
                  {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
                  Run
                </Button>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {quickCommands.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => submitCommand(item)}
                    disabled={mutation.isPending}
                    className="min-h-12 rounded-md border border-border bg-background px-3 py-2 text-left text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-muted disabled:opacity-50"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <AgentResponsePanel
            response={latest}
            isLoading={mutation.isPending}
            error={mutation.error}
            autoPlay={autoPlay}
          />
        </div>

        <div className="space-y-4">
          <Card className="rounded-xl border-border shadow-sm">
            <CardHeader className="border-b border-border px-5 py-3.5">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                Response Data
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {dataRows.length > 0 ? (
                <div className="divide-y divide-border">
                  {dataRows.map((row) => (
                    <div key={row.key} className="grid grid-cols-[150px_minmax(0,1fr)] gap-3 px-5 py-3 text-xs">
                      <span className="font-medium text-muted-foreground">{row.key}</span>
                      <span className="break-words font-mono text-foreground">{row.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-5 py-12 text-center text-sm text-muted-foreground">No structured data yet.</div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-xl border-border shadow-sm">
            <CardHeader className="border-b border-border px-5 py-3.5">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-primary" />
                Recent Runs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-3">
              {history.length > 0 ? (
                history.map((item, index) => (
                  <button
                    key={`${item.intent}-${index}`}
                    type="button"
                    onClick={() => setCommand(item.message)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-left transition-colors hover:bg-muted"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-semibold text-foreground">{item.intent.replaceAll("_", " ")}</span>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="line-clamp-2 text-[11px] leading-5 text-muted-foreground">{item.message}</p>
                  </button>
                ))
              ) : (
                <div className="px-3 py-8 text-center text-sm text-muted-foreground">No command history.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function VoiceControls({
  voices,
  selected,
  onSelect,
  autoPlay,
  onToggleAutoPlay,
}: {
  voices: string[];
  selected: string;
  onSelect: (v: string) => void;
  autoPlay: boolean;
  onToggleAutoPlay: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={onToggleAutoPlay}
        title={autoPlay ? "Auto-play on" : "Auto-play off"}
        className={cn(
          "flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] font-medium transition-colors",
          autoPlay
            ? "border-primary/30 bg-primary/10 text-primary"
            : "border-border bg-background text-muted-foreground hover:bg-muted"
        )}
      >
        <Play className="h-3 w-3" />
        Auto
      </button>
      {voices.length > 0 && (
        <div className="relative">
          <select
            value={selected}
            onChange={(e) => onSelect(e.target.value)}
            className="h-7 appearance-none rounded-md border border-border bg-background pl-2 pr-6 text-[11px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {voices.map((v) => (
              <option key={v} value={v}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

function AgentResponsePanel({
  response,
  isLoading,
  error,
  autoPlay,
}: {
  response?: AgentCommandResponse;
  isLoading: boolean;
  error: unknown;
  autoPlay: boolean;
}) {
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Agent request failed</p>
            <p className="mt-1 text-sm">Check that the backend is running and the agent route is registered.</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-primary" />
        <p className="text-sm font-medium text-foreground">Running command...</p>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center shadow-sm">
        <Bot className="mx-auto mb-3 h-7 w-7 text-muted-foreground/60" />
        <p className="text-sm font-medium text-muted-foreground">Agent response will appear here.</p>
      </div>
    );
  }

  const style = statusStyles[response.status] ?? statusStyles.needs_clarification;
  const Icon = style.icon;

  return (
    <div className={cn("rounded-xl border bg-card p-5 shadow-sm", style.className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          <span className="text-sm font-semibold">{style.label}</span>
        </div>
        <Badge variant="outline" className="border-current bg-transparent font-mono text-[11px] text-current">
          {response.intent}
        </Badge>
      </div>
      <p className="text-base font-semibold leading-7 text-current">{response.message}</p>
      <VoicePlayback response={response} autoPlay={autoPlay} />
    </div>
  );
}

function VoicePlayback({ response, autoPlay }: { response: AgentCommandResponse; autoPlay: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (autoPlay && response.audio_url && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  }, [response.audio_url, autoPlay]);

  if (response.audio_url) {
    return (
      <div className="mt-4 rounded-md border border-current/20 bg-white/50 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-current">
          <Volume2 className="h-4 w-4" />
          Smallest.ai voice response
        </div>
        <audio ref={audioRef} className="w-full" controls src={api.mediaUrl(response.audio_url)} />
      </div>
    );
  }

  return (
    <div className="mt-4 flex items-start gap-2 rounded-md border border-current/20 bg-white/40 px-3 py-2 text-xs text-current/80">
      <VolumeX className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        Voice output is {response.audio_status}. {response.voice_error ?? "Add SMALLEST_API_KEY to enable Smallest.ai audio."}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const style = statusStyles[status] ?? statusStyles.needs_clarification;
  return (
    <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold", style.className)}>
      {style.label}
    </span>
  );
}

function flattenData(data?: Record<string, unknown>) {
  if (!data) return [];
  return Object.entries(data).map(([key, value]) => ({
    key,
    value: formatValue(value),
  }));
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}
