"use client";
import { useState, useRef, useEffect } from "react";

const BASE = "http://localhost:5000";

async function apiCall(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

async function uploadFile(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/api/analyze/upload`, { method: "POST", body: form });
  return res.json();
}

// ── THEME ──────────────────────────────────────────────────────────────────
const C = {
  bg: "#07080f", card: "#0f1020", surface: "#0a0b18",
  border: "#1a1d35", accent: "#7c6fff", accentHi: "#9d94ff",
  green: "#22d3a0", red: "#ff5e7e", yellow: "#f5c542",
  blue: "#38bdf8", purple: "#c084fc", orange: "#fb923c",
  pink: "#f472b6", muted: "#4a4d6a", text: "#e2e4f0",
};

// ── BADGES & POINTS ─────────────────────────────────────────────────────────
const BADGES = [
  { id: "first", icon: "🎯", name: "First Analysis", points: 10, desc: "Completed first resume analysis" },
  { id: "score70", icon: "⭐", name: "Strong Resume", points: 25, desc: "Scored 70+ on resume" },
  { id: "score90", icon: "🏆", name: "Elite Resume", points: 50, desc: "Scored 90+ on resume" },
  { id: "github", icon: "🐙", name: "GitHub Pro", points: 20, desc: "Analyzed GitHub profile" },
  { id: "rewrite", icon: "✍️", name: "Resume Writer", points: 15, desc: "Used AI Resume Rewriter" },
  { id: "chat5", icon: "💬", name: "Career Explorer", points: 20, desc: "Asked 5 career questions" },
  { id: "ats80", icon: "🤖", name: "ATS Master", points: 30, desc: "Achieved ATS score 80+" },
  { id: "internship", icon: "🚀", name: "Internship Ready", points: 20, desc: "Got Internship Ready badge" },
];

const STEPS = [
  "Parsing resume structure...", "Extracting skills with NLP...",
  "Computing TF-IDF job match...", "Simulating recruiter attention...",
  "Running ATS check...", "Building skill roadmap...",
  "Generating interview questions...", "Detecting weak content...",
  "Computing internship readiness...", "Finalizing insights...",
];

const TABS = [
  { id: "overview", icon: "📊", label: "Overview" },
  { id: "match", icon: "🎯", label: "Job Match" },
  { id: "recruiter", icon: "👁", label: "Recruiter Sim" },
  { id: "ats", icon: "🤖", label: "ATS Check" },
  { id: "roadmap", icon: "🗺", label: "Skill Roadmap" },
  { id: "bullet", icon: "✍️", label: "Bullet Fixer" },
  { id: "rewrite", icon: "🔄", label: "AI Rewriter" },
  { id: "interview", icon: "🎤", label: "Interview Qs" },
  { id: "detector", icon: "🔍", label: "Fake Detector" },
  { id: "github", icon: "🐙", label: "GitHub" },
  { id: "multirole", icon: "🎭", label: "Multi-Role" },
  { id: "internship", icon: "🚀", label: "Internship" },
  { id: "leaderboard", icon: "🏆", label: "Leaderboard" },
];

// ── COMPONENTS ──────────────────────────────────────────────────────────────
function Ring({ score, size = 100 }) {
  const r = 40, circ = 2 * Math.PI * r;
  const col = score >= 70 ? C.green : score >= 40 ? C.yellow : C.red;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="50" cy="50" r={r} fill="none" stroke={C.border} strokeWidth={7} />
        <circle cx="50" cy="50" r={r} fill="none" stroke={col} strokeWidth={7}
          strokeLinecap="round" strokeDasharray={circ}
          strokeDashoffset={circ - (Math.min(score, 100) / 100) * circ} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "monospace", fontSize: size * 0.22, fontWeight: 700, color: col, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 9, color: C.muted, textTransform: "uppercase" }}>/100</span>
      </div>
    </div>
  );
}

function Badge({ children, color = "accent" }) {
  const map = {
    accent: [C.accent, "rgba(124,111,255,.12)", "rgba(124,111,255,.25)"],
    green: [C.green, "rgba(34,211,160,.1)", "rgba(34,211,160,.25)"],
    yellow: [C.yellow, "rgba(245,197,66,.1)", "rgba(245,197,66,.25)"],
    red: [C.red, "rgba(255,94,126,.1)", "rgba(255,94,126,.25)"],
    blue: [C.blue, "rgba(56,189,248,.1)", "rgba(56,189,248,.25)"],
    orange: [C.orange, "rgba(251,146,60,.1)", "rgba(251,146,60,.25)"],
    purple: [C.purple, "rgba(192,132,252,.1)", "rgba(192,132,252,.25)"],
    pink: [C.pink, "rgba(244,114,182,.1)", "rgba(244,114,182,.25)"],
  };
  const [col, bg, bdr] = map[color] || map.accent;
  return <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, fontFamily: "monospace", background: bg, color: col, border: `1px solid ${bdr}`, whiteSpace: "nowrap" }}>{children}</span>;
}

function Card({ children, style = {}, glow }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${glow ? C.accent : C.border}`,
      borderRadius: 16, padding: 22,
      boxShadow: glow ? `0 0 24px rgba(124,111,255,.15)` : "none",
      ...style
    }}>{children}</div>
  );
}

function CardTitle({ icon, children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: C.muted, fontFamily: "monospace", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}><span>{icon}</span>{children}</div>;
}

function BList({ items = [], color = C.green }) {
  return (
    <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 9 }}>
      {items.map((it, i) => (
        <li key={i} style={{ fontSize: 13.5, lineHeight: 1.55, color: C.text, paddingLeft: 16, position: "relative" }}>
          <div style={{ position: "absolute", left: 0, top: 7, width: 5, height: 5, borderRadius: "50%", background: color }} />
          {typeof it === "object" ? <><strong style={{ color: C.text }}>{it.title || it.role}</strong>{it.reason ? ` — ${it.reason}` : ""}</> : it}
        </li>
      ))}
    </ul>
  );
}

