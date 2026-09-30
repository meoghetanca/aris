const DATA = JSON.parse(document.getElementById('aris-data').textContent);
const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const has = x => Array.isArray(x) ? x.length > 0 : (x && typeof x === 'object' ? Object.keys(x).length > 0 : x != null && x !== '');
const S = {
  state:DATA.state??{}, manifest:DATA.manifest??{}, sources:DATA.sources?.sources??[],
  category:DATA.category, pains:DATA.pains?.pains??[], personas:DATA.personas?.personas??[],
  sizing:DATA.sizing, demand:DATA.demand, positioning:DATA.positioning, messages:DATA.messages,
  gtm:DATA.gtm, claims:DATA.claims?.claims??[], verify:DATA.verify,
  metrics:DATA.metrics?.metrics??[], dashboard:DATA.dashboard, rules:DATA.playbook?.rules??[],
  runway:DATA.runway?.weeks??[],
  assets:DATA.assets??{}, assumptions:DATA.assumptions?.assumptions??[], cuts:DATA.cutSteps?.cuts??[]
};
const srcById = new Map(S.sources.map(s=>[s.id,s]));
const painById = new Map(S.pains.map(p=>[p.id,p]));
const allMsgs = [...(S.messages?.personaMessages??[]).flatMap(pm=>(pm.messageHierarchy??[]).map(m=>({...m,personaId:pm.personaId}))),
                 ...(S.messages?.unattachedMessages??[])];
const money = o => { if(o==null) return null; if(typeof o!=='object') return E(o);
  const a=o.amount??o.value, cur=o.currency??'', u=o.unit??'';
  if(a==null) return null;
  const sym={USD:'$',EUR:'€',GBP:'£',VND:'₫'}[cur]??'';
  return `${sym}${E(a)}${sym?'':' '+E(cur)}${u?` <span>${E(u)}</span>`:''}`; };
function plain(c){ return ({
  messages_reach_a_persona:'Nothing you plan to say has a customer behind it.',
  citation_completeness:'Some claims have no source.',
  no_uncited_assertions:'Some sentences state a fact with nothing behind them.',
  no_fabricated_testimonials:'A testimonial appears that nobody real said.',
  required_disclosures_present:'Something the law expects you to state is missing.',
  no_forbidden_claims:'A claim appears that this field does not permit.',
  no_unsupported_superlatives:'A superlative appears with no evidence.',
  pricing_consistency:'Two assets quote different prices.',
  product_name_consistency:'The product name is spelled more than one way.',
  broken_links:'A link is broken or a placeholder.',
  tracking_present:'Nothing is tracked, so the launch will produce traffic nobody can attribute.',
  backward_links_resolve:'Something references evidence that does not exist.',
  every_marker_resolves:'An asset cites a claim id that does not exist.',
  every_attribute_has_evidence:'A persona has an attribute nobody actually said.'
})[c] ?? (c.replace(/_/g,' ')+'.'); }
const sec = (n,eyebrow,title,desc,body) =>
  `<section id="s${n}"><div class="shead"><p class="eyebrow">${E(n)} — ${E(eyebrow)}</p>
   <h2>${E(title)}</h2>${desc?`<p class="desc">${desc}</p>`:''}</div>${body}</section>`;

