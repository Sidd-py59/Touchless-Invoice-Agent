interface PageTitleProps {
  title: string;
  description?: string;
}

export function PageTitle({ title, description }: PageTitleProps) {
  return (
    <div className="space-y-1">
      <h1 className="text-xl font-semibold text-foreground" style={{ letterSpacing: "-0.4px" }}>{title}</h1>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
