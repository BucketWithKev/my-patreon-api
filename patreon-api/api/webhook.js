// api/webhook.js
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PATREON_WEBHOOK_SECRET = process.env.PATREON_WEBHOOK_SECRET;
const ALLOWED_TIER_IDS = (process.env.ALLOWED_TIER_IDS || "").split(","); // z.B. "999,1000"

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).end("Only POST");

    const event = req.body;
    try {
        const member = event.data;
        const memberId = member.id;
        const status = member.attributes?.patron_status || member.attributes?.status || "unknown";

        const tierIds = (member.relationships?.currently_entitled_tiers?.data || []).map(t => t.id);

        const fullName = member.attributes?.full_name || "Unbekannt";

        const allowed = tierIds.some(id => ALLOWED_TIER_IDS.includes(id));

        if ((status === "active_patron" || status === "active") && allowed) {
            await supabase.from("patrons").upsert({
                id: memberId,
                full_name: fullName,
                tier_id: tierIds[0] || null,
                status,
                updated_at: new Date().toISOString()
            });
        } else {
            await supabase.from("patrons").delete().eq("id", memberId);
        }

        return res.status(200).json({ ok: true });
    } catch (err) {
        console.error("Webhook error:", err);
        return res.status(500).json({ error: "server error" });
    }
}
