import { Link } from "@tanstack/react-router";
import { ArrowLeft, Clock } from "lucide-react";
import type { ReactNode } from "react";

export function GamePage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: ReactNode;
}) {
  return (
    <main className="min-h-screen px-5 py-8 md:px-10">
      <Link
        to="/gra"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Panel trenera
      </Link>
      <h1 className="aurora-text mt-4 text-4xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-8">{children}</div>
    </main>
  );
}

export function ComingSoon({ note }: { note: string }) {
  return (
    <div className="glass-panel flex max-w-2xl items-start gap-4 rounded-2xl p-6">
      <Clock className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
      <div>
        <p className="font-display text-2xl">Wkrótce dostępne</p>
        <p className="mt-1 text-sm text-muted-foreground">{note}</p>
      </div>
    </div>
  );
}
