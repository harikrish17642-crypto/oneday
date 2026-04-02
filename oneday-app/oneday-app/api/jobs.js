export const config = { maxDuration: 10 };

const strip = h => h ? h.replace(/<[^>]*>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim().substring(0, 300) : "";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
function timed(p, ms = 7000) { return Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error("timeout")), ms))]); }
function relevant(job, q) {
  const words = q.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const text = `${job.title} ${job.company} ${job.description || ""}`.toLowerCase();
  return words.some(w => text.includes(w));
}

// ── LINKEDIN PUBLIC PAGE (no login needed) ────────────────────
async function fetchLinkedIn(role, location) {
  try {
    const url = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(role)}&location=${encodeURIComponent(location || "India")}&sortBy=DD&position=1&pageNum=0`;
    const r = await timed(fetch(url, { headers: { "User-Agent": UA, Accept: "text/html", "Accept-Language": "en-US,en;q=0.9" }, redirect: "follow" }));
    if (!r.ok) return [];
    const html = await r.text();
    const jobs = [];
    // Parse job cards from LinkedIn's public HTML
    const cards = html.match(/<div[^>]*class="[^"]*base-card[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g) || [];
    for (const card of cards) {
      const titleM = card.match(/<h3[^>]*class="[^"]*base-search-card__title[^"]*"[^>]*>([\s\S]*?)<\/h3>/);
      const compM = card.match(/<h4[^>]*class="[^"]*base-search-card__subtitle[^"]*"[^>]*>([\s\S]*?)<\/h4>/);
      const locM = card.match(/<span[^>]*class="[^"]*job-search-card__location[^"]*"[^>]*>([\s\S]*?)<\/span>/);
      const linkM = card.match(/<a[^>]*href="(https:\/\/[^"]*linkedin\.com\/jobs\/view\/[^"]*)"/) || card.match(/href="(\/jobs\/view\/[^"]*)"/);
      const dateM = card.match(/<time[^>]*datetime="([^"]*)"/) ;
      if (!titleM) continue;
      const title = titleM[1].replace(/<[^>]*>/g,"").trim();
      const company = compM ? compM[1].replace(/<[^>]*>/g,"").trim() : "";
      const loc = locM ? locM[1].replace(/<[^>]*>/g,"").trim() : location || "";
      let link = linkM ? linkM[1] : "";
      if (link.startsWith("/")) link = "https://www.linkedin.com" + link;
      const date = dateM ? dateM[1] : new Date().toISOString();
      jobs.push({ id: `li-${jobs.length}`, title, company, location: loc, date, url: link.split("?")[0],
        source: "linkedin", sourceLabel: "LinkedIn", description: "", salary: "", experience: "" });
    }
    return jobs;
  } catch (e) { console.log("LinkedIn:", e.message); return []; }
}

// ── NAUKRI JSON API ───────────────────────────────────────────
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
      return { id: `nk-${j.jobId}`, title: j.title || "", company: j.companyName || "",
        location: ph.find(p => p.type === "location")?.label || location || "",
        date: j.createdDate || new Date().toISOString(),
        url: j.jdURL ? `https://www.naukri.com${j.jdURL}` : "",
        source: "naukri", sourceLabel: "Naukri",
        description: strip(j.jobDescription || ""),
        salary: ph.find(p => p.type === "salary")?.label || "",
        experience: ph.find(p => p.type === "experience")?.label || "" };
    });
  } catch (e) { console.log("Naukri:", e.message); return []; }
}

