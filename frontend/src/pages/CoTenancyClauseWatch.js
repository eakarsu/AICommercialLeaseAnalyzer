import React, { useEffect, useState } from 'react';
const empty = { lease: '', anchorTenant: '', trigger: '', remedy: '', status: 'watch' };
export default function CoTenancyClauseWatch() {
  const [rows,setRows]=useState([]); const [summary,setSummary]=useState({total:0,review:0,watch:0}); const [form,setForm]=useState(empty);
  const load=async()=>{const r=await fetch('/api/co-tenancy-clause-watch');const d=await r.json();setRows(d.rows||[]);setSummary(d.summary||summary)}; useEffect(()=>{load()},[]);
  const submit=async e=>{e.preventDefault();await fetch('/api/co-tenancy-clause-watch',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});setForm(empty);load()};
  return <div className="page"><h1>Co-Tenancy Clause Watch</h1><p>Anchor tenant triggers, remedies, and review status across leases.</p><div className="stats-grid">{['total','review','watch'].map(k=><div className="stat-card" key={k}>{k}: {summary[k]}</div>)}</div><form onSubmit={submit}>{['lease','anchorTenant','trigger','remedy'].map(f=><input key={f} placeholder={f} value={form[f]} onChange={e=>setForm({...form,[f]:e.target.value})}/>)}<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>watch</option><option>review</option><option>clear</option></select><button>Add Watch</button></form><table><tbody>{rows.map(r=><tr key={r.id}><td>{r.lease}</td><td>{r.anchorTenant}</td><td>{r.trigger}</td><td>{r.remedy}</td><td>{r.status}</td></tr>)}</tbody></table></div>;
}
