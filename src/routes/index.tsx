import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import loginBg from "@/assets/catchzone-login.jpg";
import introVideo from "@/assets/catch-zone-intro.mp4.asset.json";
import logoAsset from "@/assets/logo.png.asset.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useSession } from "@/hooks/useSession";
import { REGIONS, artworkUrl, findRegion, type Region, type Starter } from "@/lib/game-data";
import { completeTutorial, createTrainer as createTrainerServerFn } from "@/lib/onboarding.functions";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cobblemon Catch Zone — zacznij przygodę" },
      {
        name: "description",
        content:
          "Zaloguj się, wybierz region i startera, złap pierwszego Pokémona i wejdź do Catch Zone.",
      },
      { property: "og:title", content: "Cobblemon Catch Zone — zacznij przygodę" },
      {
        property: "og:description",
        content: "Wybierz region, startera i rozpocznij podróż trenera w Catch Zone.",
      },
    ],
  }),
  component: StartScreen,
});

type Step = "region" | "starter" | "tutorial";

function StartScreen() {
  const { session, loading, userId } = useSession();
  const navigate = useNavigate();

  const createTrainerFn = useServerFn(createTrainerServerFn);
  const completeTutorialFn = useServerFn(completeTutorial);

  const [step, setStep] = useState<Step>("region");
  const [region, setRegion] = useState<Region | null>(null);
  const [starter, setStarter] = useState<Starter | null>(null);
  const [busy, setBusy] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(false);
  const [tutorialStage, setTutorialStage] = useState(0);

  // After sign-in: send finished trainers straight into the game,
  // and resume onboarding for anyone mid-tutorial.
  useEffect(() => {
    if (!userId) return;
    let active = true;
    setCheckingProfile(true);
    void supabase
      .from("profiles")
      .select("region, tutorial_completed")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setCheckingProfile(false);
        if (!data) return;
        if (data.tutorial_completed) {
          void navigate({ to: "/gra" });
          return;
        }
        const existing = findRegion(data.region);
        if (existing) {
          setRegion(existing);
          setStep("tutorial");
        }
      });
    return () => {
      active = false;
    };
  }, [userId, navigate]);

  async function signIn(provider: "google" | "microsoft") {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error("Nie udało się zalogować. Spróbuj ponownie.");
      return;
    }
    if (result.redirected) return;
    setBusy(false);
  }

  async function createTrainer(chosen: Starter) {
    if (!session || !region) return;
    setBusy(true);
    const result = await createTrainerFn({ data: { region: region.slug, starterId: chosen.id } });
    setBusy(false);
    if (!result.ok) {
      toast.error(result.reason);
      return;
    }
    setStarter(chosen);
    setStep("tutorial");
    setTutorialStage(1);
  }

  async function finishTutorial() {
    if (!session) return;
    setBusy(true);
    const result = await completeTutorialFn({});
    setBusy(false);
    if (!result.ok) {
      toast.error("Nie udało się zakończyć samouczka.");
      return;
    }
    void navigate({ to: "/gra" });
  }


  const signedIn = Boolean(session);

  return (
    <main className="relative min-h-screen overflow-hidden">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src={introVideo.url}
        poster={loginBg}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-hidden
      />
      <div className="absolute inset-0 bg-background/70" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

      <div className="relative z-10 flex min-h-screen flex-col px-5 py-6 md:px-10">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={logoAsset.url}
              alt="Catch Zone"
              width={64}
              height={64}
              className="h-14 w-14 rounded-xl object-contain drop-shadow-[0_0_12px_rgba(255,255,255,0.55)] ring-1 ring-white/20"
            />
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
                Cobblemon
              </p>
              <h1 className="aurora-text text-5xl leading-none md:text-6xl">Catch Zone</h1>
            </div>
          </div>

          <AuthPanel
            signedIn={signedIn}
            loading={loading}
            busy={busy}
            email={session?.user.email ?? null}
            onSignIn={signIn}
            onSignOut={async () => {
              await supabase.auth.signOut();
              setStep("region");
              setRegion(null);
              setStarter(null);
              setTutorialStage(0);
            }}
          />
        </header>

        <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center py-10">
          {!signedIn ? (
            <IntroCard loading={loading} />
          ) : checkingProfile ? (
            <p className="text-center text-sm text-muted-foreground">Wczytywanie profilu…</p>
          ) : step === "region" ? (
            <RegionGrid
              onPick={(picked) => {
                setRegion(picked);
                setStep("starter");
              }}
            />
          ) : step === "starter" && region ? (
            <StarterGrid
              region={region}
              busy={busy}
              onBack={() => setStep("region")}
              onPick={createTrainer}
            />
          ) : region ? (
            <Tutorial
              region={region}
              starter={starter}
              stage={tutorialStage}
              busy={busy}
              onNext={() => setTutorialStage((s) => s + 1)}
              onFinish={finishTutorial}
            />
          ) : null}
        </section>

        <footer className="text-center text-xs text-muted-foreground">
          Wydarzenie tygodnia: Zimowa Aurora — +10% szansy na rzadkie spotkania na Śnieżnej
          Polanie.
        </footer>
      </div>
    </main>
  );
}

