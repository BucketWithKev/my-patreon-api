// api/webhook.js

export const config = {
  api: { bodyParser: true },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const event = req.body;
    const type = event.type;

    console.log(req);

    // --- Reaktion auf Event-Typ ---
    if (type === "members:create") {
      return res.status(200).json({ message: "Create Member", code: 1000 });
    }

    if (type === "members:delete") {
      return res.status(200).json({ message: "Delete Member", code: -1000 });
    }

    if (type === "members:update") {
      return res.status(200).json({ message: "Change Member", code: 500 });
    }

    // Fallback falls etwas anderes kommt
    return res.status(200).json({ message: `Unbekannter Event-Typ: ${type}`, code: 0 });
  } catch (err) {
    console.error("❌ Webhook Fehler:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}



