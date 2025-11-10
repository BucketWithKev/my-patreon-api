export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Only POST requests allowed" });
  }

  console.log("Webhook empfangen:", req.body);

  // Zum Test einfach Erfolg zurückgeben:
  return res.status(200).json({ message: "Webhook received!" });
}