function AuthPanel({
  signedIn,
  loading,
  busy,
  email,
  onSignIn,
  onSignOut,
}: {
  signedIn: boolean;
  loading: boolean;
  busy: boolean;
  email: string | null;
  onSignIn: (provider: "google" | "microsoft") => void;
  onSignOut: () => void;
}) {
  if (loading) {
    return (
      <div className="glass-panel w-56 rounded-xl p-4 text-xs text-muted-foreground">
        Sprawdzanie sesji…
      </div>
    );
  }

  if (signedIn) {
    return (
      <div className="glass-panel w-60 rounded-xl p-4">
        <p className="truncate text-sm font-semibold">{email ?? "Trener"}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Zalogowany</p>
        <Button variant="outline" size="sm" className="mt-3 w-full" onClick={onSignOut}>
          Wyloguj
        </Button>
      </div>
    );
  }

  return (
    <div className="glass-panel w-64 rounded-xl p-4">
      <p className="text-sm font-semibold">Zaloguj się</p>
      <p className="mt-0.5 text-xs text-muted-foreground">Zapisujemy Twój postęp trenera.</p>
      <div className="mt-3 space-y-2">
        <Button
          className="w-full"
          size="sm"
          disabled={busy}
          onClick={() => onSignIn("google")}
        >
          Google
        </Button>
        <Button
          variant="secondary"
          className="w-full"
          size="sm"
          disabled={busy}
          onClick={() => onSignIn("microsoft")}
        >
          Microsoft
        </Button>
      </div>
    </div>
  );
}

function IntroCard({ loading }: { loading: boolean }) {
  return (
    <div className="glass-panel mx-auto max-w-xl rounded-2xl p-8 text-center">
      <h2 className="text-3xl">Witaj w Catch Zone</h2>
      <p className="mt-3 text-sm text-muted-foreground">
        Eksploruj biomy za Energię, łap dzikie Pokémony, mierz się z żywymi graczami i
        zdobywaj odznaki ośmiu Sal w każdym regionie.
      </p>
      <p className="mt-6 text-xs uppercase tracking-[0.25em] text-primary">
        {loading ? "Ładowanie…" : "Zaloguj się w panelu w prawym górnym rogu"}
      </p>
    </div>
  );
}

function RegionGrid({ onPick }: { onPick: (region: Region) => void }) {
  return (
    <div>
      <h2 className="text-center text-3xl">Wybierz region</h2>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Region decyduje o Twoich starterach, biomach i Salach.
      </p>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {REGIONS.map((region) => (
          <button
            key={region.slug}
            onClick={() => onPick(region)}
            className="glass-panel tile-hover rounded-xl p-4 text-left"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-primary">{region.gen}</p>
            <p className="mt-1 font-display text-2xl">{region.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{region.tagline}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function StarterGrid({
  region,
  busy,
  onBack,
  onPick,
}: {
  region: Region;
  busy: boolean;
  onBack: () => void;
  onPick: (starter: Starter) => void;
}) {
  return (
    <div>
      <h2 className="text-center text-3xl">Twój pierwszy partner — {region.name}</h2>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Profesor przygotował trzy Pokémony na poziomie 1.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {region.starters.map((starter) => (
          <button
            key={starter.id}
            disabled={busy}
            onClick={() => onPick(starter)}
            className="glass-panel tile-hover rounded-2xl p-5 text-center disabled:opacity-60"
          >
            <img
              src={artworkUrl(starter.id)}
              alt={starter.name}
              loading="lazy"
              width={220}
              height={220}
              className="mx-auto h-32 w-32 object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.5)]"
            />
            <p className="mt-3 font-display text-2xl">{starter.name}</p>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">{starter.type}</p>
          </button>
        ))}
      </div>
      <div className="mt-6 text-center">
        <Button variant="outline" size="sm" onClick={onBack} disabled={busy}>
          Zmień region
        </Button>
      </div>
    </div>
  );
}

function Tutorial({
  region,
  starter,
  stage,
  busy,
  onNext,
  onFinish,
}: {
  region: Region;
  starter: Starter | null;
  stage: number;
  busy: boolean;
  onNext: () => void;
  onFinish: () => void;
}) {
  const stages = useMemo(
    () => [
      {
        title: `Profesor wita Cię w regionie ${region.name}`,
        body: starter
          ? `${starter.name} na poziomie 1 dołącza do Twojej drużyny. Od teraz podróżujecie razem.`
          : "Twój starter jest gotowy do drogi.",
        cta: "Dalej",
      },
      {
        title: "Pierwsze łapanie na Polanie",
        body: "To spotkanie jest skryptowane — rzut Poké Ballem uda się na pewno. Później nieudany rzut oznacza bezpowrotną utratę Balla.",
        cta: "Rzuć Poké Ballem",
      },
      {
        title: "Energia i Pakiet Startowy",
        body: "Energia to Twoje paliwo do podróży: maks. 100 punktów, +1 co 3 minuty. Otrzymujesz 5x Flakon Energii i 10x Poké Ball.",
        cta: "Wejdź do gry",
      },
    ],
    [region.name, starter],
  );

  const current = stages[Math.min(stage, stages.length - 1)]!;
  const isLast = stage >= stages.length - 1;

  return (
    <div className="glass-panel relative mx-auto max-w-2xl rounded-2xl p-8">
      <Button
        variant="ghost"
        size="sm"
        className="absolute right-3 top-3 text-xs"
        disabled={busy}
        onClick={onFinish}
      >
        Pomiń
      </Button>
      <p className="text-xs uppercase tracking-[0.3em] text-primary">
        Samouczek {Math.min(stage + 1, stages.length)}/{stages.length}
      </p>
      <h2 className="mt-3 text-3xl">{current.title}</h2>
      <p className="mt-3 text-sm text-muted-foreground">{current.body}</p>
      {starter ? (
        <img
          src={artworkUrl(starter.id)}
          alt={starter.name}
          loading="lazy"
          width={220}
          height={220}
          className="mt-4 h-28 w-28 object-contain"
        />
      ) : null}
      <Button
        className="mt-6"
        disabled={busy}
        onClick={() => (isLast ? onFinish() : onNext())}
      >
        {current.cta}
      </Button>
    </div>
  );
}
