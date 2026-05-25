import { useState, useRef, useCallback } from "react";

const SYSTEM_PROMPT = `Ти — експерт-ботанік і фахівець з догляду за кімнатними рослинами. Відповідай ТІЛЬКИ українською мовою.

Правила:
1. Використовуй ЛИШЕ перевірені наукові факти. Якщо не впевнений — так і скажи.
2. Аналізуй фото уважно: колір листя, форму, плями, текстуру, ознаки хвороб або шкідників.
3. Структуруй відповідь чітко.
4. Будь конкретним і практичним.

Формат відповіді (суворо JSON, без markdown):
{
    "plantName": "назва рослини (якщо відомо з фото або вказано)",
    "overallHealth": "Відмінний | Хороший | Задовільний | Поганий | Критичний",
    "healthScore": число від 0 до 100,
    "issues": [
        { "title": "назва проблеми", "description": "опис", "severity": "low|medium|high" }
    ],
    "careAdvice": [
        { "category": "Полив | Світло | Ґрунт | Добрива | Температура | Вологість | Пересадка | Шкідники",
            "advice": "конкретна порада" }
    ],
    "urgentAction": "термінова дія якщо потрібна, або null",
    "funFact": "цікавий факт про цю рослину"
}`;

const severityColor = { low: "#86efac", medium: "#fcd34d", high: "#f87171" };
const severityLabel = { low: "Низька", medium: "Середня", high: "Висока" };

const categoryIcon = {
    "Полив": "💧", "Світло": "☀️", "Ґрунт": "🪨", "Добрива": "🌿",
    "Температура": "🌡️", "Вологість": "💦", "Пересадка": "🪴", "Шкідники": "🐛"
};

function HealthRing({ score }) {
    const r = 54, c = 2 * Math.PI * r;
    const dash = (score / 100) * c;
    const color = score >= 70 ? "#86efac" : score >= 40 ? "#fcd34d" : "#f87171";
    return (
        <svg width="140" height="140" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
        <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1s ease, stroke 0.5s ease" }} />
        <text x="70" y="70" textAnchor="middle" dominantBaseline="middle"
        style={{ transform: "rotate(90deg)", transformOrigin: "70px 70px", fill: color, fontSize: "26px", fontWeight: "700", fontFamily: "inherit" }}>
        {score}
        </text>
        <text x="70" y="88" textAnchor="middle" dominantBaseline="middle"
        style={{ transform: "rotate(90deg)", transformOrigin: "70px 70px", fill: "rgba(255,255,255,0.5)", fontSize: "10px", fontFamily: "inherit" }}>
        /100
        </text>
        </svg>
    );
}

