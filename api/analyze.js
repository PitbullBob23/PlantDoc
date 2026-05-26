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

  // Try with image first, fallback to text-only if image fails
  const tryRequest = async (withImage) => {
    const content = []
    if (withImage && imageBase64) {
      content.push({
        type: 'image_url',
        image_url: { url: `data:${imageMimeType || 'image/jpeg'};base64,${imageBase64}` }
      })
    }
    content.push({ type: 'text', text: prompt })

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
        max_tokens: 1500,
        temperature: 0.2,
      })
    })

    const data = await response.json()
    if (!response.ok) throw new Error(JSON.stringify(data))

    const message = data.choices?.[0]?.message
    let text = ''

    if (message) {
      if (Array.isArray(message.content)) {
        text = message.content.filter(b => b.type === 'text').map(b => b.text).join('')
      } else if (typeof message.content === 'string') {
        text = message.content
      }
      // Nemotron reasoning models put answer in reasoning_content
      if (!text.trim() && message.reasoning_content) {
        text = message.reasoning_content
      }
    }

    return text
  }

  try {
    // First try with image
    let text = await tryRequest(true)

    // If empty and we had an image, retry text-only
    if (!text.trim() && imageBase64) {
      text = await tryRequest(false)
    }

    // Extract JSON block
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const clean = jsonMatch ? jsonMatch[0] : text

    return res.status(200).json({ text: clean })
  } catch (err) {
    return res.status(500).json({ error: 'Error: ' + err.message })
  }
}
