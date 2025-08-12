// Hubtel Create Payment Edge Function
// Initializes a checkout session and returns a redirect URL

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InitBody {
  bookingId: string;
  amount: number; // In GHS
  fullName?: string;
  email?: string;
  phone?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId, amount, fullName, email, phone } = (await req.json()) as InitBody;

    if (!bookingId || !amount || amount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const HUBTEL_CLIENT_ID = Deno.env.get("HUBTEL_CLIENT_ID") ?? "";
    const HUBTEL_CLIENT_SECRET = Deno.env.get("HUBTEL_CLIENT_SECRET") ?? "";
    const HUBTEL_MERCHANT_NUMBER = Deno.env.get("HUBTEL_MERCHANT_NUMBER") ?? "";

    if (!HUBTEL_CLIENT_ID || !HUBTEL_CLIENT_SECRET || !HUBTEL_MERCHANT_NUMBER) {
      return new Response(JSON.stringify({ error: "Missing Hubtel credentials" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const origin = req.headers.get("origin") || "https://att-transport.local";
    const callbackUrl = `https://llrumtjljzzhvqfxowpb.functions.supabase.co/hubtel-webhook`;

    const auth = "Basic " + btoa(`${HUBTEL_CLIENT_ID}:${HUBTEL_CLIENT_SECRET}`);

    // Build payload for Hubtel Pay Proxy API (Items Initiate)
    const payload: Record<string, unknown> = {
      totalAmount: Math.round(amount * 100) / 100, // Ensure 2dp
      description: `ATT Transport Ticket`,
      callbackUrl,
      returnUrl: `${origin}/`,
      cancellationUrl: `${origin}/`,
      clientReference: bookingId,
      merchantAccountNumber: HUBTEL_MERCHANT_NUMBER,
      // Helpful customer context if supported
      customerName: fullName,
      customerEmail: email,
      customerMsisdn: phone,
      // Optional items – keeping minimal to avoid schema mismatches
      // items: [ { name: "Bus Ticket", quantity: 1, unitPrice: amount, totalPrice: amount } ],
    };

    const res = await fetch("https://payproxyapi.hubtel.com/items/initiate", {
      method: "POST",
      headers: {
        "Authorization": auth,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({} as any));

    // Typical successful response contains responseCode === "0000" and data.checkoutUrl
    const responseCode = (data?.responseCode || data?.ResponseCode) as string | undefined;
    const checkoutUrl = data?.data?.checkoutUrl || data?.Data?.CheckoutUrl;

    if (!res.ok || responseCode !== "0000" || !checkoutUrl) {
      console.error("Hubtel initiate error", { status: res.status, data });
      return new Response(JSON.stringify({ error: "Failed to initiate Hubtel checkout", details: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ url: checkoutUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("hubtel-create-payment exception", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
