import OpenAI from "openai";
import fetch from "node-fetch";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function handler(event) {
  try {
    const body = JSON.parse(event.body || "{}");
    const imageUrl = body.image_url;
    const chatId = body.chat_id;

    if (!imageUrl || !chatId) {
      return { statusCode: 400, body: "Missing image or chat ID" };
    }

    // Send typing action
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action: "typing" })
    });

    // Ask GPT-4o to analyze the chart
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a professional trading AI that analyzes candlestick charts and market trends."
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this chart and say if it indicates a BUY, SELL, or uncertain trend." },
            { type: "image_url", image_url: imageUrl }
          ]
        }
      ]
    });

    const aiText = response.choices[0].message.content || "No result.";

    // Send result to Telegram
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: `📊 *AI Chart Analysis:*\n\n${aiText}`,
        parse_mode: "Markdown"
      })
    });

    return { statusCode: 200, body: "Analysis sent to Telegram" };
  } catch (err) {
    console.error("Error:", err);
    return { statusCode: 500, body: "Internal error: " + err.message };
  }
}
