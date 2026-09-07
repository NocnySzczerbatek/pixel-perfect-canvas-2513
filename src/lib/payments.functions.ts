import { createServerFn } from "@tanstack/react-start";
import type Stripe from "stripe";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createStripeClient, getStripeErrorMessage, type StripeEnv } from "@/lib/stripe.server";

const ALLOWED_PRICES = new Set(["energy_bottles_3_pln", "energy_chest_pln", "master_ball_pln"]);

async function resolveOrCreateCustomer(stripe: ReturnType<typeof createStripeClient>, options: { email?: string; userId: string }) {
  if (!/^[a-zA-Z0-9_-]+$/.test(options.userId)) throw new Error("Invalid userId");
  const found = await stripe.customers.search({ query: `metadata['userId']:'${options.userId}'`, limit: 1 });
  if (found.data[0]) return found.data[0].id;
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data[0]) {
      await stripe.customers.update(existing.data[0].id, { metadata: { ...existing.data[0].metadata, userId: options.userId } });
      return existing.data[0].id;
    }
  }
  return (await stripe.customers.create({ ...(options.email && { email: options.email }), metadata: { userId: options.userId } })).id;
}

export const createGameCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { priceId: string; returnUrl: string; environment: StripeEnv }) => {
    if (!ALLOWED_PRICES.has(input.priceId)) throw new Error("Nieznany pakiet.");
    const url = new URL(input.returnUrl);
    if (!/^https?:$/.test(url.protocol)) throw new Error("Nieprawidłowy adres powrotu.");
    if (input.environment !== "sandbox" && input.environment !== "live") throw new Error("Nieprawidłowe środowisko płatności.");
    return input;
  })
  .handler(async ({ data, context }): Promise<{ clientSecret: string } | { error: string }> => {
    // Płatności prawdziwymi pieniędzmi są chwilowo wyłączone w grze.
    if (!PAYMENTS_ENABLED) return { error: "Płatności są chwilowo wyłączone." };
    try {
      const stripe = createStripeClient(data.environment);

      const prices = await stripe.prices.list({ lookup_keys: [data.priceId] });
      const price = prices.data[0];
      if (!price) throw new Error("Nie znaleziono ceny pakietu.");
      const { data: authData } = await context.supabase.auth.getUser();
      const email = authData.user?.email;
      const customer = await resolveOrCreateCustomer(stripe, { userId: context.userId, ...(email && { email }) });
      const productId = typeof price.product === "string" ? price.product : price.product.id;
      const product = await stripe.products.retrieve(productId);
      const params = {
        line_items: [{ price: price.id, quantity: 1 }],
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer,
        managed_payments: { enabled: true },
        payment_intent_data: { description: product.name },
        metadata: { userId: context.userId, priceId: data.priceId },
      } as Stripe.Checkout.SessionCreateParams;
      const session = await stripe.checkout.sessions.create(params);
      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });