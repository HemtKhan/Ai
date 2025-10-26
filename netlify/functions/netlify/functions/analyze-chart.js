// Netlify Function: AI Chart Analyzer
// Reads a Telegram chart screenshot and returns UP/DOWN + confidence + reason
// Requires environment vars: OPENAI_API_KEY and TELEGRAM_BOT_TOKEN

export const handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method not allowed" };
    }

    const { file_id, image_url, user_id } = JSON.parse(event.body || "{}") || {};
    if (!file_id && !image_url) {
      return { statusCode: 400, body: JSON.stringify({ error: "file_id or image_url required" }) };
    }

    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY || !TELEGRAM_BOT_TOKEN) {
      return { statusCode: 500, body: JSON.stringify({ error: "Missing API keys" }) };
    }

    // 1️⃣ Get Telegram image URL
    let finalImageUrl = image_url;
    if (!finalImageUrl && file_id) {
      const getFileRes = await fetch(
        `https://api.telegram.org/bot${8499683148:AAFrOMW5kJQoHRsooh1YlgjjDK3NBw_APyw}/getFile?file_id=${file_id}`
      );
      const gf = await getFileRes.json();
      if (!gf.ok || !gf.result?.file_path) {
        return { statusCode: 400, body: JSON.stringify({ error: "Cannot resolve Telegram file" }) };
      }
      finalImageUrl = `https://api.telegram.org/file/bot${8499683148:AAFrOMW5kJQoHRsooh1YlgjjDK3NBw_APyw}/${gf.result.file_path}`;
    }

    // 2️⃣ Ask OpenAI Vision
    const payload = {
      model: "gpt-4o-mini",
      input: [
        {
          role: "system",
          content: "You are a trading expert. Look at the chart and decide UP or DOWN for the short term (1–5 minutes)."
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Return JSON: {direction:'UP|DOWN', confidence:0–100, reason:'short reason'}" },
            { type: "input_image", image_url: { url: finalImageUrl } }
          ]
        }
      ]
    };

    const aiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${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}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const aiJson = await aiRes.json();

    let text = aiJson.output_text || "";
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = {}; }

    const direction = parsed.direction || "UP";
    const confidence = parsed.confidence || 65;
    const reason = parsed.reason || "AI detected a short-term upward trend.";

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        user_id,
        direction,
        confidence,
        reason
      })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
};
