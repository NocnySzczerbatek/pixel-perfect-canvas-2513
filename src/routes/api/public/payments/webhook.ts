import { createFileRoute } from "@tanstack/react-router";

import { createStripeClient, type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

const ALLOWED_PRICES = new Set(["energy_bottles_3_pln", "energy_chest_pln", "master_ball_pln"]);

async function fulfillSession(sessionLike: any, env: StripeEnv) {
  const stripe = createStripeClient(env);
  const sessionId = sessionLike.id as string | undefined;
  if (!sessionId) return;
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["line_items.data.price"] });
  if (session.payment_status === "unpaid") return;
  const userId = session.metadata?.['userId'];
  const line = session.line_items?.data?.[0];
  const price = line?.price;
  const priceId = price?.lookup_key ?? price?.metadata?.['lovable_external_id'] ?? session.metadata?.['priceId'];
  if (!userId || !priceId || !ALLOWED_PRICES.has(priceId)) throw new Error("Invalid purchase metadata");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? "";
  const { error } = await (supabaseAdmin as any).rpc("fulfill_game_purchase", {
    _owner_id: userId,
    _checkout_session_id: session.id,
    _payment_intent_id: paymentIntentId,
    _price_id: priceId,
    _environment: env,
  });
  if (error) throw error;
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: { handlers: { POST: async ({ request }) => {
    const rawEnv = new URL(request.url).searchParams.get("env");
    if (rawEnv !== "sandbox" && rawEnv !== "live") return Response.json({ received: true, ignored: "invalid env" });
    try {
      const event = await verifyWebhook(request, rawEnv);
      if (["checkout.session.completed", "checkout.session.async_payment_succeeded", "transaction.completed"].includes(event.type)) {
        await fulfillSession(event.data.object, rawEnv);
      }
      return Response.json({ received: true });
    } catch (error) {
      console.error("Payment webhook error", error);
      return new Response("Webhook error", { status: 400 });
    }
  } } },
});