// api/jobs.js — Vercel Serverless Function
// Optional: scrapes LinkedIn (via Google), Naukri, Indeed RSS
// The frontend works without this, but adding it gives more results

export const config = { maxDuration: 30 };

const UAs = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/119.0.0.0 Safari/537.36",
];
const rua = () => UAs[Math.floor(Math.random() * UAs.length)];
const strip = h => h ? h.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().substring(0, 300) : "";

async function fetchRemotive(q) {
  try {
    const r = await fetch(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(q)}&limit=100`);
    const d = await r.json();
    return (d.jobs || []).map(j => ({
      id: `rem-${j.id}`, title: j.title || "", company: j.company_name || "",
      location: j.candidate_required_location || "Remote", date: j.publication_date || "",
      url: j.url || "", source: "remotive", sourceLabel: "Remotive",
      description: strip(j.description), salary: j.salary || "", experience: ""
    }));
  } catch { return []; }
}

async function fetchArbeitnow(q) {
  try {
    const r = await fetch(`https://www.arbeitnow.com/api/job-board-api?search=${encodeURIComponent(q)}`);
    const d = await r.json();
    return (d.data || []).map(j => ({
      id: `arb-${j.slug}`, title: j.title || "", company: j.company_name || "",
      location: j.location || "Remote",
      date: j.created_at ? new Date(j.created_at * 1000).toISOString() : "",
      url: j.url || "", source: "arbeitnow", sourceLabel: "Arbeitnow",
      description: strip(j.description), salary: "", experience: ""
    }));
  } catch { return []; }
}

async function fetchRemoteOK(q) {
  try {
    const r = await fetch("https://remoteok.com/api", { headers: { "User-Agent": rua() } });
    const d = await r.json();
    const ql = q.toLowerCase();
    return d.filter(j => j.position &&
      `${j.position} ${j.company} ${(j.tags || []).join(" ")}`.toLowerCase().includes(ql.split(/\s+/)[0])
    ).slice(0, 60).map(j => ({
      id: `rok-${j.id}`, title: j.position || "", company: j.company || "",
      location: j.location || "Remote", date: j.date || "",
      url: j.url || `https://remoteok.com/remote-jobs/${j.id}`,
      source: "remoteok", sourceLabel: "RemoteOK",
      description: strip(j.description),
      salary: j.salary_min ? `$${j.salary_min}–${j.salary_max}` : "", experience: ""
    }));
  } catch { return []; }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { role, location, experience } = req.query;
  if (!role) return res.status(400).json({ error: "role is required" });

  const [r1, r2, r3] = await Promise.allSettled([
    fetchRemotive(role), fetchArbeitnow(role), fetchRemoteOK(role)
  ]);

  let jobs = [
    ...(r1.status === "fulfilled" ? r1.value : []),
    ...(r2.status === "fulfilled" ? r2.value : []),
    ...(r3.status === "fulfilled" ? r3.value : []),
  ];

  // Dedupe
  const seen = new Set();
  jobs = jobs.filter(j => {
    const k = `${j.title.toLowerCase()}::${j.company.toLowerCase()}`;
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });

  jobs.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  return res.status(200).json({
    total: jobs.length,
    jobs,
    timestamp: new Date().toISOString()
  });
}
