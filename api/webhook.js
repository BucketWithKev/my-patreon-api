// api/webhook.js
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Only POST" });

  try {
    const event = req.body;
    console.log("Full webhook body:", JSON.stringify(event, null, 2));

    // Patreon sendet meist event.data — falls nicht vorhanden, nimm event selbst
    const member = event.data || event;

    // Memberdaten
    const memberId = member.id;
    const fullName = member.attributes?.full_name || "Unbekannt";
    const status = member.attributes?.patron_status || member.attributes?.status || "unknown";

    // Tier-Infos (kann leer sein, wenn kein aktiver Tier)
    const tiers = member.relationships?.currently_entitled_tiers?.data || [];
    const tierId = tiers[0]?.id || null;
    const tierName = member.attributes?.currently_entitled_tiers?.[0]?.title || null;

    // 🧠 Upsert (insert or update)
    const { error } = await supabase.from("patrons").upsert({
      id: memberId,
      full_name: fullName,
      tier_id: tierId,
      tier_name: tierName,
      status,
    });

    if (error) {
      console.error("Supabase insert error:", error);
      return res.status(500).json({ error: "db_failed" });
    }

    console.log(`✅ Patreon member stored: ${fullName} (${memberId})`);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).json({ error: "failed" });
  }
}
