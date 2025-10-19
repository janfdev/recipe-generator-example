export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { ingredients } = req.body || {};
    if (!ingredients || typeof ingredients !== "string") {
      return res.status(400).json({
        error: 'Field "ingredients" harus berupa string (pisahkan dengan koma).'
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res
        .status(500)
        .json({ error: "Server belum dikonfigurasi GEMINI_API_KEY." });
    }

    // Prompt instruktif: 3 resep, dengan kalori & detail struktur JSON.
    const prompt = `
Anda adalah asisten kuliner. Buatkan 3 rekomendasi masakan berbasis bahan berikut: ${ingredients}.
Wajib:
- Sesuaikan resep agar realistis dengan bahan yang disebut.
- Berikan estimasi kalori total per porsi (angka bulat).
- Sertakan estimasi waktu (menit), daftar bahan, langkah memasak ringkas (5-8 langkah), dan makro (protein, karbohidrat, lemak per porsi).
- Gunakan bahasa Indonesia.
- Kembalikan hanya JSON (tanpa penjelasan lain).

Format JSON:
{
  "dishes": [
    {
      "name": "string",
      "calories": 0,
      "estimatedTimeMinutes": 0,
      "ingredients": ["string", "..."],
      "steps": ["string", "..."],
      "macros": { "protein_g": 0, "carbs_g": 0, "fat_g": 0 }
    },
    ...
  ]
}
    `.trim();

    const body = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
        // Minta JSON murni, mudah diparse:
        response_mime_type: "application/json"
      }
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return res.status(502).json({ error: "Upstream error", detail: errText });
    }

    const json = await upstream.json();

    // Ambil text hasil dari candidates[0].content.parts[*].text
    const text =
      json?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ??
      json?.candidates?.[0]?.content?.parts?.[0]?.text ??
      "";

    // Pastikan valid JSON; kalau tidak valid, coba fallback minimal:
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      // fallback aman: balikan kosong + log text mentah (jangan expose ke client)
      parsed = { dishes: [] };
    }

    return res.status(200).json(parsed);
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
      detail: e?.message || String(e)
    });
  }
}
