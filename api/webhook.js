// api/webhook.js
import { createClient } from "@supabase/supabase-js";

// === Supabase Verbindung ===
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const config = {
  api: { bodyParser: true },
};

// === Hauptfunktion ===
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const event = req.body;
    const type = event.type; // z. B. "members:create", "members:update", "members:delete"
    const member = event.data;

    if (!member || !member.id) {
      return res.status(400).json({ error: "Invalid member data" });
    }

    const memberId = member.id;
    const fullName = member.attributes?.full_name || "Unbekannt";
    const status = member.attributes?.patron_status || "unknown";

    // === Tier-Infos extrahieren ===
    const tierData = member.relationships?.currently_entitled_tiers?.data || [];
    const tierId = tierData[0]?.id || null;

    // Tier-Name & Level aus included-Array holen
    let tierName = null;
    let tierLevel = null;
    if (event.included && tierId) {
      const tierObj = event.included.find(
        (x) => x.id === tierId && x.type === "tier"
      );
      tierName = tierObj?.attributes?.title || null;

      // Optional: Level über Titel ableiten (z. B. "Tier 1", "Tier 2" → 1, 2)
      const match = tierName?.match(/(\d+)/);
      if (match) tierLevel = parseInt(match[1]);
    }

    // === Event-Typ prüfen ===
    if (type === "members:delete" || status === "former_patron") {
      // Eintrag löschen, falls vorhanden
      const { error } = await supabase.from("patrons").delete().eq("id", memberId);
      if (error) throw error;

      console.log(`🗑️ Member ${memberId} gelöscht`);
      return res.status(200).json({ ok: true, action: "deleted" });
    }

    if (type === "members:create" || type === "members:update") {
      // Existiert bereits? → Update, sonst Insert (upsert)
      const { error } = await supabase.from("patrons").upsert({
        id: memberId,
        full_name: fullName,
        tier_id: tierId,
        tier_name: tierName,
        tier_level: tierLevel,
        status,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      console.log(`✅ Member ${memberId} gespeichert (${type})`);
      return res.status(200).json({ ok: true, action: "saved" });
    }

    // Unerwarteter Event-Typ
    console.warn("⚠️ Unbekannter Event-Typ:", type);
    return res.status(200).json({ ok: true, action: "ignored", type });
  } catch (err) {
    console.error("❌ Webhook error:", err);
    return res.status(500).json({ error: err.message });
  }
}