export default function PlantCareApp() {
    const [plantName, setPlantName] = useState("");
    const [image, setImage] = useState(null);
    const [imageBase64, setImageBase64] = useState(null);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const fileRef = useRef();

    const processFile = useCallback((file) => {
        if (!file || !file.type.startsWith("image/")) return;
        const url = URL.createObjectURL(file);
        setImage(url);
        setResult(null);
        setError(null);
        const reader = new FileReader();
        reader.onload = (e) => setImageBase64(e.target.result.split(",")[1]);
        reader.readAsDataURL(file);
    }, []);

    const handleDrop = (e) => {
        e.preventDefault(); setDragOver(false);
        processFile(e.dataTransfer.files[0]);
    };

    const analyze = async () => {
        if (!imageBase64) return;
        setLoading(true); setError(null); setResult(null);
        try {
            const userMsg = plantName
            ? `Це рослина: ${plantName}. Проаналізуй її стан за фото і дай поради з догляду.`
            : "Визнач цю рослину за фото, проаналізуй її стан і дай поради з догляду.";

            const resp = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "claude-sonnet-4-20250514",
                    max_tokens: 1500,
                    system: SYSTEM_PROMPT,
                    messages: [{
                        role: "user",
                        content: [
                            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64 } },
                            { type: "text", text: userMsg }
                        ]
                    }]
                })
            });
            const data = await resp.json();
            const raw = data.content?.find(b => b.type === "text")?.text || "";
            const clean = raw.replace(/```json|```/g, "").trim();
            setResult(JSON.parse(clean));
        } catch (e) {
            setError("Не вдалося проаналізувати фото. Спробуй ще раз.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: "100vh", background: "#0d1117", color: "#e6edf3",
            fontFamily: "'Crimson Pro', Georgia, serif", padding: "0",
            backgroundImage: "radial-gradient(ellipse at 20% 0%, rgba(34,85,34,0.18) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(20,60,20,0.15) 0%, transparent 60%)"
        }}>
        <link href="https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@300;400;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />

        {/* Header */}
        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "28px 40px", display: "flex", alignItems: "center", gap: "14px" }}>
        <span style={{ fontSize: "32px" }}>🌿</span>
        <div>
        <div style={{ fontSize: "22px", fontWeight: "700", letterSpacing: "-0.5px" }}>PlantDoc</div>
        <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", fontFamily: "'Space Mono', monospace", letterSpacing: "0.5px" }}>діагностика рослин · перевірені факти</div>
        </div>
        </div>

        <div style={{ maxWidth: "780px", margin: "0 auto", padding: "40px 24px" }}>

        {/* Upload + Input */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
        {/* Drop zone */}
        <div
        onClick={() => fileRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
            gridColumn: image ? "1" : "1 / -1",
            border: `2px dashed ${dragOver ? "#86efac" : "rgba(255,255,255,0.12)"}`,
            borderRadius: "16px", cursor: "pointer", transition: "all 0.2s",
            background: dragOver ? "rgba(134,239,172,0.05)" : "rgba(255,255,255,0.02)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: "32px", minHeight: "160px", position: "relative", overflow: "hidden"
        }}>
        {image ? (
            <img src={image} alt="plant" style={{ width: "100%", height: "200px", objectFit: "cover", borderRadius: "10px" }} />
        ) : (
            <>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>📷</div>
            <div style={{ fontSize: "16px", fontWeight: "600" }}>Завантаж фото рослини</div>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)", marginTop: "6px" }}>перетягни або клікни</div>
            </>
        )}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => processFile(e.target.files[0])} />
        </div>

        {/* Name input — shows only when image uploaded */}
        {image && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
            <label style={{ fontSize: "12px", fontFamily: "'Space Mono', monospace", color: "rgba(255,255,255,0.45)", letterSpacing: "0.8px", display: "block", marginBottom: "8px" }}>
            НАЗВА РОСЛИНИ (необов'язково)
            </label>
            <input
            value={plantName}
            onChange={e => setPlantName(e.target.value)}
            placeholder="напр. Монстера, Фікус..."
            style={{
                width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                   borderRadius: "10px", padding: "12px 14px", color: "#e6edf3", fontSize: "15px",
                   fontFamily: "'Crimson Pro', Georgia, serif", outline: "none", boxSizing: "border-box",
                   transition: "border-color 0.2s"
            }}
            onFocus={e => e.target.style.borderColor = "rgba(134,239,172,0.4)"}
            onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
            />
            </div>
            <button
            onClick={analyze}
            disabled={loading || !imageBase64}
            style={{
                background: loading ? "rgba(134,239,172,0.15)" : "rgba(134,239,172,0.2)",
                   border: "1px solid rgba(134,239,172,0.35)", borderRadius: "10px",
                   color: "#86efac", padding: "13px", fontSize: "15px", fontWeight: "600",
                   cursor: loading ? "wait" : "pointer", transition: "all 0.2s",
                   fontFamily: "'Crimson Pro', Georgia, serif", flex: 1
            }}>
            {loading ? "⏳ Аналізую..." : "🔍 Діагностувати"}
            </button>
            <button onClick={() => { setImage(null); setImageBase64(null); setResult(null); setError(null); setPlantName(""); }}
            style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", color: "rgba(255,255,255,0.35)", padding: "10px", fontSize: "13px", cursor: "pointer", fontFamily: "'Crimson Pro', Georgia, serif" }}>
            Інше фото
            </button>
            </div>
        )}
        </div>

        {error && (
            <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: "12px", padding: "16px", color: "#f87171", marginBottom: "24px", fontSize: "15px" }}>
            ⚠️ {error}
            </div>
        )}

        {/* Loading skeleton */}
        {loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {[1,2,3].map(i => (
                <div key={i} style={{ height: "80px", background: "rgba(255,255,255,0.03)", borderRadius: "12px", animation: "pulse 1.5s ease-in-out infinite", animationDelay: `${i*0.15}s` }} />
            ))}
            <style>{`@keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:0.7} }`}</style>
            </div>
        )}

        {/* Results */}
        {result && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* Header card */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "28px", display: "flex", alignItems: "center", gap: "28px" }}>
            <HealthRing score={result.healthScore} />
            <div style={{ flex: 1 }}>
            <div style={{ fontSize: "26px", fontWeight: "700", marginBottom: "6px" }}>{result.plantName || "Рослина"}</div>
            <div style={{
                display: "inline-block", padding: "4px 12px", borderRadius: "20px", fontSize: "13px", fontFamily: "'Space Mono', monospace",
                background: result.healthScore >= 70 ? "rgba(134,239,172,0.15)" : result.healthScore >= 40 ? "rgba(252,211,77,0.15)" : "rgba(248,113,113,0.15)",
                    color: result.healthScore >= 70 ? "#86efac" : result.healthScore >= 40 ? "#fcd34d" : "#f87171",
                    border: `1px solid ${result.healthScore >= 70 ? "rgba(134,239,172,0.25)" : result.healthScore >= 40 ? "rgba(252,211,77,0.25)" : "rgba(248,113,113,0.25)"}`
            }}>
            {result.overallHealth}
            </div>
            {result.urgentAction && (
                <div style={{ marginTop: "14px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "8px", padding: "10px 14px", fontSize: "14px", color: "#f87171" }}>
                🚨 <strong>Терміново:</strong> {result.urgentAction}
                </div>
            )}
            </div>
            </div>

            {/* Issues */}
            {result.issues?.length > 0 && (
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "24px" }}>
                <div style={{ fontSize: "12px", fontFamily: "'Space Mono', monospace", color: "rgba(255,255,255,0.4)", letterSpacing: "1px", marginBottom: "16px" }}>ВИЯВЛЕНІ ПРОБЛЕМИ</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {result.issues.map((issue, i) => (
                    <div key={i} style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: severityColor[issue.severity], marginTop: "6px", flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "600", fontSize: "16px", marginBottom: "3px" }}>{issue.title}</div>
                    <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: "1.5" }}>{issue.description}</div>
                    </div>
                    <div style={{ fontSize: "11px", fontFamily: "'Space Mono', monospace", color: severityColor[issue.severity], opacity: 0.8, flexShrink: 0, paddingTop: "2px" }}>
                    {severityLabel[issue.severity]}
                    </div>
                    </div>
                ))}
                </div>
                </div>
            )}

            {/* Care advice */}
            {result.careAdvice?.length > 0 && (
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "24px" }}>
                <div style={{ fontSize: "12px", fontFamily: "'Space Mono', monospace", color: "rgba(255,255,255,0.4)", letterSpacing: "1px", marginBottom: "16px" }}>ПОРАДИ З ДОГЛЯДУ</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {result.careAdvice.map((c, i) => (
                    <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "14px" }}>
                    <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", marginBottom: "6px" }}>
                    {categoryIcon[c.category] || "🌱"} {c.category}
                    </div>
                    <div style={{ fontSize: "14px", lineHeight: "1.5" }}>{c.advice}</div>
                    </div>
                ))}
                </div>
                </div>
            )}

            {/* Fun fact */}
            {result.funFact && (
                <div style={{ background: "rgba(134,239,172,0.05)", border: "1px solid rgba(134,239,172,0.12)", borderRadius: "12px", padding: "18px 20px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <span style={{ fontSize: "20px" }}>🌱</span>
                <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", lineHeight: "1.6", fontStyle: "italic" }}>{result.funFact}</div>
                </div>
            )}
            </div>
        )}

        {/* Empty state */}
        {!image && !loading && (
            <div style={{ textAlign: "center", padding: "48px 0", color: "rgba(255,255,255,0.2)" }}>
            <div style={{ fontSize: "64px", marginBottom: "16px" }}>🪴</div>
            <div style={{ fontSize: "18px", fontWeight: "600", marginBottom: "8px" }}>Завантаж фото рослини</div>
            <div style={{ fontSize: "14px" }}>Визначу вид, стан здоров'я та дам поради по догляду</div>
            </div>
        )}
        </div>
        </div>
    );
}
