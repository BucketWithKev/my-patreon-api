// api/webhook.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Only POST");

  try {
    const event = req.body;
    const type = event.type; // e.g. members:create, members:update, members:delete
    const member = event.data;
    const memberId = member.id;
    const status = member.attributes?.patron_status || "unknown";
    const fullName = member.attributes?.full_name || "Unbekannt";

    // Hole alle Tier-IDs
    const tierData = member.relationships?.currently_entitled_tiers?.data || [];
    const tierId = tierData[0]?.id || null;

    // Hole den Tier-Namen aus "included"
    let tierName = null;
    if (event.included && tierId) {
      const tierObj = event.included.find(
        (x) => x.id === tierId && x.type === "tier"
      );
      tierName = tierObj?.attributes?.title || null;
    }

    // Lösche bei members:delete oder wenn kein aktives Tier
    if (type === "members:delete" || !tierId || status === "former_patron") {
      await supabase.from("patrons").delete().eq("id", memberId);
      return res.status(200).json({ ok: true, action: "deleted" });
    }

    // Speichere oder aktualisiere Eintrag
    const { error } = await supabase.from("patrons").upsert({
      id: memberId,
      full_name: fullName,
      tier_id: tierId,
      tier_name: tierName,
      status,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;

    return res.status(200).json({ ok: true, action: "saved" });
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).json({ error: "server error" });
  }
}
