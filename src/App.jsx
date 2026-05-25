import React, { useState, useRef, useCallback } from 'react'

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

  body {
    font-family: 'DM Sans', sans-serif;
    background: var(--green-deep);
    color: var(--cream);
    min-height: 100vh;
    overflow-x: hidden;
  }

  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .bg-pattern {
    position: fixed;
    inset: 0;
    background:
      radial-gradient(ellipse 80% 60% at 20% 10%, rgba(45,122,71,0.15) 0%, transparent 60%),
      radial-gradient(ellipse 60% 80% at 80% 90%, rgba(15,40,24,0.8) 0%, transparent 70%),
      repeating-linear-gradient(
        60deg,
        transparent,
        transparent 80px,
        rgba(45,122,71,0.03) 80px,
        rgba(45,122,71,0.03) 81px
      );
    pointer-events: none;
    z-index: 0;
  }

  header {
    padding: 2rem 2rem 1rem;
    position: relative;
    z-index: 1;
    border-bottom: 1px solid rgba(76,175,114,0.15);
  }

  .logo {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }

  .logo-text {
    font-family: 'Instrument Serif', serif;
    font-size: 2rem;
    color: var(--green-glow);
    letter-spacing: -0.02em;
  }

  .logo-sub {
    font-size: 0.75rem;
    color: var(--cream-dim);
    letter-spacing: 0.15em;
    text-transform: uppercase;
    font-weight: 300;
  }

  .main {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
    position: relative;
    z-index: 1;
  }

  @media (max-width: 768px) {
    .main { grid-template-columns: 1fr; }
  }

  .panel {
    padding: 2rem;
    border-right: 1px solid rgba(76,175,114,0.12);
  }

  .panel:last-child { border-right: none; }

  .panel-title {
    font-family: 'Instrument Serif', serif;
    font-size: 1.1rem;
    color: var(--green-glow);
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .drop-zone {
    border: 2px dashed rgba(76,175,114,0.3);
    border-radius: 12px;
    aspect-ratio: 4/3;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;
    background: rgba(10,26,15,0.5);
    position: relative;
    overflow: hidden;
  }

  .drop-zone:hover, .drop-zone.drag-over {
    border-color: var(--green-bright);
    background: rgba(45,122,71,0.1);
  }

  .drop-zone img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 10px;
  }

  .drop-icon {
    font-size: 2.5rem;
    margin-bottom: 0.75rem;
    opacity: 0.6;
  }

  .drop-text {
    color: var(--cream-dim);
    font-size: 0.85rem;
    text-align: center;
    line-height: 1.5;
  }

  .drop-hint {
    font-size: 0.7rem;
    opacity: 0.5;
    margin-top: 0.25rem;
  }

  .input-group {
    margin-top: 1.5rem;
  }

  .input-label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--cream-dim);
    margin-bottom: 0.5rem;
    display: block;
  }

  .input-field {
    width: 100%;
    padding: 0.75rem 1rem;
    background: rgba(15,40,24,0.8);
    border: 1px solid rgba(76,175,114,0.2);
    border-radius: 8px;
    color: var(--cream);
    font-family: 'DM Sans', sans-serif;
    font-size: 0.9rem;
    outline: none;
    transition: border-color 0.2s;
  }

  .input-field:focus {
    border-color: var(--green-bright);
  }

  .input-field::placeholder { color: rgba(200,191,160,0.4); }

  .diagnose-btn {
    width: 100%;
    margin-top: 1.5rem;
    padding: 0.9rem;
    background: linear-gradient(135deg, var(--green-accent), var(--green-bright));
    border: none;
    border-radius: 10px;
    color: var(--green-deep);
    font-family: 'DM Sans', sans-serif;
    font-weight: 500;
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.25s ease;
    letter-spacing: 0.02em;
  }

  .diagnose-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(76,175,114,0.35);
  }

  .diagnose-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .result-area {
    min-height: 300px;
    position: relative;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 300px;
    opacity: 0.4;
    text-align: center;
  }

  .empty-icon { font-size: 3rem; margin-bottom: 1rem; }
  .empty-text { font-size: 0.85rem; color: var(--cream-dim); line-height: 1.6; }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 300px;
    gap: 1rem;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 2px solid rgba(76,175,114,0.2);
    border-top-color: var(--green-bright);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .loading-text {
    color: var(--cream-dim);
    font-size: 0.85rem;
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }

  .result-content {
    animation: fadeIn 0.4s ease;
  }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

  .result-section {
    margin-bottom: 1.5rem;
  }

  .result-section-title {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--green-glow);
    margin-bottom: 0.75rem;
    opacity: 0.8;
  }

  .plant-name {
    font-family: 'Instrument Serif', serif;
    font-size: 1.5rem;
    color: var(--cream);
    margin-bottom: 0.25rem;
  }

  .plant-latin {
    font-style: italic;
    font-size: 0.8rem;
    color: var(--cream-dim);
    opacity: 0.7;
  }

  .issues-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .issue-card {
    padding: 0.85rem 1rem;
    border-radius: 8px;
    border-left: 3px solid;
    background: rgba(10,26,15,0.6);
    font-size: 0.85rem;
    line-height: 1.5;
  }

  .issue-card.high { border-color: var(--red); }
  .issue-card.medium { border-color: var(--orange); }
  .issue-card.low { border-color: var(--green-bright); }

  .issue-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.25rem;
  }

  .issue-name { font-weight: 500; color: var(--cream); }

  .severity-badge {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 0.15rem 0.5rem;
    border-radius: 20px;
    font-weight: 500;
  }

  .severity-badge.high { background: rgba(224,82,82,0.2); color: var(--red); }
  .severity-badge.medium { background: rgba(224,144,82,0.2); color: var(--orange); }
  .severity-badge.low { background: rgba(76,175,114,0.2); color: var(--green-bright); }

  .issue-desc { color: var(--cream-dim); }

  .care-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }

  .care-item {
    padding: 0.75rem;
    background: rgba(15,40,24,0.6);
    border-radius: 8px;
    border: 1px solid rgba(76,175,114,0.1);
  }

  .care-icon { font-size: 1.1rem; margin-bottom: 0.25rem; }
  .care-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--green-glow); opacity: 0.7; }
  .care-value { font-size: 0.8rem; color: var(--cream-dim); margin-top: 0.15rem; line-height: 1.4; }

  .urgent-box {
    padding: 1rem;
    background: rgba(224,82,82,0.08);
    border: 1px solid rgba(224,82,82,0.25);
    border-radius: 10px;
    font-size: 0.85rem;
    line-height: 1.6;
    color: var(--cream-dim);
  }

  .urgent-box strong { color: var(--red); display: block; margin-bottom: 0.35rem; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.08em; }

  .api-warning {
    padding: 1rem;
    background: rgba(201,168,76,0.08);
    border: 1px solid rgba(201,168,76,0.25);
    border-radius: 10px;
    font-size: 0.8rem;
    color: var(--gold);
    line-height: 1.5;
    margin-bottom: 1rem;
  }

  .divider {
    height: 1px;
    background: rgba(76,175,114,0.12);
    margin: 1.25rem 0;
  }

  footer {
    padding: 1rem 2rem;
    border-top: 1px solid rgba(76,175,114,0.1);
    text-align: center;
    font-size: 0.7rem;
    color: var(--cream-dim);
    opacity: 0.4;
    position: relative;
    z-index: 1;
  }