// ── NAUKRI HTML FALLBACK ──────────────────────────────────────
async function fetchNaukriHTML(role, location) {
  try {
    const slug = role.replace(/\s+/g, "-").toLowerCase();
    const loc = location ? `-in-${location.split(",")[0].trim().replace(/\s+/g, "-").toLowerCase()}` : "";
    const url = `https://www.naukri.com/${slug}-jobs${loc}?sort=date`;
    const r = await timed(fetch(url, { headers: { "User-Agent": UA, Accept: "text/html" } }));
    if (!r.ok) return [];
    const html = await r.text();
    const jobs = [];
    const cards = html.match(/<article[^>]*class="[^"]*jobTuple[^"]*"[^>]*>[\s\S]*?<\/article>/g) || [];
    for (const card of cards) {
      const titleM = card.match(/<a[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/a>/);
      const compM = card.match(/<a[^>]*class="[^"]*comp-name[^"]*"[^>]*>([\s\S]*?)<\/a>/) || card.match(/<span[^>]*class="[^"]*comp-name[^"]*"[^>]*>([\s\S]*?)<\/span>/);
      const locM = card.match(/<span[^>]*class="[^"]*loc[^"]*"[^>]*>([\s\S]*?)<\/span>/);
      const linkM = card.match(/<a[^>]*href="(https?:\/\/www\.naukri\.com\/job-listings[^"]*)"/);
      if (!titleM) continue;
      jobs.push({ id: `nk-html-${jobs.length}`, title: titleM[1].replace(/<[^>]*>/g,"").trim(),
        company: compM ? (compM[1]||compM[2]||"").replace(/<[^>]*>/g,"").trim() : "",
        location: locM ? locM[1].replace(/<[^>]*>/g,"").trim() : location || "",
        date: new Date().toISOString(), url: linkM ? linkM[1] : "",
        source: "naukri", sourceLabel: "Naukri", description: "", salary: "", experience: "" });
    }
    return jobs;
  } catch (e) { console.log("Naukri HTML:", e.message); return []; }
}

// ── FREE APIS ─────────────────────────────────────────────────
async function fetchRemotive(q) {
  try {
    const r = await timed(fetch(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(q)}&limit=100`));
    const d = await r.json();
    return (d.jobs || []).map(j => ({
      id: `rem-${j.id}`, title: j.title || "", company: j.company_name || "",
      location: j.candidate_required_location || "Remote", date: j.publication_date || "",
      url: j.url || "", source: "remotive", sourceLabel: "Remotive",
      description: strip(j.description), salary: j.salary || "", experience: "" }));
  } catch { return []; }
}

async function fetchArbeitnow(q) {
  try {
    const r = await timed(fetch(`https://www.arbeitnow.com/api/job-board-api?search=${encodeURIComponent(q)}`));
    const d = await r.json();
    return (d.data || []).map(j => ({
      id: `arb-${j.slug}`, title: j.title || "", company: j.company_name || "",
      location: j.location || "", date: j.created_at ? new Date(j.created_at * 1000).toISOString() : "",
      url: j.url || "", source: "arbeitnow", sourceLabel: "Arbeitnow",
      description: strip(j.description), salary: "", experience: "" }));
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
      salary: j.salary_min ? `$${j.salary_min}-${j.salary_max}` : "", experience: "" }));
  } catch { return []; }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  if (req.method === "OPTIONS") return res.status(200).end();
  const { role, location } = req.query;
  if (!role) return res.status(400).json({ error: "role is required" });

  const [rLi, rNk, rNkH, rRem, rArb, rRok] = await Promise.allSettled([
    fetchLinkedIn(role, location),
    fetchNaukri(role, location),
    fetchNaukriHTML(role, location),
    fetchRemotive(role),
    fetchArbeitnow(role),
    fetchRemoteOK(role),
  ]);

  const names = ["linkedin", "naukri", "naukri_html", "remotive", "arbeitnow", "remoteok"];
  const all = [rLi, rNk, rNkH, rRem, rArb, rRok];
  let jobs = [];
  const counts = {};
  all.forEach((r, i) => {
    let j = r.status === "fulfilled" ? r.value : [];
    // Filter arbeitnow to only relevant results
    if (names[i] === "arbeitnow") j = j.filter(job => relevant(job, role));
    // Merge naukri_html into naukri count
    const countKey = names[i] === "naukri_html" ? "naukri" : names[i];
    counts[countKey] = (counts[countKey] || 0) + j.length;
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
