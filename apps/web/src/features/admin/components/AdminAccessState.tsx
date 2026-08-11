interface AdminAccessStateProps {
  description: string;
  title: string;
}

export function AdminAccessState({ description, title }: AdminAccessStateProps) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-hypo-bg p-6">
      <div className="w-full max-w-md rounded-hypo-xl border border-hypo-border bg-white p-6 text-center">
        <h1 className="text-xl font-black text-hypo-text">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-hypo-text-muted">{description}</p>
      </div>
    </div>
  );
}