/* ================= masthead ================= */
(function mast(){
  const st=S.state, v=S.verify;
  const selDir=(S.positioning?.directions??[]).find(d=>d.id===S.positioning?.selected);
  document.getElementById('eyebrow').textContent =
    `${st.product?.name ?? 'Launch package'} · ${st.market?.category ?? 'launch package'}`;
  document.getElementById('headline').textContent =
    selDir?.name ? selDir.name : (st.product?.name ?? 'Launch package');
  // FOR / WHO / UNLIKE are scaffolding for writing the statement, not words to read.
  // Set small and quiet so the sentence reads as a sentence.
  document.getElementById('lede').innerHTML = selDir?.statement
    ? E(selDir.statement).replace(/\b(FOR|WHO|IS THE|THAT|UNLIKE|BECAUSE)\b/g,
        m => `<span class="kw">${m.toLowerCase()}</span>`)
    : '<span class="gap">No positioning selected yet. Nothing downstream means anything without it.</span>';

  const blocking=(v?.blockingIssues??[]).length;
  const price=money(S.gtm?.pricing?.recommended);
  const cited=S.claims.filter(c=>(c.sourceIds??[]).length).length;
  const validated=S.pains.filter(p=>p.status==='validated').length;
  const items=[
    [v ? (v.passed?'Ready':`${blocking}`) : '—',
     v ? (v.passed?'verification passed':'blocking issues') : 'never verified',
     v?.passed?'good':'bad'],
    [price ?? '—', 'price, recommended'],
    [`${cited}<small>/${S.claims.length}</small>`, 'claims cited'],
    S.pains.length
      ? [`${validated}<small>/${S.pains.length}</small>`, 'pains validated', validated?'':'bad']
      : ['none', 'customer research', 'bad'],
    [String((S.gtm?.channels??[]).filter(c=>c.priority==='primary').length), 'primary channels']
  ];
  document.getElementById('statbar').innerHTML = items.map(([n,l,cls])=>
    `<div class="sb ${cls??''}"><div class="n">${n}</div><div class="l">${E(l)}</div></div>`).join('');
  document.getElementById('foot').innerHTML =
    `${E(S.state.product?.name??'')} · generated ${E((DATA.generatedAt??'').slice(0,16).replace('T',' '))} · version ${E(S.manifest.version??'—')}.
     This page shows what is in <code>.aris/</code>; if the two disagree the files are right and this is stale.`;
})();

/* ================= what we know ================= */
function marketBlock(){
  const c=S.category;
  if(!c?.players?.length) return '<p class="gap">No competitors mapped yet.</p>';
  let out=`<div class="grid g3">`+c.players.map(p=>{
    const pr=(p.pricing??[])[0];
    return `<div class="card"><div class="nm">${E(p.name)}</div>
      <p class="sub">${E(p.type??'')}</p>
      ${(() => {
        // A price slot holds a price. When there is not one, say so in two words and put
        // the reason underneath, rather than squeezing a sentence into the big number.
        const m = pr ? money(pr) : null;
        if (m) return `<p class="big">${m}</p>`;
        const why = pr?.note ?? 'no price published';
        return `<p class="big none">Not published</p><p class="sub">${E(why)}</p>`;
      })()}
      <p>${E((p.positioning??[])[0]??'')}</p>
      ${(p.weaknesses??[]).length?`<ul>${(p.weaknesses??[]).slice(0,3).map(w=>`<li>${E(w)}</li>`).join('')}</ul>`:''}</div>`;
  }).join('')+`</div>`;
  if(has(c.marketGaps)) out+=c.marketGaps.map(g=>{
    const t=typeof g==='object'?g.value:g, ids=typeof g==='object'?(g.sourceIds??[]):[];
    return `<div class="callout"><b>Gap.</b> ${E(t)} ${ids.map(i=>`<span class="chip" data-src="${E(i)}">${E(i)}</span>`).join('')}</div>`;
  }).join('');
  return out;
}
function gridBlock(){
  const fm=S.category?.featureMatrix??{}; const rows=Object.keys(fm);
  if(!rows.length) return '';
  const mine=S.state.product?.name;
  /* Inverted deliberately: a vendors-by-capabilities grid makes the reader triangulate
     between a header row and a cell. One card per capability puts the question and every
     answer to it in the same place. */
  const mark=c=>{ if(c==null) return ['unk','not checked'];
    const v=typeof c==='object'?c.value:c, st=typeof c==='object'?c.status:'unknown';
    if(v===true||v==='true'||v==='yes') return st==='unknown'?['unk','claimed, unchecked']:['yes','yes'];
    if(v===false||v==='false'||v==='no') return ['nope','no'];
    if(v==='partial') return ['part','partly'];
    return ['unk','not checked']; };
  return `<div class="grid g2">`+rows.map(r=>{
    const vendors=Object.entries(fm[r]??{});
    const yes=vendors.filter(([n,c])=>mark(c)[0]==='yes'&&n!==mine).length;
    return `<div class="card">
      <div class="nm">${E(r)}</div>
      <p class="sub">${yes===0?'No competitor has this':yes===1?'One competitor has this':`${yes} competitors have this`}</p>
      <ul class="who">`+vendors.map(([n,c])=>{ const [cls,label]=mark(c);
        return `<li class="${cls}${n===mine?' me':''}"><span>${E(n)}</span><b>${E(label)}</b></li>`; }).join('')+
      `</ul></div>`; }).join('')+`</div>`;
}

