export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not set in environment variables' })
  }

  // Parse body manually (ESM Vercel quirk)
  let body = req.body
  if (typeof body === 'undefined') {
    try {
      const chunks = []
      for await (const chunk of req) chunks.push(chunk)
      body = JSON.parse(Buffer.concat(chunks).toString())
    } catch (e) {
      return res.status(400).json({ error: 'Failed to parse request body: ' + e.message })
    }
  }

  const { prompt, imageBase64, imageMimeType } = body

  // Build Gemini parts
  const parts = []
  if (imageBase64) {
    parts.push({ inlineData: { mimeType: imageMimeType || 'image/jpeg', data: imageBase64 } })
  }
  parts.push({ text: prompt })

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1200 }
        })
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json({ error: `Gemini API error: ${JSON.stringify(data)}` })
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    return res.status(200).json({ text })
  } catch (err) {
    return res.status(500).json({ error: 'Proxy error: ' + err.message })
  }
}
