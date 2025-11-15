// api/patrons.js
import { createClient } from "@supabase/supabase-js";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default async function handler(req, res) {
    try {
        const { data } = await supabase
            .from("patrons")
            .select("id, full_name, tier_name, status");

        const names = data.map(d => d.full_name);
        return res.status(200).json({ patrons: data });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "failed" });
    }
}



