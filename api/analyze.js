export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'OPENROUTER_API_KEY not set in environment variables' })

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

  const { systemPrompt, userMsg, imageBase64, imageMimeType } = body

  const content = []
  if (imageBase64) {
    content.push({
      type: 'image_url',
      image_url: { url: `data:${imageMimeType || 'image/jpeg'};base64,${imageBase64}` }
    })
  }
  content.push({ type: 'text', text: userMsg })

  const messages = []
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt })
  messages.push({ role: 'user', content })

  const tryModel = async (withImage) => {
    const msgContent = withImage ? content : [{ type: 'text', text: userMsg }]
    const msgs = []
    if (systemPrompt) msgs.push({ role: 'system', content: systemPrompt })
    msgs.push({ role: 'user', content: msgContent })

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
        messages: msgs,
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
      if (!text.trim() && message.reasoning_content) text = message.reasoning_content
    }
    return text
  }

  try {
    let text = await tryModel(true)
    if (!text.trim() && imageBase64) text = await tryModel(false)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    return res.status(200).json({ text: jsonMatch ? jsonMatch[0] : text })
  } catch (err) {
    return res.status(500).json({ error: 'Error: ' + err.message })
  }
}