function ladderBlock(){
  const lad=S.category?.priceLadder??[];
  const per=lad.filter(x=>/per user/i.test(x.unit??'')&&Number.isFinite(Number(x.amount)));
  if(per.length<2) return '';
  const other=lad.filter(x=>!per.includes(x));
  const rec=S.gtm?.pricing?.recommended;
  const recAmt=Number.isFinite(Number(rec?.amount))&&/per user/i.test(rec?.unit??'')?Number(rec.amount):null;
  const max=Math.max(...per.map(x=>Number(x.amount)),recAmt??0);
  const all=[...per.map(x=>({n:x.player,v:Number(x.amount),c:x.currency})),
             ...(recAmt!=null?[{n:'You',v:recAmt,c:rec.currency,you:true}]:[])].sort((a,b)=>a.v-b.v);
  const sym=c=>({USD:'$',EUR:'€'}[c]??'');
  return `<div class="bars">`+all.map(x=>
    `<div class="bar"><div class="nm">${E(x.n)}${x.you?'<small>recommended</small>':''}</div>
     <div class="track"><div class="fill${x.you?' you':''}" style="width:${(x.v/max*100).toFixed(1)}%"></div></div>
     <div class="v">${sym(x.c)}${x.v}</div></div>`).join('')+
    `<p class="legend">Per user, per month, as published.${other.length?' Priced differently and not comparable on this scale: '+
      other.map(o=>`${E(o.player)} (${E(o.note??o.unit??'')})`).join(', ')+'.':''}</p></div>`;
}
function customersBlock(){
  if(!S.pains.length) return `<div class="callout bad"><b>Nobody was asked anything.</b>
    No voice-of-customer research was run, so no pain here has a quote behind it and no persona was
    built. Everything under <b>What we do</b> rests on what competitors fail to sell, which is not the
    same as what buyers want.</div>`;
  return `<div class="grid g2">`+[...S.pains]
    .sort((a,b)=>(b.frequency?.quoteCount??0)-(a.frequency?.quoteCount??0)).map(p=>
    `<div class="card${p.status==='validated'?' hero':''}">
      <div class="row" style="border:none;padding:0;grid-template-columns:1fr auto">
        <div class="nm">${E(p.statement)}</div>
        <span class="flag ${p.status==='validated'?'':'wait'}">${p.status==='validated'?'validated':'too few'}</span></div>
      <p class="big">${p.frequency?.quoteCount??0}<span> people, in ${p.frequency?.sourceCount??0} places</span></p>
      ${(p.quotes??[]).slice(0,1).map(q=>`<p class="quoteline">“${E(q.text)}”</p>`).join('')}
      <p class="sub"><a href="#" data-pain="${E(p.id)}">Read all ${p.frequency?.quoteCount??0} →</a></p></div>`).join('')+`</div>`;
}

