// api/webhook.js
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PATREON_WEBHOOK_SECRET = process.env.PATREON_WEBHOOK_SECRET;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Only POST");

  try {
    const event = req.body;
    const member = event.data;
    if (!member) throw new Error("No member data received");

    const memberId = member.id;
    const status =
      member.attributes?.patron_status ||
      member.attributes?.status ||
      "unknown";
    const fullName = member.attributes?.full_name || "Unbekannt";

    const tier = member.relationships?.currently_entitled_tiers?.data?.[0];
    const tierId = tier?.id || null;
    const tierName = tier?.attributes?.title || null;

    console.log("Patreon event received:", {
      id: memberId,
      fullName,
      tierId,
      tierName,
      status,
    });

    // Speichere oder aktualisiere den Patron
    await supabase.from("patrons").upsert({
      id: memberId,
      full_name: fullName,
      tier_id: tierId,
      tier_name: tierName,
      status,
      updated_at: new Date().toISOString(),
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).json({ error: "server error" });
  }
}
