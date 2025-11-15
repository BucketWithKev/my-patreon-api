import { createClient } from "@supabase/supabase-js";

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    // Patreon event header (z.B. "members:create", "members:update", "members:delete")
    const event = req.headers["x-patreon-event"];
    const body = req.body;

    if (!body?.data?.id) {
      return res.status(400).json({ error: "Missing Patreon member ID" });
    }

    const id = body.data.id;
    const full_name = body.data.attributes?.full_name || null;
    const status = body.data.attributes?.patron_status || null;

    // Tier finden
    let tier_name = null;
    const tier = body?.included?.find(i => i.type === "tier");
    if (tier) {
      tier_name = tier.attributes?.title || null;
    }

    // Schritt 1 — immer löschen (falls vorhanden)
    await supabase.from("patrons").delete().eq("id", id);

    // Schritt 2 — falls "members:delete", direkt zurück
    if (event === "members:delete") {
      return res.status(200).json({
        message: "Deleted member",
        id
      });
    }

    // Schritt 3 — neuen Datensatz einfügen
    const { error: insertError } = await supabase
      .from("patrons")
      .insert({
        id,
        full_name,
        tier_name,
        status,
        updated_at: new Date().toISOString()
      });

    if (insertError) {
      console.error(insertError);
      return res.status(500).json({ error: "Insert failed", details: insertError });
    }

    return res.status(200).json({
      message: "Replaced member entry",
      id,
      full_name,
      tier_name,
      status
    });

  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).json({ error: "server error", details: err.toString() });
  }
}