function sizeBlock(){
  let out='';
  if(S.sizing){
    out+=`<div class="grid g3">`+['tam','sam','som'].map(k=>{
      const c=S.sizing.calculations?.[k], r=c?.range;
      return `<div class="card"><div class="nm">${k.toUpperCase()}</div>
        <p class="big">${Array.isArray(r)?`${Number(r[0]).toLocaleString()}<span> – ${Number(r[1]).toLocaleString()}</span>`:'—'}</p>
        <p class="sub">${E(c?.formula??'')}</p></div>`;
    }).join('')+`</div>`;
    if(has(S.sizing.limitations)) out+=`<div class="callout wait"><b>Where it is weakest.</b>
      ${S.sizing.limitations.map(E).join(' ')}</div>`;
  }
  if(S.demand){
    out+=`<div class="callout wait"><span class="q">Whether anyone wants it</span>
      <b>Read off public pages, never tested.</b> ${(S.demand.doesNotProve??[]).length
      ? 'This does not prove '+S.demand.doesNotProve.map(E).join(', ')+'.' : ''}</div>`;
    out+=`<div class="grid g3">`+(S.demand.signals??[]).map(s=>{
      const v=s.value&&typeof s.value==='object'?Object.values(s.value)[0]:s.value;
      return `<div class="card"><div class="nm">${E(String(s.type??'').replace(/_/g,' '))}</div>
        <p class="big">${E(v??'—')}</p><p class="sub">${E(s.metric??'')}</p>
        <div>${s.sourceId?`<span class="chip" data-src="${E(s.sourceId)}">${E(s.sourceId)}</span>`:''}</div></div>`;
    }).join('')+`</div>`;
  }
  return out||'<p class="gap">Not sized.</p>';
}
function betsBlock(){
  const rank={total:0,high:1,medium:2,low:3};
  const cost={total:'the whole package rebuilds',high:'several artifacts rebuild',
    medium:'one artifact rebuilds',low:'fix it where it sits'};
  let out=[...S.assumptions].sort((a,b)=>(rank[a.blastRadius]??9)-(rank[b.blastRadius]??9)||(a.confidence??1)-(b.confidence??1))
    .map(a=>`<div class="card"><div class="row" style="border:none;padding:0;grid-template-columns:1fr auto">
      <div class="nm" style="font-size:.98rem">${E(a.statement)}</div>
      <span class="flag ${(a.confidence??0)<.5?'no':'wait'}">${Math.round((a.confidence??0)*100)}% sure</span></div>
      <p>${E(a.reason??'')}</p>
      <p class="sub" style="color:var(--no)">If wrong: ${E(cost[a.blastRadius]??'unknown')}</p></div>`).join('');
  out=`<div class="grid g2">${out}</div>`;
  if(S.cuts.length) out+=`<h3 style="margin-top:26px">What this package could not know</h3>
    <p class="tnote">Deliberate omissions. They are why some of the bets above are bets.</p>
    <div class="grid g2">`+S.cuts.map(c=>{
    /* `deleted` is the only field in this file dereferenced without a guard, and the
       cut schema is written by /aris rather than defined anywhere: a cut recorded as
       {step, reason} threw on c.deleted.replace, the inline script died at section 04,
       and sections 04-12 never rendered. The masthead still drew, so the page looked
       built. Accept the field under any of its names and never dereference it raw. */
    const what=c.deleted??c.step??c.what??c.name??'(unnamed cut)';
    const why=c.consequence??c.reason??'';
    return `<div class="card"><div class="row" style="border:none;padding:0;grid-template-columns:1fr auto">
      <div class="nm">${E(String(what).replace(/_/g,' '))}</div>
      <span class="flag ${c.risk==='high'?'no':'wait'}">${E(c.risk??'unstated')} risk</span></div>
      <p>${E(why)}</p></div>`;}).join('')+`</div>`;
  return out;
}
function sourcesBlock(){
  const used=new Map(); const note=(id,w)=>{ if(!id) return; if(!used.has(id)) used.set(id,[]); used.get(id).push(w); };
  for(const p of S.pains) for(const q of p.quotes??[]) note(q.sourceId,p.id);
  for(const f of S.sizing?.factors??[]) note(f.sourceId,f.id);
  for(const s of S.demand?.signals??[]) note(s.sourceId,s.id);
  for(const c of S.claims) for(const x of c.sourceIds??[]) note(x,c.id);
  let out=`<div class="srclist">`+S.sources.map(x=>{
    const u=[...new Set(used.get(x.id)??[])];
    return `<div class="src"><div class="id">${E(x.id)}</div>
      <div><a href="${E(x.url??'#')}" target="_blank" rel="noopener">${E(x.title||x.url||'untitled')}</a>
        <div class="sub">${E(x.publisher??'')} \u00b7 read ${E(x.accessedAt??'')} \u00b7
        ${u.length?'used by '+u.map(E).join(', '):'<span class="unk">used by nothing</span>'}</div></div></div>`;
  }).join('')+`</div>`;
  if(has(DATA.sources?.gaps)) out+=`<div class="callout bad"><b>What we could not read.</b>
    <ul class="plain" style="margin-top:8px">${DATA.sources.gaps.map(g=>`<li>${E(g)}</li>`).join('')}</ul></div>`;
  return out;
}

