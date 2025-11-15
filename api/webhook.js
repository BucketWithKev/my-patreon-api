import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // MUSS der service_role key sein
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const event = req.headers["x-patreon-event"]; 
    const body = req.body;

    if (!body?.data?.id) {
      return res.status(400).json({ error: "Missing member id" });
    }

    const id = body.data.id;
    const full_name = body.data.attributes.full_name ?? null;
    
    const tier = body.included?.find(i => i.type === "tier");
    const tier_name = tier?.attributes?.title ?? null;

    const status = body.data.attributes.patron_status ?? null;

    //
    // 1 — immer löschen, wenn vorhanden
    //
    await supabase
      .from("patrons")
      .delete()
      .eq("id", id);

    //
    // Prüfen, ob wir überhaupt neu einfügen wollen:
    // Wenn Patreon "deleted" sendet, gibt es KEIN tier und KEIN status.
    // Dann einfach nur löschen.
    //
    if (event === "members:delete") {
      return res.status(200).json({ message: "Deleted member", id });
    }

    //
    // 2 — neuen Stand einfügen
    //
    const { error: insertErr } = await supabase
      .from("patrons")
      .insert({
        id,
        full_name,
        tier_name,
        status,
        updated_at: new Date()
      });

    if (insertErr) {
      console.error(insertErr);
      return res.status(500).json({ error: "Insert failed" });
    }

    return res.status(200).json({
      message: "Replaced member entry",
      id,
      status,
      tier_name
    });

  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(500).json({ error: "Server error" });
  }
}
