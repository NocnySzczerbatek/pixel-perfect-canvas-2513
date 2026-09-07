import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { GamePage } from "@/components/game/GamePage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useTrainerData } from "@/hooks/useTrainerData";
import { findRegion } from "@/lib/game-data";
import { deleteAccount, renameTrainer } from "@/lib/trainer.functions";

export const Route = createFileRoute("/profil")({
  head: () => ({
    meta: [
      { title: "Profil — Catch Zone" },
      {
        name: "description",
        content: "Zmień nick trenera, sprawdź swoje statystyki, wyloguj się lub usuń konto.",
      },
      { property: "og:title", content: "Profil — Catch Zone" },
      {
        property: "og:description",
        content: "Zmień nick trenera, sprawdź swoje statystyki, wyloguj się lub usuń konto.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilPage,
});

function ProfilPage() {
  const navigate = useNavigate();
  const { data, isLoading, setData } = useTrainerData();
  const rename = useServerFn(renameTrainer);
  const removeAccount = useServerFn(deleteAccount);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data?.profile.trainer_name) setName(data.profile.trainer_name);
  }, [data?.profile.trainer_name]);

  const profile = data?.profile;
  const region = findRegion(profile?.region);
  const total = data?.pokemon.length ?? 0;

  const handleRename = async () => {
    setBusy(true);
    try {
      const result = await rename({ data: { name } });
      if (result?.data) setData(result.data);
      toast.success("Nick zaktualizowany.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się zapisać nicku.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await removeAccount();
      await supabase.auth.signOut();
      toast.success("Konto zostało usunięte.");
      void navigate({ to: "/" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się usunąć konta.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <GamePage title="Profil" subtitle="Twoje dane trenera, nick i zarządzanie kontem.">
      {isLoading || !profile ? (
        <p className="text-sm text-muted-foreground">Wczytuję profil…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="glass-panel rounded-2xl p-6">
            <h2 className="font-display text-2xl">Nick trenera</h2>
            <p className="mt-1 text-sm text-muted-foreground">Od 3 do 18 znaków.</p>
            <div className="mt-4 flex gap-2">
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={18}
                aria-label="Nick trenera"
              />
              <Button
                disabled={busy || name.trim() === profile.trainer_name || name.trim().length < 3}
                onClick={() => void handleRename()}
              >
                Zapisz
              </Button>
            </div>
          </section>

          <section className="glass-panel rounded-2xl p-6">
            <h2 className="font-display text-2xl">Statystyki</h2>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <Fact label="Poziom" value={String(profile.trainer_level)} />
              <Fact
                label="EXP"
                value={`${profile.trainer_exp} / ${profile.trainer_exp_next}`}
              />
              <Fact label="Region" value={region ? region.name : "—"} />
              <Fact label="Złapane Pokémony" value={String(total)} />
              <Fact label="Catch Coins" value={String(profile.catch_coins)} />
              <Fact
                label="Trener od"
                value={new Date(profile.created_at).toLocaleDateString("pl-PL")}
              />
            </dl>
          </section>

          <section className="glass-panel rounded-2xl p-6 lg:col-span-2">
            <h2 className="font-display text-2xl">Konto</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={async () => {
                  await supabase.auth.signOut();
                  void navigate({ to: "/" });
                }}
              >
                Wyloguj
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={busy}>
                    Usuń konto
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Usunąć konto na zawsze?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Znikną wszystkie Twoje Pokémony, monety i postęp. Tej operacji nie da się
                      cofnąć.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Anuluj</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void handleDelete()}>
                      Usuń konto
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </section>
        </div>
      )}
    </GamePage>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-display text-2xl">{value}</dd>
    </div>
  );
}