/* ================= what we do ================= */
function whyBlock(){
  const p=S.positioning; if(!p) return '<p class="gap">No positioning yet.</p>';
  const sel=(p.directions??[]).find(d=>d.id===p.selected);
  const rej=new Map((p.rejected??[]).map(r=>[r.id,r.reason]));
  let out='';
  if(sel&&has(sel.whitespace)) out+=`<div class="callout"><b>Why this one.</b>
    <ul class="plain" style="margin-top:8px">${sel.whitespace.map(w=>`<li>${E(w)}</li>`).join('')}</ul></div>`;
  const others=(p.directions??[]).filter(d=>d.id!==p.selected);
  if(others.length) out+=`<div class="grid g2">`+others.map(d=>
    `<div class="card"><div class="row" style="border:none;padding:0;grid-template-columns:1fr auto">
      <div class="nm">${E(d.name??d.id)}</div><span class="flag no">rejected</span></div>
      <p>${E(d.statement??'')}</p>
      <p class="sub" style="color:var(--no)">${E(rej.get(d.id)??'no reason recorded')}</p></div>`).join('')+`</div>`;
  return out;
}
function sayBlock(){
  const m=S.messages; if(!m) return '<p class="gap">No messaging yet.</p>';
  let out='';
  if(has(m.usp)) out+=`<div class="callout"><span class="q">The one sentence</span><b>${E(m.usp)}</b></div>`;
  if(allMsgs.length){
    out+=`<div class="grid g2">`+allMsgs.slice().sort((a,b)=>(a.priority??9)-(b.priority??9)).map(x=>
      `<div class="card${x.priority===1?' hero':''}">
        <div class="row" style="border:none;padding:0;grid-template-columns:1fr auto">
          <div class="nm">${E(x.message)}</div>
          ${x.priority===1?'<span class="flag">lead with this</span>':''}</div>
        <p>${E(x.benefit??'')}</p>
        <p class="sub">${has(x.proof)&&x.proof!=='unknown'?'Proof: '+E(x.proof):'<span style="color:var(--no)">No proof established</span>'}</p>
        <p class="sub">${E(x.id??'')}${x.cta?' · '+E(x.cta):''}${x.personaId?' · '+E(x.personaId):' · <span style="color:var(--no)">no customer behind it</span>'}</p></div>`).join('')+`</div>`;
  }
  if(has(m.elevatorPitch)) out+=`<div class="col" style="margin-top:20px">`+
    Object.entries(m.elevatorPitch).map(([k,v])=>`<h3>${E(k)}</h3><p>${E(v)}</p>`).join('')+`</div>`;
  if(has(m.featureToBenefit)) out+=`<h3 style="margin-top:26px">What each thing is for</h3><div class="grid g2">`+
    m.featureToBenefit.map(f=>`<div class="card"><div class="nm">${E(f.feature??'')}</div>
      <p>${E(f.benefit??'')}</p></div>`).join('')+`</div>`;
  if(has(m.tone?.avoid)) out+=`<p class="tnote"><b>Never write:</b> ${m.tone.avoid.map(E).join(' · ')}</p>`;
  return out;
}
function whereBlock(){
  const g=S.gtm; if(!g) return '<p class="gap">No plan yet.</p>';
  const ord={primary:0,secondary:1,test:2};
  let out=`<div class="grid g2">`+(g.channels??[]).slice().sort((a,b)=>(ord[a.priority]??9)-(ord[b.priority]??9)).map(c=>
    `<div class="card${c.priority==='primary'?' hero':''}">
      <div class="row" style="border:none;padding:0;grid-template-columns:1fr auto">
        <div class="nm">${E(c.channel)}</div>
        <span class="flag ${c.priority==='primary'?'':'wait'}">${E(c.priority??'')}</span></div>
      <p class="sub">${E(c.role??'')}</p>
      <p>${(c.competitorPresence??[]).map(E).join('; ')||'<span class="gap">no reason recorded</span>'}</p>
      ${c.note?`<p class="sub" style="color:var(--wait)">${E(c.note)}</p>`:''}</div>`).join('')+`</div>`;
  if(has(g.pricing)) out+=`<div class="callout"><span class="q">Price</span>
    <b style="font-size:1.3rem">${money(g.pricing.recommended)??'not set'}</b>
    <span class="flag wait">recommended, not decided</span>
    ${has(g.pricing.basis)?`<ul class="plain" style="margin-top:10px">${g.pricing.basis.map(b=>`<li>${E(b)}</li>`).join('')}</ul>`:''}</div>`;
  if(has(g.budgetAllocation)) out+=`<div class="bars">`+Object.entries(g.budgetAllocation).map(([k,v])=>
    `<div class="bar"><div class="nm">${E(k)}</div><div class="track"><div class="fill" style="width:${Number(v)||0}%"></div></div>
     <div class="v">${E(v)}%</div></div>`).join('')+`<p class="legend">Share of effort, not money. This workflow does not commit a budget.</p></div>`;
  return out;
}
function publishBlock(){
  const names=Object.keys(S.assets);
  if(!names.length) return '<p class="gap">No assets written yet.</p>';
  return `<div class="atabs" id="asset-tabs">`+names.map((n,i)=>
    `<button data-a="${E(n)}" class="${i===0?'on':''}">${E(n.replace(/\.md$/,'').replace(/-/g,' '))}</button>`).join('')+
    `</div><div id="asset-body"></div>
     <p class="tnote">The landing page itself is not here. <code>landing-brief.md</code> is the copy deck; <b>pica</b> builds the page.</p>`;
}
function renderAsset(n){
  document.getElementById('asset-body').innerHTML = `<pre>${E(S.assets[n]??'')
    .replace(/\[?(CLAIM-\d+)\]?/g,(m,id)=>`<span class="chip" data-claim="${id}">${id}</span>`)
    .replace(/\[TESTIMONIAL[^\]]*\]/gi,m=>`<span class="flag no">${m}</span>`)
    .replace(/\[UNASSIGNED\]/g,'<span class="flag wait">UNASSIGNED</span>')}</pre>`;
}
function doBlock(){
  const blocking=S.verify?.blockingIssues??[]; let out='';
  if(blocking.length){
    const by=new Map();
    for(const b of blocking){ const c=(b.match(/^\[([^\]]+)\]/)??[])[1]??'other';
      if(!by.has(c)) by.set(c,[]); by.get(c).push(b.replace(/^\[[^\]]+\]\s*/,'')); }
    out+=`<ul class="todo">`+[...by.entries()].map(([c,items])=>
      `<li class="blk"><span class="box"></span><div><span class="t">${E(plain(c))}</span>
        <span class="who">${E(items[0])}${items.length>1?` · and ${items.length-1} more`:''}</span></div></li>`).join('')+`</ul>`;
  }
  const cl=DATA.checklist??S.assets['launch-checklist.md'];
  if(cl){
    const items=String(cl).split('\n').filter(l=>/^-\s*\[ \]/.test(l));
    if(items.length) out+=`<h3 style="margin-top:26px">Then, before anything is published</h3><ul class="todo">`+
      items.map(l=>{ const t=l.replace(/^-\s*\[ \]\s*/,''); const who=(t.match(/\[([A-Z]+)\]\s*$/)??[])[1];
        return `<li><span class="box"></span><div><span class="t">${E(t.replace(/\s*-\s*\[[A-Z]+\]\s*$/,''))}</span>
          ${who?`<span class="who">owner: ${E(who.toLowerCase())}</span>`:''}</div></li>`; }).join('')+`</ul>`;
  }
  return out||'<p class="gap">Nothing to do yet.</p>';
}

