// Hubtel Payment Callback Edge Function
// Receives payment status updates from Hubtel and updates booking status

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AnyRecord = Record<string, any>;

function normalizeGhanaMsisdn(input: string | null | undefined): string | null {
  if (!input) return null;
  const digits = String(input).replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) {
    return digits.substring(1);
  }
  if (digits.startsWith("233")) return digits;
  if (digits.startsWith("0") && digits.length >= 10) {
    return "233" + digits.substring(1);
  }
  return digits;
}

async function sendSmsViaHubtel(to: string, content: string): Promise<void> {
  try {
    const id = Deno.env.get("HUBTEL_SMS_CLIENT_ID") ?? Deno.env.get("HUBTEL_CLIENT_ID") ?? "";
    const secret = Deno.env.get("HUBTEL_SMS_CLIENT_SECRET") ?? Deno.env.get("HUBTEL_CLIENT_SECRET") ?? "";
    const from = Deno.env.get("HUBTEL_SMS_FROM") ?? "ATTTransport";
    if (!id || !secret) {
      console.warn("Hubtel SMS credentials missing");
      return;
    }
    const auth = "Basic " + btoa(`${id}:${secret}`);
    const res = await fetch("https://sms.hubtel.com/v1/messages/send", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ From: from, To: to, Content: content }),
    });
    const data = await res.json().catch(() => ({} as AnyRecord));
    if (!res.ok || (data?.status && data.status !== 0 && data.Status !== 0)) {
      console.error("Hubtel SMS send error", { status: res.status, data });
    } else {
      console.log("Hubtel SMS sent", { to });
    }
  } catch (e) {
    console.error("Hubtel SMS exception", e);
  }
}

async function sendPaidConfirmationSms(supabase: ReturnType<typeof createClient>, bookingId: string, booking: AnyRecord | null) {
  try {
    let b = booking;
    if (!b) {
      const { data } = await supabase
        .from("bookings")
        .select("id, full_name, phone, seat_number, destination_id, pickup_point_id, bus_id, amount")
        .eq("id", bookingId)
        .maybeSingle();
      b = data as AnyRecord | null;
    }
    if (!b?.phone) return;

    const to = normalizeGhanaMsisdn(String(b.phone));
    if (!to) return;

    const [dest, pick, bus] = await Promise.all([
      b.destination_id ? supabase.from("destinations").select("name").eq("id", b.destination_id).maybeSingle() : Promise.resolve({ data: null } as any),
      b.pickup_point_id ? supabase.from("pickup_points").select("name").eq("id", b.pickup_point_id).maybeSingle() : Promise.resolve({ data: null } as any),
      b.bus_id ? supabase.from("buses").select("name").eq("id", b.bus_id).maybeSingle() : Promise.resolve({ data: null } as any),
    ]);

    const destName = (dest as any)?.data?.name || "";
    const pickName = (pick as any)?.data?.name || "";
    const busName = (bus as any)?.data?.name || "";
    const ref = bookingId.slice(0, 8);
    const seat = b.seat_number ? `Seat ${b.seat_number}` : "";
    const amount = typeof b.amount === "number" ? `GHS ${Number(b.amount).toFixed(2)}` : "";
    const route = [pickName, destName].filter(Boolean).join(" -> ");
    const parts = [
      "ATT Transport: Payment confirmed.",
      route ? route + "." : "",
      seat ? seat + "." : "",
      amount ? amount + "." : "",
      `Ref: ${ref}.`,
      "Show SMS at boarding.",
    ].filter(Boolean);
    const msg = parts.join(" ").slice(0, 300);

    await sendSmsViaHubtel(to, msg);
  } catch (e) {
    console.error("sendPaidConfirmationSms exception", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    let payload: AnyRecord = {};
    try {
      payload = await req.json();
    } catch (_) {
      // Some providers send form-encoded; ignore for now
    }

    // Normalize keys
    const status = payload.status || payload.Status || payload.transactionStatus || payload.TransactionStatus;
    const reference = payload.clientReference || payload.ClientReference || payload.checkoutId || payload.CheckoutId;
    const transactionId = payload.transactionId || payload.TransactionId;
    const receiptUrl = payload.receiptUrl || payload.ReceiptUrl || payload.receiptURL;

    if (!reference) {
      console.warn("Hubtel webhook called without reference", payload);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    const paidStates = ["Success", "Successful", "Completed", "PAID", "Paid"];
    const isPaid = typeof status === "string" && paidStates.includes(status);

    const updates: AnyRecord = { payment_reference: transactionId ?? reference };
    if (isPaid) updates.status = "paid";
    if (receiptUrl) updates.receipt_url = receiptUrl;

    const { data: updated, error } = await supabase
      .from("bookings")
      .update(updates)
      .eq("id", reference)
      .select("id, full_name, phone, seat_number, destination_id, pickup_point_id, bus_id, amount")
      .maybeSingle();

    if (error) {
      console.error("Failed updating booking from webhook", error);
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (isPaid && updated) {
      try {
        EdgeRuntime.waitUntil(sendPaidConfirmationSms(supabase as any, updated.id as string, updated as AnyRecord));
      } catch (e) {
        console.error("Failed scheduling SMS task", e);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("hubtel-webhook exception", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
