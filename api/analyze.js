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

  const tryModel = async (withImage) => {
    const msgContent = []
    if (withImage && imageBase64) {
      msgContent.push({
        type: 'image_url',
        image_url: { url: `data:${imageMimeType || 'image/jpeg'};base64,${imageBase64}` }
      })
    }
    msgContent.push({ type: 'text', text: userMsg })

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
        max_tokens: 2048,
        temperature: 0.1,
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

  // Fix truncated JSON — close any open strings/arrays/objects
  const fixJson = (str) => {
    try { JSON.parse(str); return str } catch {}
    let fixed = str
    // Count unclosed braces/brackets
    let openBraces = 0, openBrackets = 0, inString = false, escape = false
    for (const ch of fixed) {
      if (escape) { escape = false; continue }
      if (ch === '\\' && inString) { escape = true; continue }
      if (ch === '"') { inString = !inString; continue }
      if (!inString) {
        if (ch === '{') openBraces++
        else if (ch === '}') openBraces--
        else if (ch === '[') openBrackets++
        else if (ch === ']') openBrackets--
      }
    }
    // Close open string
    if (inString) fixed += '"'
    // Close open arrays and objects
    fixed += ']'.repeat(Math.max(0, openBrackets))
    fixed += '}'.repeat(Math.max(0, openBraces))
    try { JSON.parse(fixed); return fixed } catch { return null }
  }

  try {
    let text = await tryModel(true)
    if (!text.trim() && imageBase64) text = await tryModel(false)

    // Extract JSON block
    const jsonMatch = text.match(/\{[\s\S]*/)
    let jsonStr = jsonMatch ? jsonMatch[0] : text

    // Try to fix truncated JSON
    const fixed = fixJson(jsonStr)
    if (!fixed) {
      return res.status(200).json({ error: 'Не вдалось розпарсити відповідь. Спробуй ще раз.' })
    }

    return res.status(200).json({ text: fixed })
  } catch (err) {
    return res.status(500).json({ error: 'Error: ' + err.message })
  }
}