/* ================= after ================= */
function runwayBlock(){
  const w=S.runway??[], life=S.assets['lifecycle-emails.md'], cal=S.assets['content-calendar.md'];
  if(!w.length && !life && !cal) return `<div class="callout wait"><b>Nothing here yet.</b>
    Every asset in this package is acquisition: it gets someone to sign up and stops.
    Run <code>/aris-runway</code> for the ninety days after that, which is where the
    business either works or does not.</div>`;
  let out='';
  if(life) out+=`<div class="callout"><b>Lifecycle email sequence written.</b>
    Each one fires on something the person did or failed to do, never on a date alone —
    a fourteen-day drip reaches someone who churned on day two. See <b>What we publish</b>.</div>`;
  if(w.length){
    out+=`<div class="grid g2">`+w.map(x=>
      `<div class="card"><div class="row" style="border:none;padding:0;grid-template-columns:1fr auto">
        <div class="nm">${E(x.label??('Week '+x.week))}</div>
        <span class="flag ${x.decision?'wait':''}">${x.decision?'decision':'week '+E(x.week)}</span></div>
        ${x.expect?`<p><b>If this is working:</b> ${E(x.expect)}</p>`:''}
        ${x.ifNot?`<p class="sub" style="color:var(--no)">If not: ${E(x.ifNot)}</p>`:''}</div>`).join('')+`</div>`;
  }
  if(cal) out+=`<p class="tnote">A twelve-week cadence is in <code>content-calendar.md</code>.
    Every slot is <span class="flag wait">UNASSIGNED</span>: this workflow does not know who writes.</p>`;
  return out;
}

