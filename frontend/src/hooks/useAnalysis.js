"use client";
import { useState, useRef, useCallback } from "react";

const BASE = "http://localhost:5000";

async function analyzeResume(resumeText, jobDescription = "") {
  const res = await fetch(`${BASE}/api/analyze/full`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resume_text: resumeText,
      job_description: jobDescription,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

async function improveBullet(bullet, context = "") {
  const res = await fetch(`${BASE}/api/analyze/bullet`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bullet, context }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

const STEPS = [
  "Parsing resume structure...",
  "Extracting skills with NLP...",
  "Computing TF-IDF job match score...",
  "Simulating recruiter attention...",
  "Running ATS compatibility check...",
  "Building personalized skill roadmap...",
  "Generating interview questions...",
  "Detecting weak content...",
  "Computing internship readiness...",
  "Finalizing AI insights...",
];

export function useAnalysis() {
  const [resumeText, setResumeText] = useState("");
  const [jobDesc, setJobDesc]       = useState("");
  const [file, setFile]             = useState(null);
  const [loading, setLoading]       = useState(false);
  const [step, setStep]             = useState(-1);
  const [result, setResult]         = useState(null);
  const [error, setError]           = useState("");
  const [activeTab, setActiveTab]   = useState("overview");
  const [bulletInput, setBulletInput]     = useState("");
  const [bulletResult, setBulletResult]   = useState(null);
  const [bulletLoading, setBulletLoading] = useState(false);
  const [activeRole, setActiveRole]       = useState(0);
  const stepTimer = useRef(null);

  const handleFileUpload = useCallback((f) => {
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setResumeText(e.target.result);
    reader.readAsText(f);
  }, []);

  const analyze = useCallback(async () => {
    const txt = resumeText.trim();
    if (!txt) { setError("Please paste your resume or upload a file."); return; }
    setError(""); setLoading(true); setResult(null);
    setActiveTab("overview"); setStep(0);
    let s = 0;
    stepTimer.current = setInterval(() => {
      s++;
      if (s < STEPS.length) setStep(s);
    }, 900);
    try {
      const data = await analyzeResume(txt, jobDesc);
      setResult(data);
    } catch (e) {
      setError(e.message || "Analysis failed. Please try again.");
    } finally {
      clearInterval(stepTimer.current);
      setLoading(false);
    }
  }, [resumeText, jobDesc]);

  const runBulletImprover = useCallback(async () => {
    if (!bulletInput.trim()) return;
    setBulletLoading(true); setBulletResult(null);
    try {
      const r = await improveBullet(bulletInput, jobDesc);
      setBulletResult(r);
    } catch (e) {
      setBulletResult({ improved: "Could not improve — try again.", why: "" });
    } finally {
      setBulletLoading(false);
    }
  }, [bulletInput, jobDesc]);

  return {
    resumeText, setResumeText,
    jobDesc, setJobDesc,
    file, setFile,
    loading, step, steps: STEPS,
    result, error, setError,
    activeTab, setActiveTab,
    bulletInput, setBulletInput,
    bulletResult, bulletLoading,
    activeRole, setActiveRole,
    handleFileUpload,
    analyze,
    runBulletImprover,
  };
}