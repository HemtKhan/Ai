// netlify/functions/analyze-chart.js
import fetch from "node-fetch";

export async function handler(event) {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed. Use POST." }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const imageUrl = body.image_url;
    const chatId = body.chat_id;

    if (!imageUrl) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing image_url" }),
      };
    }

    // Call OpenAI to analyze the chart
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

    const aiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: "Analyze this trading chart and say if it's showing a BUY or SELL signal." },
              { type: "input_image", image_url: imageUrl }
            ]
          }
        ]
      }),
    });

    const aiData = await aiResponse.json();
    const aiText = aiData.output_text || "Could not interpret the chart.";

    // Send result back to Telegram (if chat_id provided)
    if (chatId && TELEGRAM_BOT_TOKEN) {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: `📊 AI Analysis Result:\n\n${aiText}`,
        }),
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ result: aiText }),
    };
  } catch (err) {
    console.error("Error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
