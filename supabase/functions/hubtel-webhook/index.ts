// Hubtel Payment Callback Edge Function
// Receives payment status updates from Hubtel and updates booking status

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AnyRecord = Record<string, any>;

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

    const { error } = await supabase
      .from("bookings")
      .update(updates)
      .eq("id", reference)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Failed updating booking from webhook", error);
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
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