`

function PlantDoc() {
  const [image, setImage] = useState(null)
  const [imageBase64, setImageBase64] = useState(null)
  const [plantName, setPlantName] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef()

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    setImage(url)
    const reader = new FileReader()
    reader.onload = (e) => setImageBase64(e.target.result.split(',')[1])
    reader.readAsDataURL(file)
    setResult(null)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }, [handleFile])

  const diagnose = async () => {
    if (!imageBase64 && !plantName) return
    setLoading(true)
    setResult(null)

    const prompt = `Ти — ботанічний експерт і фітопатолог. ${plantName ? `Рослина: ${plantName}.` : 'Визнач вид рослини.'}
${imageBase64 ? 'Уважно проаналізуй фото.' : 'Надай загальні рекомендації.'}

Відповідай ТІЛЬКИ валідним JSON (без коментарів, без markdown):
{
  "name": "Назва рослини українською",
  "latin": "Латинська назва",
  "issues": [
    { "name": "Назва проблеми", "severity": "high|medium|low", "description": "Опис 1-2 речення" }
  ],
  "care": {
    "water": "Режим поливу",
    "light": "Освітлення",
    "soil": "Ґрунт",
    "humidity": "Вологість",
    "temp": "Температура",
    "fertilizer": "Підживлення"
  },
  "urgent": "Найтерміновіша дія або null якщо всe добре",
  "overall": "good|warning|critical"
}`

    const messages = [
      {
        role: 'user',
        content: imageBase64
          ? [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
              { type: 'text', text: prompt }
            ]
          : [{ type: 'text', text: prompt }]
      }
    ]

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages
        })
      })
      const data = await res.json()
      const text = data.content?.find(b => b.type === 'text')?.text || '{}'
      const clean = text.replace(/```json|```/g, '').trim()
      setResult(JSON.parse(clean))
    } catch (err) {
      setResult({ error: 'Помилка аналізу. Перевір API ключ та підключення.' })
    }
    setLoading(false)
  }

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        <div className="bg-pattern" />
        <header>
          <div className="logo">
            <span className="logo-text">🌿 PlantDoc</span>
            <span className="logo-sub">Діагностика рослин</span>
          </div>
        </header>

        <div className="main">
          {/* LEFT PANEL */}
          <div className="panel">
            <div className="panel-title">📷 Фото рослини</div>

            <div
              className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              {image && <img src={image} alt="plant" />}
              {!image && (
                <>
                  <div className="drop-icon">🌱</div>
                  <div className="drop-text">
                    Натисни або перетягни фото
                    <div className="drop-hint">JPG, PNG, WebP до 10MB</div>
                  </div>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />

            <div className="input-group">
              <label className="input-label">Назва рослини (необов'язково)</label>
              <input
                className="input-field"
                type="text"
                placeholder="напр. Фіолетова калла, Фікус..."
                value={plantName}
                onChange={e => setPlantName(e.target.value)}
              />
            </div>

            <button
              className="diagnose-btn"
              onClick={diagnose}
              disabled={loading || (!imageBase64 && !plantName)}
            >
              {loading ? 'Аналізую...' : '🔍 Діагностувати'}
            </button>
          </div>

          {/* RIGHT PANEL */}
          <div className="panel">
            <div className="panel-title">📋 Результат</div>
            <div className="result-area">
              {!result && !loading && (
                <div className="empty-state">
                  <div className="empty-icon">🍃</div>
                  <div className="empty-text">Завантаж фото рослини<br />і натисни «Діагностувати»</div>
                </div>
              )}

              {loading && (
                <div className="loading">
                  <div className="spinner" />
                  <div className="loading-text">Аналізую стан рослини...</div>
                </div>
              )}

              {result && !result.error && (
                <div className="result-content">
                  <div className="result-section">
                    <div className="result-section-title">Рослина</div>
                    <div className="plant-name">{result.name}</div>
                    {result.latin && <div className="plant-latin">{result.latin}</div>}
                  </div>

                  {result.urgent && (
                    <>
                      <div className="divider" />
                      <div className="result-section">
                        <div className="urgent-box">
                          <strong>🚨 Термінові дії</strong>
                          {result.urgent}
                        </div>
                      </div>
                    </>
                  )}

                  {result.issues?.length > 0 && (
                    <>
                      <div className="divider" />
                      <div className="result-section">
                        <div className="result-section-title">Виявлені проблеми</div>
                        <div className="issues-list">
                          {result.issues.map((issue, i) => (
                            <div key={i} className={`issue-card ${issue.severity}`}>
                              <div className="issue-header">
                                <span className="issue-name">{issue.name}</span>
                                <span className={`severity-badge ${issue.severity}`}>
                                  {issue.severity === 'high' ? 'Критично' : issue.severity === 'medium' ? 'Помірно' : 'Незначно'}
                                </span>
                              </div>
                              <div className="issue-desc">{issue.description}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {result.care && (
                    <>
                      <div className="divider" />
                      <div className="result-section">
                        <div className="result-section-title">Рекомендації по догляду</div>
                        <div className="care-grid">
                          {[
                            { icon: '💧', label: 'Полив', key: 'water' },
                            { icon: '☀️', label: 'Світло', key: 'light' },
                            { icon: '🌡️', label: 'Температура', key: 'temp' },
                            { icon: '💦', label: 'Вологість', key: 'humidity' },
                            { icon: '🪴', label: 'Ґрунт', key: 'soil' },
                            { icon: '🌱', label: 'Добриво', key: 'fertilizer' },
                          ].map(({ icon, label, key }) => result.care[key] && (
                            <div key={key} className="care-item">
                              <div className="care-icon">{icon}</div>
                              <div className="care-label">{label}</div>
                              <div className="care-value">{result.care[key]}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {result?.error && (
                <div className="urgent-box" style={{ marginTop: '1rem' }}>
                  <strong>❌ Помилка</strong>
                  {result.error}
                </div>
              )}
            </div>
          </div>
        </div>

        <footer>PlantDoc — AI діагностика кімнатних рослин</footer>
      </div>
    </>
  )
}

export default PlantDoc
