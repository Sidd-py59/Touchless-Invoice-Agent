import { Search } from "lucide-react";

interface SearchFilterBarProps {
  placeholder?: string;
}

export function SearchFilterBar({ placeholder = "Search..." }: SearchFilterBarProps) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        placeholder={placeholder}
        className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-4 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:w-80"
      />
    </div>
  );
}