const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  try {
    const event = req.headers["x-patreon-event"];
    const body = req.body;

    if (!body?.data?.id) {
      return res.status(400).json({ error: "Missing member id" });
    }

    const id = body.data.id;
    const full_name = body.data.attributes.full_name || null;

    const tier = body.included?.find(i => i.type === "tier");
    const tier_name = tier?.attributes?.title || null;

    const status = body.data.attributes.patron_status || null;

    // 1 — immer löschen
    await supabase.from("patrons").delete().eq("id", id);

    // 2 — Wenn Patreon "delete" sendet → NICHT neu einfügen
    if (event === "members:delete") {
      return res.status(200).json({ message: "Deleted member", id });
    }

    // 3 — neuen Stand einfügen
    const { error: insertError } = await supabase
      .from("patrons")
      .insert({
        id,
        full_name,
        tier_name,
        status,
        updated_at: new Date()
      });

    if (insertError) {
      console.error(insertError);
      return res.status(500).json({ error: "Insert failed" });
    }

    return res.status(200).json({
      message: "Replaced member entry",
      id,
      status,
      tier_name
    });

  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).json({ error: "server error" });
  }
};
