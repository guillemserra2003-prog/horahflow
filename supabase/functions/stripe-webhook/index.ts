// HorahFlow · Webhook de Stripe
// Actualiza el plan del usuario cuando paga, cambia o cancela su suscripción.
// Secretos necesarios: STRIPE_WEBHOOK_SECRET (whsec_...). SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los pone Supabase.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

const enc = new TextEncoder();
async function verify(payload: string, header: string | null, secret: string): Promise<boolean> {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const t = parts["t"];
  const sigs = header.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  if (!t || !sigs.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(`${t}.${payload}`)));
  const hex = [...mac].map((b) => b.toString(16).padStart(2, "0")).join("");
  return sigs.some((s) => s.length === hex.length && timingSafe(s, hex));
}
function timingSafe(a: string, b: string) {
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// lookup_key de los precios: horahflow_pro_monthly, horahflow_pro_yearly, horahflow_business_monthly, horahflow_business_yearly
function planFromSubscription(sub: any): "free" | "pro" | "business" {
  const active = ["active", "trialing", "past_due"].includes(sub.status);
  if (!active) return "free";
  const keys: string[] = (sub.items?.data || []).map((i: any) => i.price?.lookup_key || i.price?.metadata?.plan || "");
  const meta = sub.metadata?.plan || "";
  if (keys.some((k) => k.includes("business")) || meta === "business") return "business";
  if (keys.some((k) => k.includes("pro")) || meta === "pro") return "pro";
  return "pro";
}

async function applyCustomer(customerId: string) {
  const { data: c } = await db.from("stripe_customers").select("*").eq("customer_id", customerId).maybeSingle();
  if (!c) return;
  await db.from("profiles").update({
    plan: c.plan, plan_status: c.status, plan_period_end: c.period_end, stripe_subscription_id: c.subscription_id,
  }).eq("stripe_customer_id", customerId);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const body = await req.text();
  if (!secret || !(await verify(body, req.headers.get("stripe-signature"), secret))) {
    return new Response("firma no válida", { status: 400 });
  }
  const event = JSON.parse(body);
  const { error: dup } = await db.from("stripe_events").insert({ id: event.id, type: event.type });
  if (dup && dup.code === "23505") return new Response("duplicado");

  try {
    const obj = event.data.object;
    switch (event.type) {
      case "checkout.session.completed": {
        const customer = obj.customer as string | null;
        if (!customer) break;
        let userId = obj.client_reference_id as string | null;
        const email = obj.customer_details?.email || obj.customer_email;
        if (!userId && email) {
          const { data } = await db.from("profiles").select("id").ilike("email", email).maybeSingle();
          userId = data?.id ?? null;
        }
        if (!userId) break;
        await db.from("profiles").update({ stripe_customer_id: customer }).eq("id", userId);
        if (obj.subscription) {
          await db.from("stripe_customers").upsert({ customer_id: customer, subscription_id: obj.subscription }, { onConflict: "customer_id", ignoreDuplicates: true });
        }
        await applyCustomer(customer);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const plan = event.type === "customer.subscription.deleted" ? "free" : planFromSubscription(obj);
        const end = obj.current_period_end ?? obj.items?.data?.[0]?.current_period_end;
        await db.from("stripe_customers").upsert({
          customer_id: obj.customer, subscription_id: obj.id, plan, status: obj.status,
          period_end: end ? new Date(end * 1000).toISOString() : null, updated_at: new Date().toISOString(),
        }, { onConflict: "customer_id" });
        await applyCustomer(obj.customer);
        break;
      }
    }
  } catch (e) {
    console.error(e);
    await db.from("stripe_events").delete().eq("id", event.id);
    return new Response("error", { status: 500 });
  }
  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
});
