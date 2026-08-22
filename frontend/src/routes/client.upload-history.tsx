import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FolderOpen } from "lucide-react";
import { PageTitle } from "@/components/app/page-title";
import { SearchFilterBar } from "@/components/app/search-filter-bar";
import { StatusPill } from "@/components/app/status-pill";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { useClientId } from "@/lib/auth-context";
import { payrollStatusTone } from "@/lib/ui-mappers";

export const Route = createFileRoute("/client/upload-history")({
  head: () => ({
    meta: [
      { title: "Upload History | TIA" },
      { name: "description", content: "Search and review payroll upload history and processing outcomes." },
    ],
  }),
  component: UploadHistoryPage,
});

function UploadHistoryPage() {
  const clientId = useClientId();
  const { data, isLoading, error } = useQuery({
    queryKey: ["portal-documents", clientId],
    queryFn: () => api.listPortalDocuments(clientId, { page_size: 50 }),
  });

  return (
    <div className="space-y-5">
      <PageTitle
        title="Upload History"
        description="All payroll files you've submitted and their current processing status."
      />

      <SearchFilterBar placeholder="Search file name or status" />

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center border-b border-border px-5 py-3.5">
          <p className="text-sm font-semibold text-foreground">
            Uploads
            {data && (
              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {data.total}
              </span>
            )}
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-9 text-xs font-semibold">File Name</TableHead>
              <TableHead className="h-9 text-xs font-semibold">Source</TableHead>
              <TableHead className="h-9 text-xs font-semibold">Upload Date</TableHead>
              <TableHead className="h-9 text-xs font-semibold">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell>
              </TableRow>
            )}
            {error && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-destructive">Failed to load documents.</TableCell>
              </TableRow>
            )}
            {!isLoading && data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-14 text-center">
                  <FolderOpen className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm font-medium text-muted-foreground">No uploads yet</p>
                  <p className="mt-0.5 text-xs text-muted-foreground/60">Use the Upload Payroll page to submit your first file.</p>
                </TableCell>
              </TableRow>
            )}
            {(data?.items ?? []).map((item) => (
              <TableRow key={item.id}>
                <TableCell className="py-3 font-medium text-foreground">{item.file_name}</TableCell>
                <TableCell className="py-3 capitalize text-muted-foreground">{item.source}</TableCell>
                <TableCell className="py-3 text-muted-foreground">
                  {new Date(item.uploaded_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="py-3">
                  <StatusPill label={item.status} tone={payrollStatusTone(item.status)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
