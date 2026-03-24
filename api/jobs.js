export const config = { maxDuration: 55 };

const UAs = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15",
];
const rua = () => UAs[Math.floor(Math.random() * UAs.length)];
const strip = h => h ? h.replace(/<[^>]*>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim().substring(0, 300) : "";
const wait = ms => new Promise(r => setTimeout(r, ms));

// ── NAUKRI (3 pages × 50 = up to 150 results) ────────────────
async function scrapeNaukri(role, location) {
  const out = [];
  try {
    const loc = location ? `&location=${encodeURIComponent(location.split(",")[0].trim())}` : "";
    for (let p = 1; p <= 3; p++) {
      try {
        const r = await fetch(
          `https://www.naukri.com/jobapi/v3/search?noOfResults=50&urlType=search_by_keyword&searchType=adv&keyword=${encodeURIComponent(role)}${loc}&pageNo=${p}&sort=date&sortBy=date`,
          { headers: { "User-Agent": rua(), Accept: "application/json", appid: "109", systemid: "Naukri", clientid: "d3skt0p" } }
        );
        if (!r.ok) break;
        const d = await r.json();
        const jds = d?.jobDetails || [];
        if (!jds.length) break;
        for (const j of jds) {
          const ph = j.placeholders || [];
          out.push({
            id: `naukri-${j.jobId || out.length}`, title: j.title || "", company: j.companyName || "",
            location: ph.find(p => p.type === "location")?.label || location || "",
            date: j.createdDate || j.footerPlaceholderLabel || new Date().toISOString(),
            url: j.jdURL ? `https://www.naukri.com${j.jdURL}` : "",
            source: "naukri", sourceLabel: "Naukri",
            description: strip(j.jobDescription || ""),
            salary: ph.find(p => p.type === "salary")?.label || "",
            experience: ph.find(p => p.type === "experience")?.label || "",
          });
        }
        await wait(250);
      } catch { break; }
    }
  } catch (e) { console.error("Naukri:", e.message); }
  return out;
}

// ── INDEED RSS (up to 50 results) ─────────────────────────────
async function scrapeIndeed(role, location) {
  const out = [];
  try {
    const loc = location ? location.split(",")[0].trim() : "India";
    const r = await fetch(
      `https://www.indeed.co.in/rss?q=${encodeURIComponent(role)}&l=${encodeURIComponent(loc)}&sort=date&limit=50`,
      { headers: { "User-Agent": rua() } }
    );
    const xml = await r.text();
    const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
    for (const item of items) {
      const g = tag => (item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`)) || [])[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1").trim() || "";
      const title = g("title"), link = g("link"), desc = g("description"), pub = g("pubDate"), src = g("source");
      out.push({
        id: `indeed-${out.length}`, title: title.replace(/ - [^-]+$/, "").trim(),
        company: src || (title.match(/- ([^-]+)$/) || [])[1]?.trim() || "",
        location: loc, date: pub ? new Date(pub).toISOString() : new Date().toISOString(),
        url: link, source: "indeed", sourceLabel: "Indeed",
        description: strip(desc), salary: "", experience: "",
      });
    }
  } catch (e) { console.error("Indeed:", e.message); }
  return out;
}

// ── LINKEDIN via GOOGLE (up to 30 results) ────────────────────
async function scrapeLinkedIn(role, location) {
  const out = [];
  try {
    const lq = location ? ` "${location.split(",")[0].trim()}"` : "";
    for (let s = 0; s < 30; s += 10) {
      try {
        const r = await fetch(
          `https://www.google.com/search?q=${encodeURIComponent(`site:linkedin.com/jobs/view "${role}"${lq}`)}&num=10&start=${s}&tbs=qdr:m`,
          { headers: { "User-Agent": rua(), Accept: "text/html", "Accept-Language": "en-US,en;q=0.9" } }
        );
        const html = await r.text();
        const matches = html.matchAll(/href="\/url\?q=(https?:\/\/[^"&]+linkedin\.com\/jobs[^"&]*)[^"]*"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/g);
        for (const m of matches) {
          const link = decodeURIComponent(m[1]);
          const raw = m[2].replace(/<[^>]*>/g, "").trim();
          let t = raw, c = "";
          const am = raw.match(/^(.+?)\s+(?:at|@)\s+(.+?)(?:\s*[-–|]\s*LinkedIn)?$/i);
          const pm = raw.match(/^(.+?)\s*[-–|]\s*(.+?)(?:\s*[-–|]\s*LinkedIn)?$/i);
          if (am) { t = am[1].trim(); c = am[2].trim(); }
          else if (pm) { t = pm[1].trim(); c = pm[2].replace(/LinkedIn/i, "").trim(); }
          else t = raw.replace(/\s*[-–|]?\s*LinkedIn.*$/i, "").trim();
          out.push({
            id: `linkedin-${out.length}`, title: t, company: c || "—",
            location: location || "See listing", date: new Date().toISOString(),
            url: link, source: "linkedin", sourceLabel: "LinkedIn",
            description: "", salary: "", experience: "",
          });
        }
        await wait(400);
      } catch { break; }
    }
  } catch (e) { console.error("LinkedIn:", e.message); }
  return out;
}

// ── REMOTIVE (up to 100) ──────────────────────────────────────
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

// ── ARBEITNOW ─────────────────────────────────────────────────
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

// ── REMOTEOK ──────────────────────────────────────────────────
async function fetchRemoteOK(q) {
  try {
    const r = await fetch("https://remoteok.com/api", { headers: { "User-Agent": rua() } });
    const d = await r.json();
    const words = q.toLowerCase().split(/\s+/);
    return d.filter(j => j.position &&
      words.some(w => `${j.position} ${j.company} ${(j.tags || []).join(" ")}`.toLowerCase().includes(w))
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

// ── HANDLER ───────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { role, location } = req.query;
  if (!role) return res.status(400).json({ error: "role is required" });

  console.log(`[OneDay] "${role}" @ "${location || "any"}"`);

  const [r1, r2, r3, r4, r5, r6] = await Promise.allSettled([
    scrapeNaukri(role, location),
    scrapeIndeed(role, location),
    scrapeLinkedIn(role, location),
    fetchRemotive(role),
    fetchArbeitnow(role),
    fetchRemoteOK(role),
  ]);

  const names = ["naukri", "indeed", "linkedin", "remotive", "arbeitnow", "remoteok"];
  const all = [r1, r2, r3, r4, r5, r6];
  let jobs = [];
  const counts = {};
  all.forEach((r, i) => {
    const j = r.status === "fulfilled" ? r.value : [];
    counts[names[i]] = j.length;
    jobs.push(...j);
  });

  // Dedupe
  const seen = new Set();
  jobs = jobs.filter(j => {
    const k = `${j.title.toLowerCase().trim()}::${j.company.toLowerCase().trim()}`;
    if (seen.has(k)) return false; seen.add(k); return true;
  });

  jobs.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  console.log(`[OneDay] ${jobs.length} jobs. Counts:`, counts);

  return res.status(200).json({ total: jobs.length, sourceCounts: counts, jobs, timestamp: new Date().toISOString() });
}
