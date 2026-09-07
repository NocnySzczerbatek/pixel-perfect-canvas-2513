import {
  capPermanent,
  chanceText,
  multiplierFromPct,
  PERMANENT_BONUS_PCT,
  type BonusRow,
  type BonusState,
  type BuffRow,
} from "@/lib/bonuses";

async function writeDb(): Promise<any> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

/** Sprząta wygasłe buffy i zwraca tylko aktywne. */
export async function activeBuffs(userId: string): Promise<BuffRow[]> {
  const db = await writeDb();
  const nowIso = new Date().toISOString();
  await db.from("player_buffs").delete().eq("owner_id", userId).lt("expires_at", nowIso);
  const { data } = await db
    .from("player_buffs")
    .select("id, buff_key, label, source, shiny_bonus_pct, rare_bonus_pct, expires_at")
    .eq("owner_id", userId)
    .gt("expires_at", nowIso)
    .order("expires_at", { ascending: true });
  return (data ?? []) as BuffRow[];
}

export async function permanentBonuses(userId: string): Promise<BonusRow[]> {
  const db = await writeDb();
  const { data } = await db
    .from("player_bonuses")
    .select("id, bonus_key, label, shiny_bonus_pct, rare_bonus_pct, unlocked_at")
    .eq("owner_id", userId)
    .order("unlocked_at", { ascending: true });
  return (data ?? []) as BonusRow[];
}

/** Wspólny modyfikator: buffy czasowe + trwałe bonusy (z limitem) + Shiny Charm. */
export async function encounterMultipliers(userId: string): Promise<{
  shiny: number;
  rare: number;
  buffs: BuffRow[];
  permanent: BonusRow[];
  permanentShinyPct: number;
  charm: boolean;
}> {
  const db = await writeDb();
  const [buffs, permanent] = await Promise.all([activeBuffs(userId), permanentBonuses(userId)]);
  const { data: charmRow } = await db
    .from("player_items")
    .select("quantity")
    .eq("owner_id", userId)
    .eq("item_key", "shiny_charm")
    .maybeSingle();
  const charm = !!charmRow && (charmRow.quantity ?? 0) > 0;

  const buffShiny = buffs.reduce((sum, b) => sum + (b.shiny_bonus_pct ?? 0), 0);
  const buffRare = buffs.reduce((sum, b) => sum + (b.rare_bonus_pct ?? 0), 0);
  const permanentShinyPct = capPermanent(
    permanent.reduce((sum, b) => sum + (b.shiny_bonus_pct ?? 0), 0),
  );
  const permanentRarePct = capPermanent(
    permanent.reduce((sum, b) => sum + (b.rare_bonus_pct ?? 0), 0),
  );

  const shiny =
    multiplierFromPct(buffShiny + permanentShinyPct) * (charm ? 2 : 1);
  const rare = multiplierFromPct(buffRare + permanentRarePct);
  return { shiny, rare, buffs, permanent, permanentShinyPct, charm };
}

export async function bonusStateFor(userId: string): Promise<BonusState> {
  const m = await encounterMultipliers(userId);
  return {
    buffs: m.buffs,
    permanent: m.permanent,
    permanent_shiny_pct: m.permanentShinyPct,
    permanent_cap_pct: PERMANENT_CAP_PCT,
    shiny_multiplier: m.shiny,
    rare_multiplier: m.rare,
    shiny_chance_text: chanceText(m.shiny),
  };
}

/** Nadaje buff czasowy (odświeża czas, jeśli już aktywny). */
export async function grantTimedBuff(
  userId: string,
  def: {
    key: string;
    label: string;
    source: string;
    shiny_bonus_pct: number;
    rare_bonus_pct: number;
    minutes: number;
  },
): Promise<string> {
  const db = await writeDb();
  const expiresAt = new Date(Date.now() + def.minutes * 60_000).toISOString();
  const { data: existing } = await db
    .from("player_buffs")
    .select("id")
    .eq("owner_id", userId)
    .eq("buff_key", def.key)
    .maybeSingle();
  if (existing) {
    await db.from("player_buffs").update({ expires_at: expiresAt }).eq("id", existing.id);
  } else {
    await db.from("player_buffs").insert({
      owner_id: userId,
      buff_key: def.key,
      label: def.label,
      source: def.source,
      shiny_bonus_pct: def.shiny_bonus_pct,
      rare_bonus_pct: def.rare_bonus_pct,
      expires_at: expiresAt,
    });
  }
  return expiresAt;
}

/** Odblokowuje trwały bonus raz na osiągnięcie. Zwraca true przy pierwszym nadaniu. */
export async function grantPermanentBonus(
  userId: string,
  bonusKey: string,
  label: string,
): Promise<boolean> {
  const db = await writeDb();
  const { data: existing } = await db
    .from("player_bonuses")
    .select("id")
    .eq("owner_id", userId)
    .eq("bonus_key", bonusKey)
    .maybeSingle();
  if (existing) return false;
  await db.from("player_bonuses").insert({
    owner_id: userId,
    bonus_key: bonusKey,
    label,
    shiny_bonus_pct: PERMANENT_BONUS_PCT,
    rare_bonus_pct: PERMANENT_BONUS_PCT,
  });
  return true;
}
