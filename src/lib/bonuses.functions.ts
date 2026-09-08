import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { BonusHistoryRow, BonusState } from "@/lib/bonuses";

export const getBonusState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BonusState> => {
    const { bonusStateFor } = await import("@/lib/bonuses.server");
    return bonusStateFor(context.userId);
  });

export const getBonusHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BonusHistoryRow[]> => {
    const { bonusHistoryFor } = await import("@/lib/bonuses.server");
    return bonusHistoryFor(context.userId);
  });