function afterBlock(){
  let out='';
  if(S.metrics.length){
    out+=`<div class="callout wait"><b>Empty on purpose.</b> A chart with plausible numbers before
      launch is the clearest way to mislead yourself. Nothing is drawn until a real export lands in
      <code>.aris/evidence/analytics/</code>.</div>`;
    const secs=S.dashboard?.sections??[{name:'Metrics',metrics:S.metrics.map(m=>m.name)}];
    for(const s of secs) out+=`<h3 style="margin-top:22px">${E(s.name)}</h3><div class="grid g3">`+
      (s.metrics??[]).map(mn=>{ const m=S.metrics.find(x=>x.name===mn||x.id===mn)??{name:mn};
        return `<div class="card"><p class="big faint">—</p><div class="nm" style="font-size:.92rem">${E(m.name??mn)}</div>
          <p class="sub">${m.target!=null?'target '+E(m.target):'no target set'}${m.formula?' · '+E(m.formula):''}</p></div>`;
      }).join('')+`</div>`;
  }
  if(S.rules.length){
    out+=`<h3 style="margin-top:30px">Decided in advance</h3>
      <p class="tnote">Written now, while nobody is defending a result. A rule written after the data arrives is a rationalisation.</p>`;
    out+=`<div class="grid g2">`+S.rules.map(r=>
      `<div class="card"><div class="nm mono" style="font-size:.86rem">IF ${E(r.metric)} ${E(r.condition)}
        ${r.threshold==null?'<span class="flag wait">threshold unset</span>':'<b>'+E(r.threshold)+'</b>'}
        ${r.window?E('for '+r.window):''}</div>
        <ul>${(r.action??[]).map(a=>`<li>${E(a)}</li>`).join('')}</ul></div>`).join('')+`</div>`;
  }
  return out||'<p class="gap">No measurement plan yet.</p>';
}

/* ================= compose ================= */
document.getElementById('p-know').innerHTML =
  sec('01','The field','Who else is already selling to these people',
      'Read off their own pages. Prices are what they publish, not what they quote.', marketBlock()+gridBlock()+ladderBlock()) +
  sec('02','Customers','What the people buying this actually said', '', customersBlock()) +
  sec('03','Size','How much of this there is to win',
      'Built up from public counts. Ranges, not points, because the weakest factor sets the width.', sizeBlock()) +
  sec('04','Risk','What we are betting on, and what it costs if we are wrong', '', betsBlock()) +
  sec('05','Evidence','Every source this rests on', '', sourcesBlock());

document.getElementById('p-do').innerHTML =
  sec('06','Position','Why this, and not the other two', '', whyBlock()) +
  sec('07','Message','What we actually say, in priority order',
      'Lift these directly. Each carries the evidence it rests on.', sayBlock()) +
  sec('08','Channels','Where we say it, and what it costs', '', whereBlock()) +
  sec('09','Assets','What gets published', '', publishBlock()) +
  sec('10','Next','Do this first', '', doBlock());

document.getElementById('p-after').innerHTML =
  sec('11','Keeping them','What happens after somebody signs up',
      'Everything before this gets a signup. This is the part where the business works or does not.',
      runwayBlock()) +
  sec('12','Measure','What to watch once it is live', '', afterBlock());

if(Object.keys(S.assets).length) renderAsset(Object.keys(S.assets)[0]);

/* drawer */
const drawer=document.getElementById('drawer'), dbody=document.getElementById('drawer-body');
const open=h=>{dbody.innerHTML=h;drawer.classList.add('on');};
document.getElementById('drawer-x').onclick=()=>drawer.classList.remove('on');
const srcLine=id=>{ const s=srcById.get(id);
  return s?`<p style="margin:9px 0"><a href="${E(s.url??'#')}" target="_blank" rel="noopener">${E(s.title||s.url||id)}</a>
    <span class="sub" style="display:block">${E(id)} · ${E(s.publisher??'')} · ${E(s.accessedAt??'')}</span></p>`
    :`<p class="mono">${E(id)} <span class="flag no">missing</span></p>`; };
