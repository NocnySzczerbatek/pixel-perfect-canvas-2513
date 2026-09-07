import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { BonusState } from "@/lib/bonuses";

export const getBonusState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BonusState> => {
    const { bonusStateFor } = await import("@/lib/bonuses.server");
    return bonusStateFor(context.userId);
  });