function AtsBar({ label, val }) {
  const col = val >= 70 ? C.green : val >= 40 ? C.yellow : C.red;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
      <span style={{ fontSize: 12, color: C.text, width: 165, fontFamily: "monospace", flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 6, background: C.border, borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${val}%`, background: col, borderRadius: 4, transition: "width 1s ease" }} />
      </div>
      <span style={{ fontFamily: "monospace", fontSize: 11, color: C.muted, width: 30, textAlign: "right" }}>{val}%</span>
    </div>
  );
}

function Grid2({ children, style = {} }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, ...style }}>{children}</div>;
}

function Sdiv({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: C.muted, fontFamily: "monospace", margin: "28px 0 14px", display: "flex", alignItems: "center", gap: 10 }}>{children}<div style={{ flex: 1, height: 1, background: C.border }} /></div>;
}

function Textarea({ value, onChange, placeholder, rows = 9, mono = true }) {
  return (
    <textarea
      style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", color: C.text, fontFamily: mono ? "monospace" : "inherit", fontSize: 12.5, lineHeight: 1.7, resize: "vertical", minHeight: rows * 24, outline: "none", transition: "border-color .2s" }}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={rows}
      onFocus={e => e.target.style.borderColor = C.accent}
      onBlur={e => e.target.style.borderColor = C.border}
    />
  );
}

function Btn({ children, onClick, disabled, color = C.accent, style = {} }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ padding: "12px 20px", background: color, color: "#fff", border: "none", borderRadius: 10, fontSize: 13.5, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .45 : 1, transition: "all .2s", ...style }}
    >{children}</button>
  );
}

// ── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function Page() {
  // Input
  const [resumeText, setResumeText] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Analysis
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(-1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  // Features
  const [bulletInput, setBulletInput] = useState("");
  const [bulletResult, setBulletResult] = useState(null);
  const [bulletLoading, setBulletLoading] = useState(false);
  const [rewriteRole, setRewriteRole] = useState("Software Engineer");
  const [rewriteResult, setRewriteResult] = useState(null);
  const [rewriteLoading, setRewriteLoading] = useState(false);
  const [githubUser, setGithubUser] = useState("");
  const [githubResult, setGithubResult] = useState(null);
  const [githubLoading, setGithubLoading] = useState(false);
  const [activeRole, setActiveRole] = useState(0);

  // Chatbot
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsg, setChatMsg] = useState("");
  const [chatHistory, setChatHistory] = useState([
    { role: "assistant", content: "Hi! 👋 I'm your AI Career Assistant. Ask me anything about your resume, interview prep, salary, or career advice!" }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Gamification
  const [points, setPoints] = useState(0);
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [showBadge, setShowBadge] = useState(null);
  const [chatCount, setChatCount] = useState(0);
  const stepTimer = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory]);

  const earnBadge = (id) => {
    const badge = BADGES.find(b => b.id === id);
    if (!badge || earnedBadges.includes(id)) return;
    setEarnedBadges(prev => [...prev, id]);
    setPoints(prev => prev + badge.points);
    setShowBadge(badge);
    setTimeout(() => setShowBadge(null), 3000);
  };

  const handleFileUpload = async (f) => {
    if (!f) return;
    setUploading(true);
    try {
      const result = await uploadFile(f);
      if (result.text) {
        setResumeText(result.text);
      } else {
        setError("Could not extract text. Try pasting directly.");
      }
    } catch (e) {
      const reader = new FileReader();
      reader.onload = (ev) => setResumeText(ev.target.result);
      reader.readAsText(f);
    } finally {
      setUploading(false);
    }
  };

  const analyze = async () => {
    const txt = resumeText.trim();
    if (!txt) { setError("Please paste your resume or upload a file."); return; }
    setError(""); setLoading(true); setResult(null); setActiveTab("overview"); setStep(0);
    let s = 0;
    stepTimer.current = setInterval(() => { s++; if (s < STEPS.length) setStep(s); }, 900);
    try {
      const data = await apiCall("/api/analyze/full", { resume_text: txt, job_description: jobDesc });
      setResult(data);
      earnBadge("first");
      if (data.score >= 70) earnBadge("score70");
      if (data.score >= 90) earnBadge("score90");
      if (data.ats_score >= 80) earnBadge("ats80");
      if (data.internship_score >= 60) earnBadge("internship");
    } catch (e) {
      setError(e.message || "Analysis failed.");
    } finally {
      clearInterval(stepTimer.current);
      setLoading(false);
    }
  };

  const runBullet = async () => {
    if (!bulletInput.trim()) return;
    setBulletLoading(true);
    try {
      const r = await apiCall("/api/analyze/bullet", { bullet: bulletInput, context: jobDesc });
      setBulletResult(r);
    } catch { setBulletResult({ improved: "Could not improve. Try again.", why: "" }); }
    finally { setBulletLoading(false); }
  };

  const runRewrite = async () => {
    if (!resumeText.trim()) { setError("Paste your resume first!"); return; }
    setRewriteLoading(true);
    try {
      const r = await apiCall("/api/analyze/rewrite", { resume_text: resumeText, target_role: rewriteRole });
      setRewriteResult(r);
      earnBadge("rewrite");
    } catch { setRewriteResult(null); }
    finally { setRewriteLoading(false); }
  };

  const runGithub = async () => {
    if (!githubUser.trim()) return;
    setGithubLoading(true);
    try {
      const r = await apiCall("/api/analyze/github", { username: githubUser });
      setGithubResult(r);
      earnBadge("github");
    } catch (e) { setGithubResult({ error: e.message }); }
    finally { setGithubLoading(false); }
  };

  const sendChat = async () => {
    if (!chatMsg.trim()) return;
    const userMsg = { role: "user", content: chatMsg };
    setChatHistory(prev => [...prev, userMsg]);
    setChatMsg("");
    setChatLoading(true);
    try {
      const r = await apiCall("/api/analyze/chat", {
        message: chatMsg,
        resume_context: resumeText.slice(0, 500),
        history: chatHistory.slice(-6)
      });
      setChatHistory(prev => [...prev, { role: "assistant", content: r.reply, suggestions: r.suggestions }]);
      const newCount = chatCount + 1;
      setChatCount(newCount);
      if (newCount >= 5) earnBadge("chat5");
    } catch {
      setChatHistory(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't respond. Please try again!" }]);
    } finally {
      setChatLoading(false);
    }
  };

  // ── TAB CONTENT ──────────────────────────────────────────────────────────
  const renderTab = () => {
    if (!result && !["github", "leaderboard", "bullet", "rewrite"].includes(activeTab)) return null;
    const r = result;

    switch (activeTab) {
      case "overview": return r && (
        <div>
          <div style={{ background: `linear-gradient(135deg, ${C.card} 0%, #0d0f22 100%)`, border: `1px solid ${C.border}`, borderRadius: 20, padding: 32, marginBottom: 20, display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, background: `radial-gradient(circle, rgba(124,111,255,.12) 0%, transparent 70%)`, pointerEvents: "none" }} />
            <Ring score={r.score} size={120} />
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 21, fontWeight: 800, color: C.text, marginBottom: 8, lineHeight: 1.3 }}>{r.verdict}</h2>
              <p style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.6 }}>{r.summary}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 12 }}>
                <Badge color="accent">{r.level}</Badge>
                <Badge color="purple">{r.domain}</Badge>
                <Badge color={r.ats_score >= 70 ? "green" : r.ats_score >= 40 ? "yellow" : "red"}>ATS {r.ats_score}/100</Badge>
                <Badge color={r.match_pct >= 70 ? "green" : r.match_pct >= 45 ? "yellow" : "red"}>Match {r.match_pct}%</Badge>
                <Badge color="orange">Growth {r.growth_potential}%</Badge>
                {r.internship_score >= 60 && <Badge color="green">🚀 Internship Ready</Badge>}
              </div>
            </div>
            {r.score_breakdown && (
              <div style={{ minWidth: 170, display: "flex", flexDirection: "column", gap: 10 }}>
                {Object.entries({ Content: r.score_breakdown.content, Impact: r.score_breakdown.impact, Skills: r.score_breakdown.skills, Formatting: r.score_breakdown.formatting, Keywords: r.score_breakdown.keywords }).map(([k, v]) => (
                  <div key={k}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "monospace", marginBottom: 3 }}>
                      <span style={{ color: C.muted }}>{k}</span>
                      <span style={{ color: v >= 70 ? C.green : v >= 40 ? C.yellow : C.red }}>{v}</span>
                    </div>
                    <div style={{ height: 4, background: C.border, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${v}%`, background: `linear-gradient(90deg, ${C.accent}, ${C.purple})`, borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Sdiv>Strengths & Gaps</Sdiv>
          <Grid2>
            <Card><CardTitle icon="✅">Strengths</CardTitle><BList items={r.strengths} color={C.green} /></Card>
            <Card><CardTitle icon="⚠️">Gaps</CardTitle><BList items={r.gaps} color={C.red} /></Card>
            <Card style={{ gridColumn: "1/-1" }}><CardTitle icon="💡">Action Tips</CardTitle><BList items={r.tips} color={C.yellow} /></Card>
          </Grid2>
          <Sdiv>Eligible Jobs</Sdiv>
          <Card><CardTitle icon="💼">Roles You Can Apply For</CardTitle><BList items={r.eligible_jobs} color={C.blue} /></Card>
          <Sdiv>Company Fit</Sdiv>
          <Grid2>
            {r.company_types?.map((c, i) => (
              <Card key={i} style={{ borderColor: c.fit === "High" ? "rgba(34,211,160,.3)" : c.fit === "Medium" ? "rgba(245,197,66,.25)" : "rgba(255,94,126,.2)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 13.5 }}>{c.type}</span>
                  <Badge color={c.fit === "High" ? "green" : c.fit === "Medium" ? "yellow" : "red"}>{c.fit} Fit</Badge>
                </div>
                <p style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>{c.reason}</p>
              </Card>
            ))}
          </Grid2>
        </div>
      );

      case "match": return r && (
        <div>
          <Grid2 style={{ marginBottom: 14 }}>
            <Card style={{ textAlign: "center", padding: 32 }}>
              <div style={{ fontFamily: "monospace", fontSize: 60, fontWeight: 800, background: `linear-gradient(135deg, ${C.green}, ${C.accent})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{r.match_pct}%</div>
              <div style={{ fontSize: 12, color: C.muted, fontFamily: "monospace", marginTop: 4 }}>Resume ↔ Role Match</div>
              <div style={{ marginTop: 10, fontSize: 13.5, color: C.muted, lineHeight: 1.6 }}>{r.match_verdict}</div>
            </Card>
            <Card><CardTitle icon="⚠️">Weak Sections</CardTitle><BList items={r.weak_sections || []} color={C.red} /></Card>
          </Grid2>
          <Grid2>
            <Card><CardTitle icon="✅">Matched Skills</CardTitle><div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{r.matched_skills?.map((s, i) => <Badge key={i} color="green">{s}</Badge>)}</div></Card>
            <Card><CardTitle icon="❌">Missing Skills</CardTitle><div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{r.skills_missing?.map((s, i) => <Badge key={i} color="red">{s}</Badge>)}</div></Card>
            <Card style={{ gridColumn: "1/-1" }}><CardTitle icon="🎯">How to Improve Match</CardTitle><BList items={r.match_suggestions || []} color={C.yellow} /></Card>
          </Grid2>
        </div>
      );

      case "recruiter": return r && r.recruiter_sim && (
        <div>
          <Grid2 style={{ marginBottom: 14 }}>
            <Card>
              <CardTitle icon="👁">First Glance (0–3 sec)</CardTitle>
              <p style={{ fontSize: 14, color: C.text, lineHeight: 1.6, marginBottom: 14 }}>{r.recruiter_sim.first_glance}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <Badge color="green">✅ {r.recruiter_sim.strongest_section}</Badge>
                <Badge color="red">❌ {r.recruiter_sim.weakest_section}</Badge>
                <Badge color="yellow">⚠ Skipped: {r.recruiter_sim.likely_skipped}</Badge>
              </div>
            </Card>
            <Card style={{ textAlign: "center", padding: 32 }}>
              <Ring score={r.recruiter_sim.hire_probability || 0} size={100} />
              <div style={{ marginTop: 10, fontSize: 11, color: C.muted, fontFamily: "monospace", textTransform: "uppercase" }}>Hire Probability</div>
              <div style={{ marginTop: 8, fontSize: 13, color: C.muted, lineHeight: 1.55 }}>{r.recruiter_sim.recruiter_verdict}</div>
            </Card>
          </Grid2>
          <Card>
            <CardTitle icon="⏱">Recruiter Attention Timeline</CardTitle>
            {r.recruiter_sim.attention_flow?.map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 20, padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.surface, border: `2px solid ${C.accent}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", fontSize: 11, color: C.accent, flexShrink: 0, fontWeight: 700 }}>{i + 1}</div>
                <div>
                  <div style={{ fontFamily: "monospace", fontSize: 10, color: C.accent, marginBottom: 4 }}>{item.second}</div>
                  <div style={{ fontSize: 14, color: C.text, marginBottom: 4 }}>{item.action}</div>
                  <Badge color={item.verdict === "Good" ? "green" : item.verdict === "Skip" ? "red" : "yellow"}>{item.verdict}</Badge>
                </div>
              </div>
            ))}
          </Card>
        </div>
      );

      case "ats": return r && (
        <div>
          <Card style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
              <div>
                <div style={{ fontFamily: "monospace", fontSize: 52, fontWeight: 800, color: r.ats_score >= 70 ? C.green : r.ats_score >= 40 ? C.yellow : C.red, lineHeight: 1 }}>{r.ats_score}<span style={{ fontSize: 18, color: C.muted }}>/100</span></div>
                <div style={{ fontSize: 13, fontWeight: 700, marginTop: 6, color: r.ats_score >= 70 ? C.green : r.ats_score >= 40 ? C.yellow : C.red }}>{r.ats_score >= 70 ? "✅ ATS Friendly" : r.ats_score >= 40 ? "⚠ Needs Work" : "❌ ATS Unfriendly"}</div>
              </div>
              <div style={{ maxWidth: 380, fontSize: 14, color: C.muted, lineHeight: 1.6 }}>{r.ats_verdict}</div>
            </div>
            {r.ats?.breakdown && <>
              <AtsBar label="Keyword Match" val={r.ats.breakdown.keyword_match || 0} />
              <AtsBar label="Formatting" val={r.ats.breakdown.formatting || 0} />
              <AtsBar label="Section Clarity" val={r.ats.breakdown.section_clarity || 0} />
              <AtsBar label="Action Verbs" val={r.ats.breakdown.action_verbs || 0} />
              <AtsBar label="Quantified Results" val={r.ats.breakdown.quantified_results || 0} />
            </>}
          </Card>
          <Grid2>
            <Card><CardTitle icon="❌">ATS Issues</CardTitle><BList items={r.ats?.issues || []} color={C.red} /></Card>
            <Card><CardTitle icon="✅">How to Fix</CardTitle><BList items={r.ats_suggestions || []} color={C.green} /></Card>
          </Grid2>
        </div>
      );

      case "roadmap": return r && (
        <Card>
          <CardTitle icon="🗺">Personalized Learning Roadmap</CardTitle>
          {r.skill_roadmap?.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 16, padding: "16px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", fontSize: 11, color: "#fff", fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{s.skill}</span>
                  <Badge color={s.priority === "High" ? "red" : "yellow"}>{s.priority} Priority</Badge>
                </div>
                <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5, marginBottom: 8 }}>{s.why}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {s.resources?.map((res, j) => <span key={j} style={{ fontSize: 11, fontFamily: "monospace", padding: "3px 9px", borderRadius: 5, background: "rgba(124,111,255,.08)", color: C.accent, border: "1px solid rgba(124,111,255,.2)" }}>{res}</span>)}
                </div>
              </div>
            </div>
          ))}
        </Card>
      );

      case "bullet": return (
        <div>
          <Card style={{ marginBottom: 14 }}>
            <CardTitle icon="✍️">Paste Any Bullet — AI Will Improve It</CardTitle>
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <Textarea value={bulletInput} onChange={setBulletInput} placeholder="e.g. Worked on Python project for data analysis..." rows={3} />
              <Btn onClick={runBullet} disabled={bulletLoading || !bulletInput.trim()} style={{ alignSelf: "flex-end", whiteSpace: "nowrap" }}>{bulletLoading ? "..." : "⚡ Improve"}</Btn>
            </div>
            {bulletResult && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ background: "rgba(255,94,126,.05)", border: "1px solid rgba(255,94,126,.2)", borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 10, color: C.red, fontFamily: "monospace", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>❌ Original</div>
                  <div style={{ fontSize: 13.5, color: C.text }}>{bulletInput}</div>
                </div>
                <div style={{ background: "rgba(34,211,160,.05)", border: "1px solid rgba(34,211,160,.2)", borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 10, color: C.green, fontFamily: "monospace", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>✅ Improved</div>
                  <div style={{ fontSize: 13.5, color: C.text }}>{bulletResult.improved}</div>
                </div>
                {bulletResult.why && <div style={{ fontSize: 12.5, color: C.muted, fontStyle: "italic" }}>💡 {bulletResult.why}</div>}
              </div>
            )}
          </Card>
          {result?.bullet_examples?.length > 0 && (
            <Card>
              <CardTitle icon="📝">Weak Bullets From Your Resume — Improved</CardTitle>
              {result.bullet_examples.map((ex, i) => (
                <div key={i} style={{ marginBottom: 18 }}>
                  <div style={{ background: "rgba(255,94,126,.05)", border: "1px solid rgba(255,94,126,.15)", borderRadius: 10, padding: 14, marginBottom: 8 }}>
                    <div style={{ fontSize: 10, color: C.red, fontFamily: "monospace", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>❌ Original</div>
                    <div style={{ fontSize: 13.5, color: C.text }}>{ex.original}</div>
                  </div>
                  <div style={{ background: "rgba(34,211,160,.05)", border: "1px solid rgba(34,211,160,.15)", borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 10, color: C.green, fontFamily: "monospace", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>✅ Improved</div>
                    <div style={{ fontSize: 13.5, color: C.text }}>{ex.improved}</div>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </div>
      );

      case "rewrite": return (
        <div>
          <Card style={{ marginBottom: 14 }}>
            <CardTitle icon="🔄">AI Resume Rewriter</CardTitle>
            <div style={{ marginBottom: 16, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: C.muted }}>Target Role:</span>
              {["Software Engineer", "Data Analyst", "Backend Developer", "Data Scientist", "Product Manager"].map(role => (
                <button key={role} onClick={() => setRewriteRole(role)} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${rewriteRole === role ? C.accent : C.border}`, background: rewriteRole === role ? C.accent : "transparent", color: rewriteRole === role ? "#fff" : C.muted, cursor: "pointer", fontSize: 12, fontWeight: rewriteRole === role ? 700 : 400, transition: "all .2s" }}>{role}</button>
              ))}
            </div>
            <Btn onClick={runRewrite} disabled={rewriteLoading || !resumeText.trim()} style={{ width: "100%", padding: 14 }}>
              {rewriteLoading ? "⏳ Rewriting..." : "✨ Rewrite My Resume with AI"}
            </Btn>
          </Card>
          {rewriteResult && (
            <div>
              <Card style={{ marginBottom: 14 }}>
                <CardTitle icon="📝">Rewritten Professional Summary</CardTitle>
                <div style={{ background: "rgba(34,211,160,.05)", border: "1px solid rgba(34,211,160,.15)", borderRadius: 10, padding: 16 }}>
                  <p style={{ fontSize: 14, color: C.text, lineHeight: 1.7 }}>{rewriteResult.rewritten_summary}</p>
                </div>
                <div style={{ marginTop: 12, fontSize: 13, color: C.muted, fontStyle: "italic" }}>💡 {rewriteResult.overall_verdict}</div>
              </Card>
              <Grid2>
                <Card>
                  <CardTitle icon="🔑">Keywords to Add</CardTitle>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                    {rewriteResult.keywords_to_add?.map((k, i) => <Badge key={i} color="accent">{k}</Badge>)}
                  </div>
                </Card>
                <Card>
                  <CardTitle icon="📋">Formatting Tips</CardTitle>
                  <BList items={rewriteResult.formatting_tips || []} color={C.blue} />
                </Card>
                <Card style={{ gridColumn: "1/-1" }}>
                  <CardTitle icon="✍️">Improved Bullets</CardTitle>
                  {rewriteResult.improved_bullets?.map((b, i) => (
                    <div key={i} style={{ marginBottom: 14 }}>
                      <div style={{ background: "rgba(255,94,126,.05)", border: "1px solid rgba(255,94,126,.15)", borderRadius: 8, padding: 12, marginBottom: 6 }}>
                        <div style={{ fontSize: 10, color: C.red, fontFamily: "monospace", marginBottom: 4 }}>❌ BEFORE</div>
                        <div style={{ fontSize: 13.5, color: C.text }}>{b.original}</div>
                      </div>
                      <div style={{ background: "rgba(34,211,160,.05)", border: "1px solid rgba(34,211,160,.15)", borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 10, color: C.green, fontFamily: "monospace", marginBottom: 4 }}>✅ AFTER</div>
                        <div style={{ fontSize: 13.5, color: C.text }}>{b.improved}</div>
                      </div>
                    </div>
                  ))}
                </Card>
              </Grid2>
            </div>
          )}
        </div>
      );

      case "interview": return r && (
        <Card>
          <CardTitle icon="🎤">Interview Questions — Based on Your Resume</CardTitle>
          {["Technical", "HR", "Behavioral", "Project"].map(cat => {
            const qs = r.interview_questions?.filter(q => q.category === cat);
            if (!qs?.length) return null;
            return (
              <div key={cat} style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: "monospace", fontSize: 10, color: C.accent, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 10, padding: "4px 10px", background: "rgba(124,111,255,.08)", borderRadius: 6, display: "inline-block" }}>{cat} Questions</div>
                {qs.map((q, i) => (
                  <div key={i} style={{ borderLeft: `3px solid ${C.accent}`, paddingLeft: 16, marginBottom: 12, paddingTop: 4, paddingBottom: 4 }}>
                    <div style={{ fontSize: 13.5, color: C.text, lineHeight: 1.55 }}>{q.question}</div>
                  </div>
                ))}
              </div>
            );
          })}
        </Card>
      );

      case "detector": return r && (
        <Grid2>
          <Card>
            <CardTitle icon="🚩">Weak / Vague Content</CardTitle>
            {r.fake_flags?.length ? r.fake_flags.map((f, i) => (
              <div key={i} style={{ display: "flex", gap: 12, background: "rgba(255,94,126,.05)", border: "1px solid rgba(255,94,126,.15)", borderRadius: 10, padding: 14, marginBottom: 10 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
                <div style={{ fontSize: 13, color: C.text, lineHeight: 1.55 }}><strong style={{ color: C.red }}>[{f.type}]</strong> "{f.text}" — {f.reason}</div>
              </div>
            )) : <div style={{ color: C.green, fontSize: 13.5, padding: 16 }}>✅ No red flags detected!</div>}
          </Card>
          <Card>
            <CardTitle icon="✅">Genuine Strengths</CardTitle>
            {r.genuine_strengths?.map((g, i) => (
              <div key={i} style={{ display: "flex", gap: 12, background: "rgba(34,211,160,.05)", border: "1px solid rgba(34,211,160,.15)", borderRadius: 10, padding: 14, marginBottom: 10 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>✅</span>
                <div style={{ fontSize: 13.5, color: C.text, lineHeight: 1.55 }}>{g}</div>
              </div>
            ))}
          </Card>
        </Grid2>
      );

      case "github": return (
        <div>
          <Card style={{ marginBottom: 14 }}>
            <CardTitle icon="🐙">GitHub Profile Analyzer</CardTitle>
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <input
                style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px", color: C.text, fontFamily: "monospace", fontSize: 13, outline: "none" }}
                placeholder="Enter GitHub username e.g. torvalds"
                value={githubUser}
                onChange={e => setGithubUser(e.target.value)}
                onKeyDown={e => e.key === "Enter" && runGithub()}
              />
              <Btn onClick={runGithub} disabled={githubLoading || !githubUser.trim()}>
                {githubLoading ? "..." : "🔍 Analyze"}
              </Btn>
            </div>
            {githubResult?.error && <div style={{ color: C.red, fontSize: 13, fontFamily: "monospace" }}>⚠ {githubResult.error}</div>}
          </Card>
          {githubResult && !githubResult.error && (
            <div>
              <div style={{ background: `linear-gradient(135deg, ${C.card}, #0d0f22)`, border: `1px solid ${C.border}`, borderRadius: 20, padding: 28, marginBottom: 14, display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 }}>🐙</div>
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text }}>{githubResult.name || githubResult.username}</h2>
                  <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>@{githubResult.username} · {githubResult.bio || "No bio"}</p>
                  <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
                    <Badge color="blue">📦 {githubResult.public_repos} repos</Badge>
                    <Badge color="purple">👥 {githubResult.followers} followers</Badge>
                    <Badge color="yellow">⭐ {githubResult.total_stars} stars</Badge>
                  </div>
                </div>
                <Ring score={githubResult.score} size={90} />
              </div>
              <Grid2>
                <Card>
                  <CardTitle icon="💻">Top Languages</CardTitle>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                    {githubResult.top_languages?.map((l, i) => <Badge key={i} color="accent">{l}</Badge>)}
                  </div>
                </Card>
                <Card>
                  <CardTitle icon="💡">Suggestions</CardTitle>
                  <BList items={githubResult.suggestions || []} color={C.yellow} />
                </Card>
                <Card style={{ gridColumn: "1/-1" }}>
                  <CardTitle icon="📁">Recent Repositories</CardTitle>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {githubResult.repos?.map((repo, i) => (
                      <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: C.accent, marginBottom: 4 }}>{repo.name}</div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {repo.language && <Badge color="blue">{repo.language}</Badge>}
                          <Badge color="yellow">⭐ {repo.stars}</Badge>
                          {!repo.has_description && <Badge color="red">No description</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </Grid2>
            </div>
          )}
        </div>
      );

      case "multirole": return r && (
        <Card>
          <CardTitle icon="🎭">Resume for Different Roles</CardTitle>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {r.multi_role?.versions?.map((v, i) => (
              <button key={i} onClick={() => setActiveRole(i)} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${i === activeRole ? C.accent : C.border}`, background: i === activeRole ? C.accent : "transparent", color: i === activeRole ? "#fff" : C.muted, cursor: "pointer", fontSize: 13, fontWeight: i === activeRole ? 700 : 500, transition: "all .2s" }}>{v.role}</button>
            ))}
          </div>
          {r.multi_role?.versions?.[activeRole] && (() => {
            const v = r.multi_role.versions[activeRole];
            return (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: C.accent, fontFamily: "monospace", fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Summary for {v.role}</div>
                  <div style={{ fontSize: 13.5, color: C.text, lineHeight: 1.65 }}>{v.summary}</div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: C.accent, fontFamily: "monospace", fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Key Skills</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{v.key_skills?.map((s, i) => <Badge key={i} color="accent">{s}</Badge>)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: C.accent, fontFamily: "monospace", fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Headline Bullets</div>
                  <BList items={v.headline_bullets || []} color={C.blue} />
                </div>
              </div>
            );
          })()}
        </Card>
      );

      case "internship": return r && (
        <div>
          <Grid2 style={{ marginBottom: 14 }}>
            <Card style={{ textAlign: "center", padding: 32 }}>
              <div style={{ fontFamily: "monospace", fontSize: 56, fontWeight: 800, color: r.internship_score >= 70 ? C.green : r.internship_score >= 45 ? C.yellow : C.red, lineHeight: 1 }}>{r.internship_score}%</div>
              <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", fontFamily: "monospace", marginTop: 8, letterSpacing: ".1em" }}>Internship Readiness</div>
              <div style={{ marginTop: 12, fontSize: 13.5, color: C.muted, lineHeight: 1.6 }}>{r.internship_verdict}</div>
              {r.internship_score >= 60 && <div style={{ marginTop: 14 }}><Badge color="green">🚀 Ready to Apply!</Badge></div>}
            </Card>
            <Card><CardTitle icon="🚀">Internship Roles to Apply</CardTitle><BList items={r.internship_roles || []} color={C.orange} /></Card>
          </Grid2>
          <Card>
            <CardTitle icon="📋">Next Steps to Boost Readiness</CardTitle>
            <BList items={r.internship_next_steps || []} color={C.green} />
          </Card>
        </div>
      );

      case "leaderboard": return (
        <div>
          {/* Points & Badges */}
          <div style={{ background: `linear-gradient(135deg, #0f1020, #12102a)`, border: `1px solid ${C.accent}`, borderRadius: 20, padding: 28, marginBottom: 20, display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "monospace", fontSize: 48, fontWeight: 800, color: C.yellow, lineHeight: 1 }}>{points}</div>
              <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: ".1em", marginTop: 4 }}>Total Points</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>
                {points === 0 ? "🌱 Beginner" : points < 50 ? "⭐ Rising Star" : points < 100 ? "🔥 Pro Analyst" : "🏆 Resume Expert"}
              </div>
              <div style={{ height: 8, background: C.border, borderRadius: 4, overflow: "hidden", marginBottom: 8 }}>
                <div style={{ height: "100%", width: `${Math.min((points / 150) * 100, 100)}%`, background: `linear-gradient(90deg, ${C.yellow}, ${C.green})`, borderRadius: 4, transition: "width .8s ease" }} />
              </div>
              <div style={{ fontSize: 12, color: C.muted }}>{points}/150 points to Expert rank</div>
            </div>
          </div>

          {/* Badges */}
          <Card style={{ marginBottom: 14 }}>
            <CardTitle icon="🏅">Badges</CardTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
              {BADGES.map(b => {
                const earned = earnedBadges.includes(b.id);
                return (
                  <div key={b.id} style={{ background: earned ? "rgba(124,111,255,.1)" : C.surface, border: `1px solid ${earned ? C.accent : C.border}`, borderRadius: 12, padding: 14, textAlign: "center", opacity: earned ? 1 : .4, transition: "all .3s" }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>{b.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: earned ? C.text : C.muted, marginBottom: 4 }}>{b.name}</div>
                    <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.4 }}>{b.desc}</div>
                    <div style={{ marginTop: 8 }}><Badge color={earned ? "accent" : "accent"}>+{b.points} pts</Badge></div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* How to earn more */}
          <Card>
            <CardTitle icon="🎯">How to Earn More Points</CardTitle>
            <BList items={[
              "Analyze your resume — +10 points",
              "Score 70+ on resume — +25 points",
              "Score 90+ on resume — +50 points",
              "Analyze your GitHub — +20 points",
              "Use AI Resume Rewriter — +15 points",
              "Ask 5 career questions — +20 points",
              "Achieve ATS score 80+ — +30 points",
              "Get Internship Ready badge — +20 points",
            ]} color={C.yellow} />
          </Card>
        </div>
      );

      default: return null;
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Segoe UI', 'DM Sans', sans-serif" }}>
      {/* Background */}
      <div style={{ position: "fixed", inset: 0, backgroundImage: `linear-gradient(rgba(124,111,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(124,111,255,.02) 1px,transparent 1px)`, backgroundSize: "48px 48px", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", width: 600, height: 600, background: "radial-gradient(circle, rgba(124,111,255,.08) 0%, transparent 65%)", top: -200, left: -150, pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", width: 500, height: 500, background: "radial-gradient(circle, rgba(34,211,160,.05) 0%, transparent 65%)", bottom: -150, right: -100, pointerEvents: "none", zIndex: 0 }} />

      {/* Badge notification */}
      {showBadge && (
        <div style={{ position: "fixed", top: 24, right: 24, background: `linear-gradient(135deg, ${C.card}, #12102a)`, border: `1px solid ${C.accent}`, borderRadius: 16, padding: "16px 20px", zIndex: 1000, boxShadow: `0 8px 32px rgba(124,111,255,.3)`, animation: "fadeUp .4s ease", maxWidth: 280 }}>
          <div style={{ fontSize: 11, color: C.accent, fontFamily: "monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>🎉 Badge Earned!</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 28 }}>{showBadge.icon}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{showBadge.name}</div>
              <div style={{ fontSize: 12, color: C.yellow }}>+{showBadge.points} points!</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 120px", position: "relative", zIndex: 1 }}>

        {/* Header */}
        <div style={{ padding: "24px 0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.border}`, marginBottom: 36, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: `0 4px 16px rgba(124,111,255,.3)` }}>📄</div>
            <div>
              <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.02em", background: `linear-gradient(135deg, ${C.text}, ${C.accent})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>ResumeAI</span>
              <div style={{ fontSize: 10, color: C.muted, fontFamily: "monospace", marginTop: -2 }}>Smart Career Platform</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(245,197,66,.08)", border: "1px solid rgba(245,197,66,.2)", borderRadius: 20, padding: "6px 14px" }}>
              <span>🏆</span>
              <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: C.yellow }}>{points} pts</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(124,111,255,.08)", border: "1px solid rgba(124,111,255,.2)", borderRadius: 20, padding: "6px 14px" }}>
              <div style={{ width: 6, height: 6, background: C.green, borderRadius: "50%", animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: 11, color: C.accent, fontFamily: "monospace" }}>12 AI Modules</span>
            </div>
          </div>
        </div>

        {/* Hero */}
        <div style={{ textAlign: "center", padding: "32px 0 28px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(124,111,255,.1)", border: "1px solid rgba(124,111,255,.25)", borderRadius: 100, padding: "6px 18px", fontFamily: "monospace", fontSize: 11, color: C.accent, letterSpacing: ".06em", marginBottom: 20 }}>
            <span style={{ width: 6, height: 6, background: C.green, borderRadius: "50%", display: "inline-block" }} />
            AI-Powered · NLP · TF-IDF · ATS · GitHub Analysis
          </div>
          <h1 style={{ fontSize: "clamp(32px,5vw,60px)", fontWeight: 900, lineHeight: 1.04, letterSpacing: "-.03em", marginBottom: 16 }}>
            Your Resume,{" "}
            <span style={{ background: `linear-gradient(135deg, ${C.accent} 0%, ${C.purple} 50%, ${C.blue} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Completely Decoded
            </span>
          </h1>
          <p style={{ fontSize: 17, color: C.muted, maxWidth: 600, margin: "0 auto 28px", lineHeight: 1.65 }}>
            AI resume analysis · GitHub analyzer · Skill roadmap · Interview prep · Career chatbot · Gamified progress
          </p>
        </div>

        {/* Input Panel */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 24, padding: 32, marginBottom: 28, boxShadow: "0 4px 32px rgba(0,0,0,.3)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, fontFamily: "monospace", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 3, height: 14, background: C.accent, borderRadius: 2 }} />
            Resume Input
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: C.muted, fontFamily: "monospace" }}>Resume Text</span>
              <Textarea value={resumeText} onChange={setResumeText} placeholder="Paste your complete resume here — education, experience, skills, projects..." />
              <div
                style={{ border: `2px dashed ${drag ? C.accent : C.border}`, borderRadius: 12, padding: "18px 24px", textAlign: "center", cursor: "pointer", background: drag ? "rgba(124,111,255,.06)" : C.surface, transition: "all .2s" }}
                onDragOver={e => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={e => { e.preventDefault(); setDrag(false); handleFileUpload(e.dataTransfer.files[0]); }}
                onClick={() => document.getElementById("__fin").click()}
              >
                <input id="__fin" type="file" accept=".txt,.pdf,.docx" style={{ display: "none" }} onChange={e => handleFileUpload(e.target.files[0])} />
                <div style={{ fontSize: 12, color: drag ? C.accent : C.muted, fontFamily: "monospace" }}>
                  {uploading ? "⏳ Extracting text..." : "📁 Drop PDF / DOCX / TXT or click to upload"}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: C.muted, fontFamily: "monospace" }}>Job Description (Optional)</span>
              <Textarea value={jobDesc} onChange={setJobDesc} placeholder="Paste job description for accurate match scoring, ATS keywords, and tailored suggestions..." />
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 18px" }}>
                <div style={{ fontFamily: "monospace", fontSize: 10, color: C.accent, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>💡 Pro Tip</div>
                <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.65 }}>Adding a job description unlocks precise TF-IDF match scoring, targeted ATS keywords, and role-specific roadmaps.</div>
              </div>
            </div>
          </div>

          <button
            style={{ width: "100%", marginTop: 22, padding: 18, background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`, color: "#fff", border: "none", borderRadius: 14, fontSize: 16, fontWeight: 800, cursor: loading || !resumeText.trim() ? "not-allowed" : "pointer", opacity: loading || !resumeText.trim() ? .45 : 1, transition: "all .25s", letterSpacing: ".01em", boxShadow: loading ? "none" : `0 8px 28px rgba(124,111,255,.35)` }}
            onClick={analyze}
            disabled={loading || !resumeText.trim()}
          >
            {loading ? "⏳ Running 12 AI Modules..." : "⚡ Run Full AI Analysis — 12 Modules"}
          </button>

          {loading && (
            <div style={{ marginTop: 20 }}>
              <div style={{ height: 3, background: C.border, borderRadius: 3, overflow: "hidden", marginBottom: 14 }}>
                <div style={{ height: "100%", background: `linear-gradient(90deg, ${C.accent}, ${C.purple})`, borderRadius: 3, width: `${((step + 1) / STEPS.length) * 100}%`, transition: "width .9s ease" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {STEPS.map((s, i) => (
                  <div key={i} style={{ fontFamily: "monospace", fontSize: 11.5, color: i < step ? C.green : i === step ? C.accent : C.muted, display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", flexShrink: 0 }} />
                    {i < step ? `✓ ${s}` : i === step ? `→ ${s}` : `  ${s}`}
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <div style={{ background: "rgba(255,94,126,.08)", border: "1px solid rgba(255,94,126,.2)", borderRadius: 10, padding: 14, color: C.red, fontSize: 13, marginTop: 14, fontFamily: "monospace" }}>⚠ {error}</div>}
        </div>

        {/* Results */}
        {(result || ["github", "leaderboard", "bullet", "rewrite"].includes(activeTab)) && (
          <>
            <div style={{ display: "flex", gap: 4, background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 6, marginBottom: 24, overflowX: "auto", boxShadow: "0 2px 16px rgba(0,0,0,.2)" }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 7, padding: "10px 16px", borderRadius: 12, border: "none", background: activeTab === t.id ? `linear-gradient(135deg, ${C.accent}, ${C.purple})` : "transparent", color: activeTab === t.id ? "#fff" : C.muted, cursor: "pointer", fontSize: 13, fontWeight: activeTab === t.id ? 700 : 500, transition: "all .2s", whiteSpace: "nowrap" }}>
                  <span>{t.icon}</span>{t.label}
                </button>
              ))}
            </div>
            {renderTab()}
          </>
        )}

        {/* Show tabs even without result for some */}
        {!result && !["github", "leaderboard", "bullet", "rewrite"].includes(activeTab) && (
          <div style={{ display: "flex", gap: 4, background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 6, marginBottom: 24, overflowX: "auto" }}>
            {[{ id: "github", icon: "🐙", label: "GitHub" }, { id: "bullet", icon: "✍️", label: "Bullet Fixer" }, { id: "rewrite", icon: "🔄", label: "AI Rewriter" }, { id: "leaderboard", icon: "🏆", label: "Leaderboard" }].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 7, padding: "10px 16px", borderRadius: 12, border: "none", background: "transparent", color: C.muted, cursor: "pointer", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap" }}>
                <span>{t.icon}</span>{t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chatbot */}
      <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 999 }}>
        {chatOpen && (
          <div style={{ width: 360, height: 500, background: C.card, border: `1px solid ${C.accent}`, borderRadius: 20, boxShadow: `0 16px 48px rgba(0,0,0,.5), 0 0 32px rgba(124,111,255,.2)`, marginBottom: 12, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>🤖 Career Assistant</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.7)" }}>Ask me anything!</div>
              </div>
              <button onClick={() => setChatOpen(false)} style={{ background: "rgba(255,255,255,.2)", border: "none", color: "#fff", cursor: "pointer", fontSize: 18, borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {chatHistory.map((msg, i) => (
                <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "85%", background: msg.role === "user" ? C.accent : C.surface, border: `1px solid ${msg.role === "user" ? "transparent" : C.border}`, borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", padding: "10px 14px" }}>
                    <div style={{ fontSize: 13, color: msg.role === "user" ? "#fff" : C.text, lineHeight: 1.55 }}>{msg.content}</div>
                    {msg.suggestions && (
                      <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {msg.suggestions.map((s, j) => (
                          <button key={j} onClick={() => { setChatMsg(s); }} style={{ background: "rgba(124,111,255,.15)", border: "1px solid rgba(124,111,255,.3)", color: C.accent, padding: "3px 9px", borderRadius: 6, fontSize: 11, cursor: "pointer", fontFamily: "monospace" }}>{s}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "14px 14px 14px 4px", padding: "10px 14px" }}>
                    <div style={{ fontSize: 13, color: C.muted }}>Thinking...</div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8 }}>
              <input
                style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", color: C.text, fontSize: 13, outline: "none" }}
                placeholder="Ask about salary, interview, resume..."
                value={chatMsg}
                onChange={e => setChatMsg(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !chatLoading && sendChat()}
              />
              <Btn onClick={sendChat} disabled={chatLoading || !chatMsg.trim()} style={{ padding: "10px 14px" }}>➤</Btn>
            </div>
          </div>
        )}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          style={{ width: 58, height: 58, borderRadius: "50%", background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`, border: "none", color: "#fff", fontSize: 24, cursor: "pointer", boxShadow: `0 8px 24px rgba(124,111,255,.4)`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all .3s" }}
        >
          {chatOpen ? "×" : "💬"}
        </button>
      </div>

      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px);} to{opacity:1;transform:translateY(0);} }
        @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:.4;} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1a1d35; border-radius: 4px; }
      `}</style>
    </div>
  );
}
