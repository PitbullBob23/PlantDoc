export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY not set in environment variables' })
  }

  let body = req.body
  if (typeof body === 'undefined') {
    try {
      const chunks = []
      for await (const chunk of req) chunks.push(chunk)
      body = JSON.parse(Buffer.concat(chunks).toString())
    } catch (e) {
      return res.status(400).json({ error: 'Failed to parse body: ' + e.message })
    }
  }

  const { prompt, imageBase64, imageMimeType } = body

  const content = []
  if (imageBase64) {
    content.push({
      type: 'image_url',
      image_url: { url: `data:${imageMimeType || 'image/jpeg'};base64,${imageBase64}` }
    })
  }
  content.push({ type: 'text', text: prompt })

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://plantdoc.vercel.app',
        'X-Title': 'PlantDoc'
      },
      body: JSON.stringify({
        model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
        messages: [{ role: 'user', content }],
        max_tokens: 1200,
        temperature: 0.3,
        // Disable reasoning mode so we get clean JSON output
        extra_body: { enable_thinking: false }
      })
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json({ error: `OpenRouter error: ${JSON.stringify(data)}` })
    }

    // Extract text — handle both reasoning and normal responses
    let text = ''
    const message = data.choices?.[0]?.message
    if (message) {
      // Some models return content as array of blocks
      if (Array.isArray(message.content)) {
        text = message.content
          .filter(b => b.type === 'text')
          .map(b => b.text)
          .join('')
      } else {
        text = message.content || ''
      }
      // Also check reasoning_content field
      if (!text && message.reasoning_content) {
        text = message.reasoning_content
      }
    }

    // Extract JSON from text — find first { ... } block
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const clean = jsonMatch ? jsonMatch[0] : text

    return res.status(200).json({ text: clean, raw: text.slice(0, 500) })
  } catch (err) {
    return res.status(500).json({ error: 'Proxy error: ' + err.message })
  }
}
