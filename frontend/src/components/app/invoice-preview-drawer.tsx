import { useState } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface InvoicePreviewDrawerProps {
  invoice: {
    invoiceNumber: string;
    client: string;
    month: string;
    amount: string;
    status: string;
  };
}

export function InvoicePreviewDrawer({ invoice }: InvoicePreviewDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Eye className="h-4 w-4" />
          Preview
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{invoice.invoiceNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-muted-foreground">Client</p>
              <p className="font-medium text-foreground">{invoice.client}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Billing Month</p>
              <p className="font-medium text-foreground">{invoice.month}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Amount</p>
              <p className="font-medium text-foreground">{invoice.amount}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="font-medium text-foreground">{invoice.status}</p>
            </div>
          </div>
          <div className="grid h-48 place-items-center rounded-md border border-dashed border-border bg-muted/40">
            <p className="text-xs text-muted-foreground">Invoice PDF preview placeholder</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}