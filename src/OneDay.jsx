import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
import _ from "lodash";
import {
  Search, MapPin, Briefcase, Clock, Download, ExternalLink, ChevronDown,
  Loader2, X, ArrowUpDown, FileSpreadsheet, FileText, Globe, Building2,
  Zap, Sparkles, Target, TrendingUp, Star, ArrowRight, CheckCircle2,
  SlidersHorizontal, Calendar, DollarSign, Flame, Coffee, Leaf
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   BRAND SYSTEM — One Day by HKCreations
   French Café · Sage & Linen · Parisian Editorial
   ═══════════════════════════════════════════════════════════ */
const B = {
  bg:         "#F6F1EA",
  bgWarm:     "#EDE7DB",
  bgCard:     "#FEFCF9",
  bgElevated: "#FFFFFF",
  bgInput:    "#FEFCF9",
  bgHero:     "#F0EBE1",
  sage:       "#7C8E6C",
  sageLight:  "#95A882",
  sageDark:   "#5E6D50",
  sageMist:   "rgba(124,142,108,0.07)",
  sageBorder: "rgba(124,142,108,0.20)",
  sageGlow:   "rgba(124,142,108,0.12)",
  terra:      "#C4704B",
  terraLight: "#D4845F",
  terraDim:   "rgba(196,112,75,0.08)",
  terraBorder:"rgba(196,112,75,0.20)",
  olive:      "#A09362",
  oliveDim:   "rgba(160,147,98,0.10)",
  text:       "#2C2A25",
  textSec:    "#6B665C",
  textDim:    "#9E978B",
  textMuted:  "#C5BFB3",
  border:     "rgba(44,42,37,0.08)",
  borderH:    "rgba(44,42,37,0.14)",
  shadow:     "0 1px 3px rgba(44,42,37,0.04), 0 4px 16px rgba(44,42,37,0.06)",
  shadowH:    "0 2px 8px rgba(44,42,37,0.06), 0 8px 32px rgba(44,42,37,0.10)",
  shadowSoft: "0 1px 2px rgba(44,42,37,0.03)",
  linkedin:   "#5B7FA5",
  naukri:     "#6872AB",
  indeed:     "#5A8CB8",
  remotive:   "#6E9E7A",
  remoteok:   "#C07D5A",
  arbeitnow:  "#8B7DB8",
  glassdoor:  "#5BA88A",
  radius:     "12px",
  radiusSm:   "9px",
  radiusXs:   "7px",
};

const LOCATIONS = [
  "Mumbai, India","Bangalore, India","Hyderabad, India","Chennai, India",
  "Pune, India","Delhi NCR, India","Noida, India","Gurugram, India",
  "Kolkata, India","Ahmedabad, India","Jaipur, India","Coimbatore, India",
  "Kochi, India","Thiruvananthapuram, India","Indore, India","Chandigarh, India",
  "Lucknow, India","Nagpur, India","Visakhapatnam, India","Mysore, India",
  "Bhubaneswar, India","Mangalore, India","Vadodara, India","Surat, India",
  "Remote","Remote — Worldwide","Remote — India","Remote — US","Remote — Europe",
  "New York, US","San Francisco, US","Seattle, US","Austin, US","Chicago, US",
  "Boston, US","Los Angeles, US","Denver, US","Atlanta, US","Dallas, US",
  "Washington DC, US","San Jose, US","Portland, US","Miami, US",
  "London, UK","Manchester, UK","Berlin, Germany","Amsterdam, Netherlands",
  "Dublin, Ireland","Paris, France","Zurich, Switzerland","Barcelona, Spain",
  "Stockholm, Sweden","Munich, Germany","Warsaw, Poland",
  "Singapore","Dubai, UAE","Tokyo, Japan","Sydney, Australia",
  "Toronto, Canada","Vancouver, Canada",
];

const SOURCES = [
  { id:"all",       label:"All",        color:B.sage,      icon:Globe },
  { id:"linkedin",  label:"LinkedIn",   color:B.linkedin,  icon:Building2 },
  { id:"naukri",    label:"Naukri",      color:B.naukri,    icon:Building2 },
  { id:"indeed",    label:"Indeed",      color:B.indeed,    icon:Globe },
  { id:"remotive",  label:"Remotive",    color:B.remotive,  icon:Globe },
  { id:"arbeitnow", label:"Arbeitnow",  color:B.arbeitnow, icon:Globe },
  { id:"remoteok",  label:"RemoteOK",   color:B.remoteok,  icon:Zap },
];

const EXP_OPTIONS = [
  { value:"",    label:"Any Experience" },
  { value:"0-1", label:"Fresher · 0–1 yr" },
  { value:"1-3", label:"Junior · 1–3 yrs" },
  { value:"3-5", label:"Mid-level · 3–5 yrs" },
  { value:"5-10",label:"Senior · 5–10 yrs" },
  { value:"10+", label:"Lead · 10+ yrs" },
];

const MOTIFS = [
  "Good things begin with a single search.",
  "Somewhere out there, your next chapter is waiting.",
  "Take your time. The right role will come.",
  "A calm mind finds the best opportunities.",
  "Today is as good a day as any to begin.",
  "One search closer to where you belong.",
];

const SEARCH_MSGS = [
  "Gathering openings for you…",
  "Checking across platforms…",
  "Almost ready — patience, mon ami…",
  "Curating the freshest listings…",
];

/* ═══════════════════════════════════════════════════════════ */
function timeAgo(ds) {
  if (!ds) return "";
  const d = new Date(ds);
  if (isNaN(d)) return ds;
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  if (s < 604800) return `${Math.floor(s/86400)}d ago`;
  if (s < 2592000) return `${Math.floor(s/604800)}w ago`;
  return d.toLocaleDateString("en-IN",{day:"numeric",month:"short"});
}
function strip(h){return h?h.replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim().substring(0,300):"";}

/* ── Fetch jobs from Vercel serverless function ──────────── */
async function fetchJobs(role, locations) {
  const allJobs = [];
  // If multiple locations, run a search per location + one without location
  const searchLocs = locations.length > 0 ? [...locations] : [""];
  
  const fetches = searchLocs.map(async (loc) => {
    try {
      const params = new URLSearchParams({ role });
      if (loc) params.set("location", loc.split(",")[0].trim());
      const res = await fetch(`/api/jobs?${params}`);
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      return data.jobs || [];
    } catch (e) {
      console.warn("API fetch failed for", loc, e);
      return [];
    }
  });

  const results = await Promise.allSettled(fetches);
  for (const r of results) {
    if (r.status === "fulfilled") allJobs.push(...r.value);
  }
  return allJobs;
}
function dateSort(a,b){return new Date(b.date||0)-new Date(a.date||0);}
function matchesExp(j,e){
  if(!e)return true;
  const t=`${j.title} ${j.experience||""} ${j.description||""}`.toLowerCase();
  if(e==="0-1")return/fresher|entry|junior|0[- ]?1|intern|graduate/i.test(t)||!t.match(/\d+\+?\s*(?:yr|year)/);
  if(e==="1-3")return/1[- ]?3|junior|associate|1\+|2\+/i.test(t);
  if(e==="3-5")return/3[- ]?5|mid|3\+|4\+/i.test(t);
  if(e==="5-10")return/5[- ]?10|senior|5\+|6\+|7\+|8\+/i.test(t);
  if(e==="10+")return/10\+|lead|principal|director|head|architect|staff/i.test(t);
  return true;
}

/* ── URLs ─────────────────────────────────────────────────── */
function linkedinURL(r,l){return`https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(r)}&location=${encodeURIComponent(l||"")}&f_TPR=r604800&sortBy=DD`;}
function naukriURL(r,l,e){const s=r.replace(/\s+/g,"-").toLowerCase();const loc=l?`-in-${l.split(",")[0].trim().replace(/\s+/g,"-").toLowerCase()}`:"";return`https://www.naukri.com/${s}-jobs${loc}?sort=date${e?`&experience=${e.replace("+","")}`:""}` ;}
function indeedURL(r,l){return`https://www.indeed.co.in/jobs?q=${encodeURIComponent(r)}&l=${encodeURIComponent(l||"India")}&sort=date`;}
function glassdoorURL(r,l){return`https://www.glassdoor.co.in/Job/jobs.htm?sc=GD_JOB_AD&q=${encodeURIComponent(r)}&l=${encodeURIComponent(l||"")}`;}

/* ── Download ─────────────────────────────────────────────── */
function dlXLSX(jobs,p){
  const rows=jobs.map((j,i)=>({"#":i+1,"Role":j.title,"Company":j.company,"Location":j.location,"Posted":j.date?new Date(j.date).toLocaleDateString("en-IN"):"—","Source":j.sourceLabel,"Salary":j.salary||"—","Apply Link":j.url}));
  const ws=XLSX.utils.json_to_sheet(rows);ws["!cols"]=[{wch:4},{wch:44},{wch:26},{wch:22},{wch:14},{wch:12},{wch:18},{wch:52}];
  const rng=XLSX.utils.decode_range(ws["!ref"]);for(let r=rng.s.r+1;r<=rng.e.r;r++){const c=ws[XLSX.utils.encode_cell({r,c:7})];if(c&&c.v)c.l={Target:c.v};}
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Jobs");
  const info=XLSX.utils.aoa_to_sheet([["One Day — Search Results"],[`Role: ${p.role}`],[`Location: ${p.location||"All"}`],[`Experience: ${p.experience||"All"}`],[`Exported: ${new Date().toLocaleString("en-IN")}`],[`Total: ${jobs.length} openings`],[""],[`oneday.hkcreations.in`]]);
  info["!cols"]=[{wch:50}];XLSX.utils.book_append_sheet(wb,info,"Info");XLSX.writeFile(wb,`OneDay_${p.role.replace(/\s+/g,"_")}_${new Date().toISOString().slice(0,10)}.xlsx`);
}
function dlCSV(jobs){const h="Role,Company,Location,Posted,Source,Salary,Link\n";const r=jobs.map(j=>[`"${(j.title||"").replace(/"/g,'""')}"`,`"${(j.company||"").replace(/"/g,'""')}"`,`"${(j.location||"").replace(/"/g,'""')}"`,`"${j.date?new Date(j.date).toLocaleDateString("en-IN"):"—"}"`,`"${j.sourceLabel}"`,`"${j.salary||"—"}"`,`"${j.url}"`].join(",")).join("\n");const b=new Blob([h+r],{type:"text/csv"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=`OneDay_results_${new Date().toISOString().slice(0,10)}.csv`;a.click();}

/* ═══════════════════════════════════════════════════════════
   LOGO
   ═══════════════════════════════════════════════════════════ */
function Logo({size=32}){
  return(
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="13" fill={B.sage}/>
      <path d="M24 10c-7 0-12 6-12 14v10h4V24c0-5.5 3.5-10 8-10s8 4.5 8 10v10h4V24c0-8-5-14-12-14z" fill="#F6F1EA" opacity=".95"/>
      <circle cx="24" cy="22" r="3" fill={B.sage}/>
      <path d="M19 38h10" stroke="#F6F1EA" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}
function LogoFull({size=28}){
  return(<div style={{display:"flex",alignItems:"center",gap:10}}>
    <Logo size={size}/>
    <div style={{lineHeight:1}}>
      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:size*0.78,fontWeight:700,color:B.text,letterSpacing:"-0.3px"}}>One Day</div>
      <div style={{fontSize:Math.max(size*0.28,8.5),fontWeight:600,color:B.textDim,letterSpacing:"2.5px",textTransform:"uppercase",marginTop:1}}>HKCreations</div>
    </div>
  </div>);
}
function BotanicalDivider(){
  return(<div style={{display:"flex",alignItems:"center",gap:12,margin:"6px 0",opacity:.3}}>
    <div style={{flex:1,height:1,background:`linear-gradient(90deg,transparent,${B.sage})`}}/>
    <Leaf size={12} color={B.sage}/>
    <div style={{flex:1,height:1,background:`linear-gradient(90deg,${B.sage},transparent)`}}/>
  </div>);
}

/* ═══════════════════════════════════════════════════════════
   LOCATION INPUT — Multi-chip
   ═══════════════════════════════════════════════════════════ */
function LocationInput({locations,onAdd,onRemove,onSearch}){
  const[focused,setFocused]=useState(false);const[input,setInput]=useState("");const[suggestions,setSuggestions]=useState([]);
  const ref=useRef(null);const inputRef=useRef(null);
  useEffect(()=>{if(!input.trim()||!focused){setSuggestions([]);return;}setSuggestions(LOCATIONS.filter(l=>l.toLowerCase().includes(input.toLowerCase())&&!locations.includes(l)).slice(0,7));},[input,focused,locations]);
  useEffect(()=>{const h=e=>{if(ref.current&&!ref.current.contains(e.target))setFocused(false);};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[]);
  const addLoc=loc=>{if(loc&&!locations.includes(loc))onAdd(loc);setInput("");inputRef.current?.focus();};
  const handleKey=e=>{if(e.key==="Enter"){e.preventDefault();if(suggestions.length>0)addLoc(suggestions[0]);else if(input.trim())addLoc(input.trim());else onSearch();}if(e.key==="Backspace"&&!input&&locations.length>0)onRemove(locations.length-1);};

  return(
    <div ref={ref} style={{flex:"1.5 1 220px",position:"relative"}}>
      <div onClick={()=>inputRef.current?.focus()}
        style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:5,
          padding:locations.length>0?"7px 10px 7px 12px":"0 10px 0 12px",minHeight:48,
          borderRadius:B.radiusSm,border:`1.5px solid ${focused?B.sageBorder:B.border}`,
          background:B.bgInput,transition:"all .25s",cursor:"text",
          boxShadow:focused?`0 0 0 3px ${B.sageMist}`:""}}>
        <MapPin size={14} style={{color:focused?B.sage:B.textDim,transition:"color .2s",flexShrink:0}}/>
        {locations.map((loc,i)=>(
          <span key={loc} style={{display:"inline-flex",alignItems:"center",gap:4,
            padding:"3px 8px 3px 10px",borderRadius:20,fontSize:11.5,fontWeight:600,
            background:B.sageMist,color:B.sage,border:`1px solid ${B.sageBorder}`,
            whiteSpace:"nowrap",animation:"fadeUp .15s ease both",letterSpacing:".2px"}}>
            {loc.split(",")[0].trim()}
            <button onClick={e=>{e.stopPropagation();onRemove(i);}}
              style={{display:"flex",alignItems:"center",justifyContent:"center",width:15,height:15,
                borderRadius:"50%",border:"none",background:"transparent",color:B.sage,cursor:"pointer",
                padding:0,transition:"background .1s"}}
              onMouseEnter={e=>e.currentTarget.style.background=B.sageGlow}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}><X size={9}/></button>
          </span>
        ))}
        <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)}
          onFocus={()=>setFocused(true)} onKeyDown={handleKey}
          placeholder={locations.length===0?"Add locations…":"Add more…"}
          style={{flex:"1 1 80px",minWidth:80,padding:"6px 4px",border:"none",background:"transparent",
            fontSize:13.5,color:B.text,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/>
      </div>
      {suggestions.length>0&&focused&&(
        <div style={{position:"absolute",left:0,right:0,top:"calc(100% + 4px)",background:B.bgElevated,
          border:`1px solid ${B.borderH}`,borderRadius:B.radiusSm,boxShadow:B.shadowH,zIndex:100,
          maxHeight:260,overflowY:"auto",animation:"slideDown .18s ease"}}>
          {suggestions.map((s,i)=>(
            <button key={s} onClick={()=>addLoc(s)}
              style={{width:"100%",padding:"10px 16px",border:"none",background:"none",color:B.text,
                fontSize:13,cursor:"pointer",textAlign:"left",fontFamily:"'DM Sans',sans-serif",
                display:"flex",alignItems:"center",gap:10,
                borderBottom:i<suggestions.length-1?`1px solid ${B.border}`:"none",transition:"background .12s"}}
              onMouseEnter={e=>e.currentTarget.style.background=B.sageMist}
              onMouseLeave={e=>e.currentTarget.style.background="none"}>
              <MapPin size={12} color={B.textDim}/>
              <span>{s.split(",")[0]}<span style={{color:B.textDim}}>{s.includes(",")?", "+s.split(",").slice(1).join(",").trim():""}</span></span>
              <span style={{marginLeft:"auto",fontSize:10,color:B.textMuted}}>Enter ↵</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
function SourceBadge({source}){const s=SOURCES.find(x=>x.id===source);const c=s?.color||B.textSec;
  return(<span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 10px",borderRadius:20,fontSize:10,fontWeight:700,letterSpacing:".5px",textTransform:"uppercase",background:c+"0C",color:c,border:`1px solid ${c}18`}}><span style={{width:5,height:5,borderRadius:"50%",background:c,opacity:.7}}/>{s?.label||source}</span>);}

/* ═══════════════════════════════════════════════════════════
   JOB CARD
   ═══════════════════════════════════════════════════════════ */
function JobCard({job,idx}){
  const[hov,setHov]=useState(false);
  return(
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{background:B.bgCard,borderRadius:B.radius,border:`1px solid ${hov?B.sageBorder:B.border}`,
        padding:"22px 26px",boxShadow:hov?B.shadowH:B.shadow,transform:hov?"translateY(-2px)":"none",
        transition:"all .28s cubic-bezier(.4,0,.2,1)",
        animation:`fadeUp .4s cubic-bezier(.4,0,.2,1) ${Math.min(idx*0.05,0.5)}s both`,
        position:"relative",overflow:"hidden"}}>
      {hov&&<div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${B.sage},transparent)`,opacity:.35}}/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:14}}>
        <div style={{flex:1,minWidth:0}}>
          <a href={job.url} target="_blank" rel="noopener noreferrer"
            style={{fontSize:16,fontWeight:600,color:B.text,textDecoration:"none",display:"block",
              lineHeight:1.4,transition:"color .15s",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}
            onMouseEnter={e=>e.target.style.color=B.sage} onMouseLeave={e=>e.target.style.color=B.text}>
            {job.title}
          </a>
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:5,fontSize:13.5,color:B.textSec}}>
            <Building2 size={13} style={{opacity:.5}}/> {job.company}
          </div>
        </div>
        <SourceBadge source={job.source}/>
      </div>
      {job.description&&(
        <p style={{fontSize:13,lineHeight:1.65,color:B.textDim,margin:"12px 0 0",
          display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{job.description}</p>
      )}
      <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap",marginTop:14,paddingTop:12,borderTop:`1px solid ${B.border}`}}>
        <span style={{display:"flex",alignItems:"center",gap:5,fontSize:12.5,color:B.textSec}}><MapPin size={12}/> {job.location}</span>
        {job.salary&&<span style={{display:"flex",alignItems:"center",gap:5,fontSize:12.5,color:B.terra,fontWeight:600}}><DollarSign size={12}/> {job.salary}</span>}
        {job.date&&<span style={{display:"flex",alignItems:"center",gap:5,fontSize:12,color:B.textMuted}}><Clock size={11}/> {timeAgo(job.date)}</span>}
        <a href={job.url} target="_blank" rel="noopener noreferrer"
          style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6,fontSize:12.5,fontWeight:700,
            color:"#fff",textDecoration:"none",padding:"7px 18px",borderRadius:B.radiusXs,
            background:B.terra,border:"none",transition:"all .18s",letterSpacing:".2px"}}
          onMouseEnter={e=>e.currentTarget.style.background=B.terraLight}
          onMouseLeave={e=>e.currentTarget.style.background=B.terra}>
          Apply <ArrowRight size={13}/>
        </a>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   DIRECT LINKS
   ═══════════════════════════════════════════════════════════ */
function DirectPanel({role,locations,experience}){
  const locs=locations.length>0?locations:[""];
  return(
    <div style={{background:B.bgCard,borderRadius:B.radius,border:`1px solid ${B.border}`,padding:"20px 24px",marginBottom:20,boxShadow:B.shadowSoft,animation:"fadeUp .35s ease both"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
        <div style={{width:26,height:26,borderRadius:7,background:B.terraDim,display:"flex",alignItems:"center",justifyContent:"center"}}><Flame size={13} color={B.terra}/></div>
        <span style={{fontSize:13.5,fontWeight:700,color:B.text}}>Open directly on top platforms</span>
        <span style={{fontSize:11,color:B.textMuted,fontStyle:"italic"}}>— newest first</span>
      </div>
      {locs.map((loc,li)=>(
        <div key={loc||"any"} style={{marginBottom:li<locs.length-1?14:0}}>
          {locs.length>1&&loc&&<div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}><MapPin size={11} color={B.textDim}/><span style={{fontSize:12,fontWeight:600,color:B.textSec}}>{loc}</span></div>}
          <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
            {[{label:"LinkedIn",url:linkedinURL(role,loc),color:B.linkedin,icon:Building2},{label:"Naukri",url:naukriURL(role,loc,experience),color:B.naukri,icon:Target},{label:"Indeed",url:indeedURL(role,loc),color:B.indeed,icon:Search},{label:"Glassdoor",url:glassdoorURL(role,loc),color:B.glassdoor,icon:Star}].map(l=><DirectBtn key={l.label+loc} {...l}/>)}
          </div>
        </div>
      ))}
    </div>
  );
}
function DirectBtn({label,url,color,icon:Ic}){const[h,setH]=useState(false);
  return(<a href={url} target="_blank" rel="noopener noreferrer" onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
    style={{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 16px",borderRadius:B.radiusXs,
      background:h?color:color+"0C",color:h?"#fff":color,fontWeight:600,fontSize:12.5,textDecoration:"none",
      border:`1.5px solid ${h?color:color+"22"}`,transition:"all .2s",cursor:"pointer"}}>
    <Ic size={13}/> {label} <ExternalLink size={11} style={{opacity:.6}}/></a>);}

/* ═══════════════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════════════ */
export default function OneDay(){
  const[role,setRole]=useState("");
  const[locations,setLocations]=useState([]);
  const[experience,setExperience]=useState("");
  const[activeSource,setActiveSource]=useState("all");
  const[jobs,setJobs]=useState([]);
  const[loading,setLoading]=useState(false);
  const[searched,setSearched]=useState(false);
  const[sortBy,setSortBy]=useState("date");
  const[showDL,setShowDL]=useState(false);
  const[searchMsg,setSearchMsg]=useState(0);
  const[motif]=useState(()=>MOTIFS[Math.floor(Math.random()*MOTIFS.length)]);
  const dlRef=useRef(null);

  useEffect(()=>{const h=e=>{if(dlRef.current&&!dlRef.current.contains(e.target))setShowDL(false);};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[]);
  useEffect(()=>{if(!loading)return;const iv=setInterval(()=>setSearchMsg(p=>(p+1)%SEARCH_MSGS.length),2400);return()=>clearInterval(iv);},[loading]);

  const handleSearch=useCallback(async()=>{
    if(!role.trim())return;setLoading(true);setSearched(true);setJobs([]);setSearchMsg(0);
    let all = await fetchJobs(role.trim(), locations);
    if(experience)all=all.filter(j=>matchesExp(j,experience));
    all=_.uniqBy(all,j=>`${j.title.toLowerCase()}::${j.company.toLowerCase()}`);
    all.sort(dateSort);
    setJobs(all);setLoading(false);
  },[role,locations,experience]);

  const filtered=useMemo(()=>{let l=activeSource==="all"?jobs:jobs.filter(j=>j.source===activeSource);if(sortBy==="date")l=[...l].sort(dateSort);else if(sortBy==="company")l=[...l].sort((a,b)=>a.company.localeCompare(b.company));else if(sortBy==="title")l=[...l].sort((a,b)=>a.title.localeCompare(b.title));return l;},[jobs,activeSource,sortBy]);
  const counts=useMemo(()=>{const c={all:jobs.length};jobs.forEach(j=>{c[j.source]=(c[j.source]||0)+1;});return c;},[jobs]);

  return(
    <div style={{fontFamily:"'DM Sans',sans-serif",color:B.text,minHeight:"100vh",WebkitFontSmoothing:"antialiased",position:"relative",
      background:`
        radial-gradient(ellipse 600px 600px at 10% 15%, rgba(124,142,108,0.09) 0%, transparent 70%),
        radial-gradient(ellipse 500px 500px at 85% 50%, rgba(196,112,75,0.06) 0%, transparent 70%),
        radial-gradient(ellipse 450px 450px at 30% 85%, rgba(160,147,98,0.07) 0%, transparent 70%),
        radial-gradient(ellipse 350px 350px at 70% 20%, rgba(124,142,108,0.05) 0%, transparent 60%),
        repeating-linear-gradient(0deg, transparent, transparent 79px, rgba(124,142,108,0.025) 79px, rgba(124,142,108,0.025) 80px),
        url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='280' height='320'><path d='M40 60c20-30 50-35 60-10s-10 50-40 55S20 90 40 60z' fill='#7C8E6C' opacity='.06'/><path d='M45 63c15-22 38-26 46-8' stroke='#5E6D50' stroke-width='.8' fill='none' opacity='.06'/><path d='M160 180c-15-25 5-60 30-55s35 40 15 60-30 20-45-5z' fill='#7C8E6C' opacity='.05'/><path d='M163 183c-10-18 5-44 23-40' stroke='#5E6D50' stroke-width='.6' fill='none' opacity='.05'/><path d='M230 80c10-18 30-20 35-5s-5 30-25 32-20-10-10-27z' fill='#95A882' opacity='.04'/><path d='M80 260c18-15 45-10 45 10s-20 35-40 30-22-25-5-40z' fill='#7C8E6C' opacity='.045'/><path d='M83 262c13-11 34-7 34 8' stroke='#5E6D50' stroke-width='.6' fill='none' opacity='.04'/><circle cx='120' cy='120' r='3' fill='#A09362' opacity='.06'/><circle cx='200' cy='40' r='2.5' fill='#A09362' opacity='.05'/><circle cx='50' cy='200' r='2' fill='#C4704B' opacity='.05'/><circle cx='250' cy='250' r='2.5' fill='#7C8E6C' opacity='.05'/><path d='M115 115c8-12 15-10 20-2' stroke='#7C8E6C' stroke-width='.7' fill='none' opacity='.05'/><path d='M195 35c6-8 12-8 16-2' stroke='#95A882' stroke-width='.6' fill='none' opacity='.04'/></svg>`)}"),
        url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch' seed='3'/><feColorMatrix type='saturate' values='0'/></filter><rect width='200' height='200' filter='url(%23n)' opacity='0.035'/></svg>`)}"),
        ${B.bg}
      `}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap');
        *{box-sizing:border-box;margin:0;}::selection{background:${B.sage}25;color:${B.text};}
        input,select,button{font-family:'DM Sans',sans-serif;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes gentlePulse{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}
        input::placeholder{color:${B.textMuted};}
        ::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:${B.textMuted};border-radius:3px;}
        body{background:${B.bg};}
      `}</style>

      {/* ── HEADER ───────────────────────────────────────── */}
      <header style={{position:"relative",overflow:"hidden",borderBottom:`1px solid ${B.border}`,background:B.bgHero}}>
        {/* Subtle texture */}
        <div style={{position:"absolute",inset:0,backgroundImage:`url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.02'/%3E%3C/svg%3E")`,pointerEvents:"none",opacity:.6}}/>
        <div style={{position:"absolute",top:-100,right:-50,width:300,height:300,borderRadius:"50%",background:`radial-gradient(circle,${B.sage}06 0%,transparent 70%)`,pointerEvents:"none"}}/>
        <div style={{position:"absolute",bottom:-80,left:"10%",width:250,height:250,borderRadius:"50%",background:`radial-gradient(circle,${B.sage}04 0%,transparent 70%)`,pointerEvents:"none"}}/>

        <div style={{maxWidth:1080,margin:"0 auto",padding:"0 24px",position:"relative"}}>
          <nav style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 0",borderBottom:`1px solid ${B.border}`}}>
            <LogoFull size={28}/>
            <span style={{fontSize:11,color:B.sage,padding:"5px 13px",borderRadius:20,background:B.sageMist,border:`1px solid ${B.sageBorder}`,fontWeight:600,letterSpacing:".4px",display:"flex",alignItems:"center",gap:5}}>
              <Coffee size={11}/> Café Mode
            </span>
          </nav>

          {/* Hero */}
          <div style={{padding:"50px 0 12px",maxWidth:580,animation:"fadeUp .6s ease both"}}>
            <p style={{fontSize:12,fontWeight:600,letterSpacing:"3px",textTransform:"uppercase",color:B.sage,marginBottom:14,display:"flex",alignItems:"center",gap:8}}><Leaf size={13}/> Your career, reimagined</p>
            <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:46,fontWeight:500,lineHeight:1.12,color:B.text,marginBottom:16,letterSpacing:"-0.5px",fontStyle:"italic"}}>
              Find the role you<br/><span style={{fontWeight:700,fontStyle:"normal",color:B.sageDark}}>truly deserve.</span>
            </h1>
            <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,lineHeight:1.65,color:B.textSec,maxWidth:440,fontStyle:"italic"}}>{motif}</p>
          </div>

          {/* Search */}
          <div style={{padding:"28px 0 38px",animation:"fadeUp .6s ease .12s both"}}>
            <div style={{display:"flex",gap:9,flexWrap:"wrap",alignItems:"stretch"}}>
              <div style={{flex:"2 1 220px",position:"relative"}}>
                <Search size={15} style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:B.textDim,zIndex:2,pointerEvents:"none"}}/>
                <input value={role} onChange={e=>setRole(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSearch()}
                  placeholder="Role, skill, or keyword"
                  style={{width:"100%",padding:"14px 14px 14px 40px",borderRadius:B.radiusSm,border:`1.5px solid ${B.border}`,background:B.bgInput,fontSize:14,color:B.text,outline:"none",transition:"all .25s"}}
                  onFocus={e=>e.target.style.borderColor=B.sageBorder} onBlur={e=>e.target.style.borderColor=B.border}/>
              </div>
              <LocationInput locations={locations} onAdd={l=>setLocations(p=>[...p,l])} onRemove={i=>setLocations(p=>p.filter((_,x)=>x!==i))} onSearch={handleSearch}/>
              <div style={{flex:"1 1 150px",position:"relative"}}>
                <Briefcase size={14} style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:B.textDim,zIndex:2,pointerEvents:"none"}}/>
                <select value={experience} onChange={e=>setExperience(e.target.value)}
                  style={{width:"100%",padding:"14px 14px 14px 40px",borderRadius:B.radiusSm,border:`1.5px solid ${B.border}`,background:B.bgInput,fontSize:14,color:experience?B.text:B.textDim,outline:"none",appearance:"none",cursor:"pointer"}}>
                  {EXP_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown size={14} style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",color:B.textDim,pointerEvents:"none"}}/>
              </div>
              <button onClick={handleSearch} disabled={loading||!role.trim()}
                style={{flex:"0 0 auto",padding:"0 34px",borderRadius:B.radiusSm,border:"none",
                  background:loading||!role.trim()?B.textMuted:B.sage,color:"#fff",fontSize:14.5,fontWeight:700,
                  cursor:"pointer",display:"flex",alignItems:"center",gap:8,transition:"all .2s",minHeight:48,
                  boxShadow:loading||!role.trim()?"none":`0 2px 12px ${B.sageGlow}`}}>
                {loading?<Loader2 size={17} style={{animation:"spin .8s linear infinite"}}/>:<Search size={16}/>}
                {loading?"Searching…":"Search"}
              </button>
            </div>
            {/* Quick pills */}
            <div style={{display:"flex",gap:6,marginTop:14,flexWrap:"wrap",animation:"fadeUp .4s ease .25s both"}}>
              <span style={{fontSize:11.5,color:B.textDim,padding:"4px 0",marginRight:4,fontStyle:"italic"}}>Popular:</span>
              {["Mainframe Developer","COBOL Developer","React Developer","Data Engineer","Product Manager","DevOps Engineer"].map(t=>(
                <button key={t} onClick={()=>setRole(t)} style={{padding:"5px 13px",borderRadius:20,border:`1px solid ${B.border}`,background:"transparent",color:B.textSec,fontSize:11.5,cursor:"pointer",transition:"all .18s",fontWeight:500}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=B.sageBorder;e.currentTarget.style.color=B.sage;e.currentTarget.style.background=B.sageMist;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=B.border;e.currentTarget.style.color=B.textSec;e.currentTarget.style.background="transparent";}}>{t}</button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ── MAIN ─────────────────────────────────────────── */}
      <main style={{maxWidth:1080,margin:"0 auto",padding:"24px 24px 100px"}}>
        {searched&&role.trim()&&<DirectPanel role={role} locations={locations} experience={experience}/>}

        {/* Filters */}
        {searched&&!loading&&jobs.length>0&&(
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,marginBottom:18,flexWrap:"wrap",animation:"fadeUp .3s ease both"}}>
            <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
              <SlidersHorizontal size={13} color={B.textDim} style={{marginRight:4}}/>
              {SOURCES.map(s=>(
                <button key={s.id} onClick={()=>setActiveSource(s.id)}
                  style={{padding:"5px 13px",borderRadius:20,fontSize:12,fontWeight:600,
                    border:`1.5px solid ${activeSource===s.id?(s.color||B.sage)+"35":B.border}`,
                    background:activeSource===s.id?(s.color||B.sage)+"0A":"transparent",
                    color:activeSource===s.id?(s.color||B.sage):B.textDim,cursor:"pointer",transition:"all .18s",display:"flex",alignItems:"center",gap:5}}>
                  {s.label}{counts[s.id]>0&&<span style={{fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:10,background:activeSource===s.id?(s.color||B.sage)+"10":B.bgWarm}}>{counts[s.id]}</span>}
                </button>
              ))}
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <div style={{position:"relative"}}>
                <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{padding:"6px 28px 6px 12px",borderRadius:B.radiusXs,border:`1.5px solid ${B.border}`,background:B.bgCard,fontSize:12,color:B.textSec,cursor:"pointer",appearance:"none",outline:"none"}}>
                  <option value="date">Newest first</option><option value="company">By company</option><option value="title">By title</option>
                </select>
                <ArrowUpDown size={11} color={B.textDim} style={{position:"absolute",right:9,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}/>
              </div>
              {filtered.length>0&&(
                <div ref={dlRef} style={{position:"relative"}}>
                  <button onClick={()=>setShowDL(!showDL)} style={{padding:"6px 16px",borderRadius:B.radiusXs,border:`1.5px solid ${B.sageBorder}`,background:B.sageMist,color:B.sage,fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
                    <Download size={13}/> Export <ChevronDown size={11} style={{transform:showDL?"rotate(180deg)":"none",transition:"transform .2s"}}/>
                  </button>
                  {showDL&&(
                    <div style={{position:"absolute",right:0,top:"calc(100% + 4px)",background:B.bgElevated,border:`1px solid ${B.borderH}`,borderRadius:B.radiusSm,boxShadow:B.shadowH,zIndex:50,minWidth:200,animation:"slideDown .12s ease"}}>
                      <button onClick={()=>{dlXLSX(filtered,{role,location:locations.join(", "),experience});setShowDL(false);}}
                        style={{width:"100%",padding:"12px 16px",border:"none",background:"none",color:B.text,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:10}}
                        onMouseEnter={e=>e.currentTarget.style.background=B.sageMist} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                        <FileSpreadsheet size={15} color={B.sage}/> Excel Spreadsheet <span style={{fontSize:10.5,color:B.textDim,marginLeft:"auto"}}>.xlsx</span>
                      </button>
                      <div style={{height:1,background:B.border}}/>
                      <button onClick={()=>{dlCSV(filtered);setShowDL(false);}}
                        style={{width:"100%",padding:"12px 16px",border:"none",background:"none",color:B.text,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:10}}
                        onMouseEnter={e=>e.currentTarget.style.background=B.sageMist} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                        <FileText size={15} color={B.linkedin}/> CSV File <span style={{fontSize:10.5,color:B.textDim,marginLeft:"auto"}}>.csv</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Count */}
        {!loading&&filtered.length>0&&(
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,animation:"fadeUp .25s ease both"}}>
            <CheckCircle2 size={14} color={B.sage}/>
            <span style={{fontSize:13,color:B.textSec}}><strong style={{color:B.text}}>{filtered.length}</strong> openings found{activeSource!=="all"&&` on ${SOURCES.find(s=>s.id===activeSource)?.label}`}</span>
          </div>
        )}

        {/* Loading */}
        {loading&&(
          <div style={{textAlign:"center",padding:"80px 20px",animation:"fadeUp .3s ease"}}>
            <div style={{width:60,height:60,borderRadius:16,background:B.sageMist,border:`1px solid ${B.sageBorder}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",animation:"gentlePulse 2.5s ease infinite"}}>
              <Coffee size={26} color={B.sage} style={{animation:"spin 3s linear infinite"}}/>
            </div>
            <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:500,color:B.text,marginBottom:6,fontStyle:"italic"}}>{SEARCH_MSGS[searchMsg]}</p>
            <p style={{fontSize:12.5,color:B.textDim}}>Brewing results from multiple platforms</p>
            <div style={{display:"flex",gap:6,justifyContent:"center",marginTop:22}}>
              {[0,1,2,3].map(i=>(<div key={i} style={{width:36,height:3,borderRadius:2,background:i<=searchMsg?B.sage:B.textMuted+"40",transition:"background .4s"}}/>))}
            </div>
          </div>
        )}

        {/* Empty */}
        {!loading&&searched&&filtered.length===0&&(
          <div style={{textAlign:"center",padding:"70px 20px",animation:"fadeUp .3s ease"}}>
            <div style={{width:60,height:60,borderRadius:16,background:B.bgWarm,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px"}}><Search size={24} color={B.textDim}/></div>
            <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:500,color:B.text,marginBottom:6}}>Nothing here yet</p>
            <p style={{fontSize:13.5,color:B.textDim,maxWidth:400,margin:"0 auto",lineHeight:1.6}}>Use the direct platform links above — LinkedIn and Naukri often have the richest results. Broadening your keywords also helps.</p>
          </div>
        )}

        {/* Welcome */}
        {!loading&&!searched&&(
          <div style={{padding:"50px 20px",animation:"fadeUp .5s ease .2s both"}}>
            <div style={{background:B.bgCard,borderRadius:16,border:`1px solid ${B.borderH}`,padding:"48px 40px",textAlign:"center",position:"relative",overflow:"hidden",marginBottom:24,boxShadow:B.shadow}}>
              <div style={{position:"absolute",inset:0,backgroundImage:`url("data:image/svg+xml,%3Csvg width='80' height='80' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.5' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.015'/%3E%3C/svg%3E")`,pointerEvents:"none"}}/>
              <div style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:60,height:3,borderRadius:2,background:B.sage,opacity:.5}}/>
              <div style={{position:"relative",zIndex:1}}>
                <div style={{display:"inline-flex",alignItems:"center",gap:12,marginBottom:28,padding:"10px 22px",borderRadius:12,background:B.sageMist,border:`1px solid ${B.sageBorder}`}}>
                  <Logo size={32}/><div style={{textAlign:"left"}}><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:700,color:B.text,lineHeight:1}}>One Day</div><div style={{fontSize:9,fontWeight:600,color:B.sage,letterSpacing:"2px",textTransform:"uppercase",marginTop:2}}>HKCreations</div></div>
                </div>
                <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:30,fontWeight:500,color:B.text,marginBottom:12,fontStyle:"italic",lineHeight:1.3}}>Your career command centre</h2>
                <BotanicalDivider/>
                <p style={{fontSize:15,color:B.textSec,maxWidth:420,margin:"12px auto 0",lineHeight:1.65}}>Search once — discover openings from LinkedIn, Naukri, Indeed, Glassdoor, and more. Sorted by date. Downloadable. Always fresh.</p>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:12}}>
              {[{icon:Target,label:"Multi-platform",desc:"All top job boards"},{icon:Calendar,label:"Newest first",desc:"Sorted by date posted"},{icon:Download,label:"Export ready",desc:"Excel & CSV downloads"},{icon:TrendingUp,label:"Always fresh",desc:"Real-time results"}].map((f,i)=>(
                <div key={f.label} style={{padding:"22px 20px",borderRadius:B.radius,background:B.bgCard,border:`1px solid ${B.border}`,textAlign:"center",animation:`fadeUp .4s ease ${0.3+i*0.08}s both`,transition:"all .22s",cursor:"default"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=B.sageBorder;e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=B.shadowH;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=B.border;e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="";}}>
                  <div style={{width:40,height:40,borderRadius:11,background:B.sageMist,display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:12,border:`1px solid ${B.sageBorder}`}}><f.icon size={18} color={B.sage}/></div>
                  <div style={{fontSize:13.5,fontWeight:700,color:B.text,marginBottom:3}}>{f.label}</div>
                  <div style={{fontSize:11.5,color:B.textDim}}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cards */}
        <div style={{display:"flex",flexDirection:"column",gap:10}}>{filtered.map((j,i)=><JobCard key={j.id} job={j} idx={i}/>)}</div>

        {/* Bottom CTA */}
        {!loading&&filtered.length>0&&role.trim()&&(
          <div style={{textAlign:"center",padding:"40px 20px",animation:"fadeUp .3s ease .3s both"}}>
            <div style={{display:"inline-flex",flexDirection:"column",alignItems:"center",gap:14,padding:"24px 32px",borderRadius:B.radius,background:B.bgCard,border:`1px solid ${B.border}`,boxShadow:B.shadow}}>
              <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,color:B.textSec,fontStyle:"italic"}}>Explore more on these platforms</span>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center"}}>
                {[{l:"LinkedIn",u:linkedinURL(role,locations[0]||""),c:B.linkedin},{l:"Naukri",u:naukriURL(role,locations[0]||"",experience),c:B.naukri},{l:"Indeed",u:indeedURL(role,locations[0]||""),c:B.indeed},{l:"Glassdoor",u:glassdoorURL(role,locations[0]||""),c:B.glassdoor}].map(x=>(
                  <a key={x.l} href={x.u} target="_blank" rel="noreferrer"
                    style={{padding:"8px 18px",borderRadius:B.radiusXs,background:x.c+"0A",color:x.c,fontSize:13,fontWeight:600,textDecoration:"none",border:`1px solid ${x.c}20`,transition:"all .18s"}}
                    onMouseEnter={e=>{e.currentTarget.style.background=x.c;e.currentTarget.style.color="#fff";}}
                    onMouseLeave={e=>{e.currentTarget.style.background=x.c+"0A";e.currentTarget.style.color=x.c;}}>
                    {x.l} <ExternalLink size={11} style={{marginLeft:4,verticalAlign:"-1px"}}/>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── FOOTER ────────────────────────────────────────── */}
      <footer style={{borderTop:`1px solid ${B.border}`,padding:"28px 24px",background:B.bgHero}}>
        <div style={{maxWidth:1080,margin:"0 auto",textAlign:"center"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:8}}>
            <Logo size={18}/>
            <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:15,fontWeight:600,color:B.text}}>One Day</span>
            <span style={{color:B.textMuted}}>·</span>
            <span style={{fontSize:11.5,color:B.textDim,letterSpacing:"1.5px",textTransform:"uppercase",fontWeight:500}}>HKCreations</span>
          </div>
          <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:14,color:B.textMuted,fontStyle:"italic"}}>Built with purpose. Made for dreamers.</p>
          <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:13,color:B.textMuted,marginTop:6,fontStyle:"italic",opacity:.5,letterSpacing:".3px"}}>idea credits — KS</p>
        </div>
      </footer>
    </div>
  );
}