function showClaim(id){
  const c=S.claims.find(x=>x.id===id);
  if(!c) return open(`<h3>${E(id)}</h3><p class="gap">Not in the registry.</p>`);
  let h=`<h3>${E(c.id)}</h3><p style="font-size:1.05rem">${E(c.text)}</p>
    <p class="sub">${E(c.type??'')} · used in ${(c.usedIn??[]).map(x=>E(x.split('/').pop())).join(', ')||'nothing'}</p>`;
  const m=allMsgs.find(x=>x.id===c.messageId);
  if(m) h+=`<h4 class="eyebrow" style="margin-top:18px">Serves</h4><p>${E(m.message)}</p>`;
  for(const e of m?.evidence??[]){ const p=painById.get(e); if(!p) continue;
    h+=`<h4 class="eyebrow" style="margin-top:18px">Which answers</h4><p>${E(p.statement)}</p>`+
       (p.quotes??[]).slice(0,3).map(q=>`<div class="quote">${E(q.text)}<cite>${E(q.id)} · ${E(q.platform??'')}</cite></div>`).join(''); }
  h+=`<h4 class="eyebrow" style="margin-top:18px">Sources</h4>${(c.sourceIds??[]).length?c.sourceIds.map(srcLine).join(''):'<p class="gap">No source. This blocks the launch.</p>'}`;
  open(h);
}
function showPain(id){ const p=painById.get(id);
  if(!p) return open(`<h3>${E(id)}</h3><p class="gap">No such pain.</p>`);
  open(`<h3>${E(p.id)}</h3><p style="font-size:1.05rem">${E(p.statement)}</p>
    <p class="sub">${p.frequency?.quoteCount??0} quotes · ${p.frequency?.sourceCount??0} sources</p>`+
    ((p.quotes??[]).map(q=>`<div class="quote">${E(q.text)}<cite>${E(q.id)} ·
      ${q.url?`<a href="${E(q.url)}" target="_blank" rel="noopener">${E(q.platform||'source')}</a>`:E(q.platform??'')}</cite></div>`).join('')
      ||'<p class="gap">No quotes stored.</p>'));
}
let dl=null;
(async()=>{ if(!window.claude?.use) return;
  try{ dl=await window.claude.use('downloads'); }catch{ dl=null; }
  if(!dl) document.querySelector('[data-export]')?.remove(); })();
async function saveJson(){
  const name=`aris-${(S.state.product?.name||'package').toLowerCase().replace(/\W+/g,'-')}.json`;
  const data=JSON.stringify(DATA,null,2);
  if(dl){ try{ await dl.save({filename:name,data}); }catch{} return; }
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([data],{type:'application/json'}));
  a.download=name; document.body.appendChild(a); a.click(); a.remove();
}
document.addEventListener('click',ev=>{
  const t=ev.target.closest('[data-claim],[data-pain],[data-src],[data-a],[data-export]'); if(!t) return;
  if(t.dataset.claim){ev.preventDefault();showClaim(t.dataset.claim);}
  else if(t.dataset.pain){ev.preventDefault();showPain(t.dataset.pain);}
  else if(t.dataset.src){ev.preventDefault();open(`<h3>${E(t.dataset.src)}</h3>${srcLine(t.dataset.src)}`);}
  else if(t.dataset.a){ev.preventDefault();
    document.querySelectorAll('#asset-tabs button').forEach(b=>b.classList.toggle('on',b===t)); renderAsset(t.dataset.a);}
  else if(t.dataset.export){ev.preventDefault();saveJson();}
});
addEventListener('keydown',e=>{ if(e.key==='Escape') drawer.classList.remove('on'); });
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('on',x===b));
  for(const n of ['know','do','after']) document.getElementById('p-'+n).hidden=(n!==b.dataset.tab);
  scrollTo({top:0,behavior:'instant'});
});
document.getElementById('btn-theme').onclick=()=>{
  const cur=document.documentElement.getAttribute('data-theme');
  const next=cur==='dark'?'light':cur==='light'?'dark':(matchMedia('(prefers-color-scheme:dark)').matches?'light':'dark');
  document.documentElement.setAttribute('data-theme',next);
  try{localStorage.setItem('aris-theme',next);}catch{}
};
try{const t=localStorage.getItem('aris-theme'); if(t) document.documentElement.setAttribute('data-theme',t);}catch{}
