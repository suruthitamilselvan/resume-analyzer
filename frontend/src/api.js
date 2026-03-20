const BASE = "http://localhost:5000";

export async function analyzeResume(resumeText, jobDescription = "") {
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

export async function improveBullet(bullet, context = "") {
  const res = await fetch(`${BASE}/api/analyze/bullet`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bullet, context }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}
