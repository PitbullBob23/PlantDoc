import React, { useState, useRef, useCallback } from 'react'

const SYSTEM_PROMPT = `You are an expert botanist and plant care specialist. 
IMPORTANT: Write ALL text values in Ukrainian language only.
Use only verified scientific facts. If unsure — say so.
Analyze photos carefully: leaf color, shape, spots, texture, signs of disease or pests.
Be specific and practical.

Respond ONLY with valid JSON, no markdown, no comments:
{
  "plantName": "назва рослини українською",
  "latinName": "Latin species name",
  "overallHealth": "Відмінний | Хороший | Задовільний | Поганий | Критичний",
  "healthScore": number from 0 to 100,
  "issues": [
    { "title": "назва проблеми", "description": "опис українською", "severity": "low|medium|high" }
  ],
  "careAdvice": [
    { "category": "Полив | Світло | Ґрунт | Добрива | Температура | Вологість | Пересадка | Шкідники", "advice": "конкретна порада українською" }
  ],
  "urgentAction": "термінова дія українською або null",
  "funFact": "цікавий факт про цю рослину українською"
}`

const severityColor = { low: '#4caf72', medium: '#e09052', high: '#e05252' }
const severityLabel = { low: 'Незначна', medium: 'Помірна', high: 'Критична' }
const categoryIcon = {
  'Полив': '💧', 'Світло': '☀️', 'Ґрунт': '🪨', 'Добрива': '🌿',
  'Температура': '🌡️', 'Вологість': '💦', 'Пересадка': '🪴', 'Шкідники': '🐛'
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --green-deep: #0a1a0f;
    --green-dark: #0f2818;
    --green-mid: #1a4a2a;
    --green-accent: #2d7a47;
    --green-bright: #4caf72;
    --green-glow: #6fcf8f;
    --cream: #f0ead6;
    --cream-dim: #c8bfa0;
    --gold: #c9a84c;
    --red: #e05252;
    --orange: #e09052;
  }
  body { font-family: 'DM Sans', sans-serif; background: var(--green-deep); color: var(--cream); min-height: 100vh; overflow-x: hidden; }
  .app { min-height: 100vh; display: flex; flex-direction: column; position: relative; }
  .bg-pattern {
    position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background:
      radial-gradient(ellipse 80% 60% at 20% 10%, rgba(45,122,71,0.15) 0%, transparent 60%),
      radial-gradient(ellipse 60% 80% at 80% 90%, rgba(15,40,24,0.8) 0%, transparent 70%),
      repeating-linear-gradient(60deg, transparent, transparent 80px, rgba(45,122,71,0.03) 80px, rgba(45,122,71,0.03) 81px);
  }
  header { padding: 1.5rem 2rem; position: relative; z-index: 1; border-bottom: 1px solid rgba(76,175,114,0.15); display: flex; align-items: center; gap: 0.75rem; }
  .logo-text { font-family: 'Instrument Serif', serif; font-size: 1.8rem; color: var(--green-glow); letter-spacing: -0.02em; }
  .logo-sub { font-size: 0.7rem; color: var(--cream-dim); letter-spacing: 0.15em; text-transform: uppercase; font-weight: 300; }
  .main { flex: 1; max-width: 820px; margin: 0 auto; width: 100%; padding: 2rem; position: relative; z-index: 1; }
  .upload-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-bottom: 1.5rem; }
  @media (max-width: 600px) { .upload-grid { grid-template-columns: 1fr; } .care-grid { grid-template-columns: 1fr !important; } }
  .drop-zone {
    border: 2px dashed rgba(76,175,114,0.3); border-radius: 14px; cursor: pointer;
    transition: all 0.3s; background: rgba(10,26,15,0.5);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    min-height: 200px; position: relative; overflow: hidden;
  }
  .drop-zone:hover, .drop-zone.drag-over { border-color: var(--green-bright); background: rgba(45,122,71,0.1); }
  .drop-zone img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; border-radius: 12px; }
  .drop-icon { font-size: 2.5rem; margin-bottom: 0.75rem; opacity: 0.5; }
  .drop-text { color: var(--cream-dim); font-size: 0.85rem; text-align: center; line-height: 1.6; }
  .controls { display: flex; flex-direction: column; gap: 0.75rem; }
  .input-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--cream-dim); margin-bottom: 0.4rem; display: block; }
  .input-field { width: 100%; padding: 0.7rem 0.9rem; background: rgba(15,40,24,0.8); border: 1px solid rgba(76,175,114,0.2); border-radius: 8px; color: var(--cream); font-family: 'DM Sans', sans-serif; font-size: 0.9rem; outline: none; transition: border-color 0.2s; }
  .input-field:focus { border-color: var(--green-bright); }
  .input-field::placeholder { color: rgba(200,191,160,0.4); }
  .btn { padding: 0.8rem; border: none; border-radius: 10px; font-family: 'DM Sans', sans-serif; font-weight: 500; font-size: 0.9rem; cursor: pointer; transition: all 0.25s; }
  .btn-primary { background: linear-gradient(135deg, var(--green-accent), var(--green-bright)); color: var(--green-deep); }
  .btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(76,175,114,0.3); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .btn-secondary { background: transparent; border: 1px solid rgba(76,175,114,0.2) !important; color: var(--cream-dim); font-size: 0.8rem; }
  .btn-secondary:hover { border-color: rgba(76,175,114,0.4) !important; color: var(--cream); }

  /* Results */
  .results { display: flex; flex-direction: column; gap: 1.25rem; animation: fadeIn 0.4s ease; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  .card { background: rgba(15,40,24,0.5); border: 1px solid rgba(76,175,114,0.12); border-radius: 14px; padding: 1.5rem; }
  .section-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.12em; color: var(--green-glow); opacity: 0.7; margin-bottom: 1rem; }
  .health-card { display: flex; align-items: center; gap: 1.5rem; }
  .plant-name { font-family: 'Instrument Serif', serif; font-size: 1.6rem; margin-bottom: 0.25rem; }
  .plant-latin { font-style: italic; font-size: 0.8rem; color: var(--cream-dim); opacity: 0.6; margin-bottom: 0.75rem; }
  .health-badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; letter-spacing: 0.05em; }
  .urgent-box { margin-top: 0.75rem; padding: 0.75rem 1rem; background: rgba(224,82,82,0.08); border: 1px solid rgba(224,82,82,0.2); border-radius: 8px; font-size: 0.85rem; color: #f87171; }
  .issue-row { display: flex; gap: 0.75rem; align-items: flex-start; padding: 0.75rem 0; border-bottom: 1px solid rgba(76,175,114,0.08); }
  .issue-row:last-child { border-bottom: none; padding-bottom: 0; }
  .issue-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; }
  .issue-title { font-weight: 500; font-size: 0.95rem; margin-bottom: 0.2rem; }
  .issue-desc { font-size: 0.82rem; color: var(--cream-dim); line-height: 1.5; }
  .issue-sev { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.08em; flex-shrink: 0; margin-top: 2px; font-weight: 500; }
  .care-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
  .care-item { background: rgba(10,26,15,0.6); border: 1px solid rgba(76,175,114,0.1); border-radius: 10px; padding: 0.85rem; }
  .care-cat { font-size: 0.7rem; color: var(--green-glow); opacity: 0.8; margin-bottom: 0.3rem; }
  .care-advice { font-size: 0.82rem; color: var(--cream-dim); line-height: 1.5; }
  .fun-fact { background: rgba(45,122,71,0.08); border: 1px solid rgba(76,175,114,0.12); border-radius: 12px; padding: 1rem 1.25rem; display: flex; gap: 0.75rem; font-size: 0.85rem; color: var(--cream-dim); line-height: 1.6; font-style: italic; }
  .empty-state { text-align: center; padding: 4rem 1rem; opacity: 0.35; }
  .empty-icon { font-size: 4rem; margin-bottom: 1rem; }
  .empty-text { font-size: 1rem; margin-bottom: 0.5rem; }
  .empty-sub { font-size: 0.8rem; }
  .loading-skeleton { display: flex; flex-direction: column; gap: 1rem; }
  .skeleton { height: 80px; background: rgba(76,175,114,0.05); border-radius: 12px; animation: pulse 1.5s ease-in-out infinite; }
  @keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }
  .error-box { background: rgba(224,82,82,0.08); border: 1px solid rgba(224,82,82,0.25); border-radius: 12px; padding: 1rem 1.25rem; color: #f87171; font-size: 0.875rem; margin-bottom: 1.25rem; }
  footer { padding: 1rem 2rem; border-top: 1px solid rgba(76,175,114,0.08); text-align: center; font-size: 0.65rem; color: var(--cream-dim); opacity: 0.3; position: relative; z-index: 1; }
`

function HealthRing({ score }) {
  const r = 48, c = 2 * Math.PI * r
  const dash = (score / 100) * c
  const color = score >= 70 ? '#4caf72' : score >= 40 ? '#e09052' : '#e05252'
  return (
    <svg width="120" height="120" style={{ flexShrink: 0 }}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="9" />
      <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="9"
        strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
        transform="rotate(-90 60 60)"
        style={{ transition: 'stroke-dasharray 1s ease' }} />
      <text x="60" y="56" textAnchor="middle" fill={color} fontSize="24" fontWeight="700" fontFamily="DM Sans, sans-serif">{score}</text>
      <text x="60" y="72" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="10" fontFamily="DM Sans, sans-serif">/100</text>
    </svg>
  )
}

export default function PlantDoc() {
  const [plantName, setPlantName] = useState('')
  const [image, setImage] = useState(null)
  const [imageBase64, setImageBase64] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef()

  const processFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return
    setImage(URL.createObjectURL(file))
    setResult(null)
    setError(null)
    const reader = new FileReader()
    reader.onload = (e) => setImageBase64(e.target.result.split(',')[1])
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    processFile(e.dataTransfer.files[0])
  }, [processFile])

  const reset = () => { setImage(null); setImageBase64(null); setResult(null); setError(null); setPlantName('') }

  const analyze = async () => {
    if (!imageBase64 && !plantName) return
    setLoading(true); setError(null); setResult(null)

    const userMsg = plantName
      ? `Plant name: ${plantName}. ${imageBase64 ? 'Analyze its condition from the photo and give care advice.' : 'Give detailed care advice for this plant.'}`
      : 'Identify this plant from the photo, analyze its condition and give care advice.'

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: SYSTEM_PROMPT,
          userMsg,
          imageBase64: imageBase64 || null,
          imageMimeType: 'image/jpeg'
        })
      })
      const data = await res.json()
      if (!res.ok || data.error) { setError(data.error || 'Помилка сервера'); setLoading(false); return }
      const clean = (data.text || '{}').replace(/```json|```/g, '').trim()
      const jsonMatch = clean.match(/\{[\s\S]*\}/)
      setResult(JSON.parse(jsonMatch ? jsonMatch[0] : clean))
    } catch (e) {
      setError('Мережева помилка: ' + e.message)
    }
    setLoading(false)
  }

  const score = result?.healthScore || 0
  const scoreColor = score >= 70 ? '#4caf72' : score >= 40 ? '#e09052' : '#e05252'

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        <div className="bg-pattern" />
        <header>
          <span style={{ fontSize: '1.8rem' }}>🌿</span>
          <div>
            <div className="logo-text">PlantDoc</div>
            <div className="logo-sub">Діагностика рослин · перевірені факти</div>
          </div>
        </header>

        <div className="main">
          <div className="upload-grid">
            {/* Drop zone */}
            <div
              className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              style={{ gridColumn: image ? '1' : '1 / -1' }}
            >
              {image
                ? <img src={image} alt="plant" />
                : <>
                    <div className="drop-icon">📷</div>
                    <div className="drop-text">Завантаж фото рослини<br /><span style={{ fontSize: '0.75rem', opacity: 0.6 }}>перетягни або натисни</span></div>
                  </>
              }
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => processFile(e.target.files[0])} />
            </div>

            {/* Controls — show when image loaded OR always show name input */}
            {image && (
              <div className="controls">
                <div>
                  <label className="input-label">Назва рослини (необов'язково)</label>
                  <input className="input-field" type="text" placeholder="напр. Монстера, Фікус..." value={plantName} onChange={e => setPlantName(e.target.value)} />
                </div>
                <button className="btn btn-primary" onClick={analyze} disabled={loading}>
                  {loading ? '⏳ Аналізую...' : '🔍 Діагностувати'}
                </button>
                <button className="btn btn-secondary" style={{ border: '' }} onClick={reset}>
                  ↩ Інше фото
                </button>
              </div>
            )}

            {/* No image — show name-only mode */}
            {!image && (
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label className="input-label">Або введи назву рослини без фото</label>
                  <input className="input-field" type="text" placeholder="напр. Фіолетова калла, Фікус..." value={plantName} onChange={e => setPlantName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && plantName && analyze()} />
                </div>
                <button className="btn btn-primary" style={{ whiteSpace: 'nowrap', padding: '0.7rem 1.2rem' }} onClick={analyze} disabled={loading || !plantName}>
                  {loading ? '⏳' : '🔍 Діагностувати'}
                </button>
              </div>
            )}
          </div>

          {error && <div className="error-box">⚠️ {error}</div>}

          {loading && (
            <div className="loading-skeleton">
              {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ animationDelay: `${i * 0.15}s`, height: i === 1 ? '120px' : '80px' }} />)}
            </div>
          )}

          {result && (
            <div className="results">
              {/* Health card */}
              <div className="card health-card">
                <HealthRing score={result.healthScore || 0} />
                <div style={{ flex: 1 }}>
                  <div className="plant-name">{result.plantName || 'Рослина'}</div>
                  {result.latinName && <div className="plant-latin">{result.latinName}</div>}
                  <span className="health-badge" style={{
                    background: `${scoreColor}18`,
                    color: scoreColor,
                    border: `1px solid ${scoreColor}40`
                  }}>
                    {result.overallHealth}
                  </span>
                  {result.urgentAction && (
                    <div className="urgent-box">🚨 <strong>Терміново:</strong> {result.urgentAction}</div>
                  )}
                </div>
              </div>

              {/* Issues */}
              {result.issues?.length > 0 && (
                <div className="card">
                  <div className="section-label">Виявлені проблеми</div>
                  {result.issues.map((issue, i) => (
                    <div key={i} className="issue-row">
                      <div className="issue-dot" style={{ background: severityColor[issue.severity] }} />
                      <div style={{ flex: 1 }}>
                        <div className="issue-title">{issue.title}</div>
                        <div className="issue-desc">{issue.description}</div>
                      </div>
                      <div className="issue-sev" style={{ color: severityColor[issue.severity] }}>
                        {severityLabel[issue.severity]}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Care advice */}
              {result.careAdvice?.length > 0 && (
                <div className="card">
                  <div className="section-label">Поради по догляду</div>
                  <div className="care-grid">
                    {result.careAdvice.map((c, i) => (
                      <div key={i} className="care-item">
                        <div className="care-cat">{categoryIcon[c.category] || '🌱'} {c.category}</div>
                        <div className="care-advice">{c.advice}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fun fact */}
              {result.funFact && (
                <div className="fun-fact">
                  <span>🌱</span>
                  <span>{result.funFact}</span>
                </div>
              )}
            </div>
          )}

          {!image && !loading && !result && !plantName && (
            <div className="empty-state">
              <div className="empty-icon">🪴</div>
              <div className="empty-text">Завантаж фото або введи назву рослини</div>
              <div className="empty-sub">Визначу вид, оціню здоров'я та дам поради по догляду</div>
            </div>
          )}
        </div>
        <footer>PlantDoc — AI діагностика кімнатних рослин</footer>
      </div>
    </>
  )
}
