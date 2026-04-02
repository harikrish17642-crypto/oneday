export const config = { maxDuration: 10 };

const strip = h => h ? h.replace(/<[^>]*>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim().substring(0, 300) : "";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function timed(promise, ms = 8000) {
  return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);
}

async function fetchNaukri(role, location) {
  try {
    const loc = location ? `&location=${encodeURIComponent(location)}` : "";
    const r = await timed(fetch(
      `https://www.naukri.com/jobapi/v3/search?noOfResults=50&urlType=search_by_keyword&searchType=adv&keyword=${encodeURIComponent(role)}${loc}&pageNo=1&sort=date&sortBy=date`,
      { headers: { "User-Agent": UA, Accept: "application/json", appid: "109", systemid: "Naukri", clientid: "d3skt0p" } }
    ));
    if (!r.ok) return [];
    const d = await r.json();
    return (d?.jobDetails || []).map(j => {
      const ph = j.placeholders || [];
      return {
        id: `nk-${j.jobId || Math.random().toString(36).slice(2)}`,
        title: j.title || "", company: j.companyName || "",
        location: ph.find(p => p.type === "location")?.label || location || "",
        date: j.createdDate || new Date().toISOString(),
        url: j.jdURL ? `https://www.naukri.com${j.jdURL}` : "",
        source: "naukri", sourceLabel: "Naukri",
        description: strip(j.jobDescription || ""),
        salary: ph.find(p => p.type === "salary")?.label || "",
        experience: ph.find(p => p.type === "experience")?.label || "",
      };
    });
  } catch (e) { console.log("Naukri:", e.message); return []; }
}

async function fetchRemotive(q) {
  try {
    const r = await timed(fetch(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(q)}&limit=100`));
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
    const r = await timed(fetch(`https://www.arbeitnow.com/api/job-board-api?search=${encodeURIComponent(q)}`));
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
    const r = await timed(fetch("https://remoteok.com/api", { headers: { "User-Agent": UA } }));
    const d = await r.json();
    const words = q.toLowerCase().split(/\s+/);
    return d.filter(j => j.position && words.some(w =>
      `${j.position} ${j.company} ${(j.tags || []).join(" ")}`.toLowerCase().includes(w)
    )).slice(0, 60).map(j => ({
      id: `rok-${j.id}`, title: j.position || "", company: j.company || "",
      location: j.location || "Remote", date: j.date || "",
      url: j.url || `https://remoteok.com/remote-jobs/${j.id}`,
      source: "remoteok", sourceLabel: "RemoteOK",
      description: strip(j.description),
      salary: j.salary_min ? `$${j.salary_min}-${j.salary_max}` : "", experience: ""
    }));
  } catch { return []; }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { role, location } = req.query;
  if (!role) return res.status(400).json({ error: "role is required" });

  const [r1, r2, r3, r4] = await Promise.allSettled([
    fetchNaukri(role, location),
    fetchRemotive(role),
    fetchArbeitnow(role),
    fetchRemoteOK(role),
  ]);

  const names = ["naukri", "remotive", "arbeitnow", "remoteok"];
  let jobs = [];
  const counts = {};
  [r1, r2, r3, r4].forEach((r, i) => {
    const j = r.status === "fulfilled" ? r.value : [];
    counts[names[i]] = j.length;
    jobs.push(...j);
  });

  const seen = new Set();
  jobs = jobs.filter(j => {
    const k = `${j.title.toLowerCase().trim()}::${j.company.toLowerCase().trim()}`;
    if (seen.has(k)) return false; seen.add(k); return true;
  });
  jobs.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  return res.status(200).json({ total: jobs.length, sourceCounts: counts, jobs, timestamp: new Date().toISOString() });
}
