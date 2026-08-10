const VERSION="7.2.2";
const STORAGE_KEY="expenseAppData";
const BACKUP_KEY="expenseAppBackups";
const OLD_KEY="expenseAppData";

const DEFAULT_CATEGORIES={
  expense:[["Cibo","🍔"],["Casa","🏠"],["Auto","🚗"],["Telefonia","📱"],["Svago","🎮"],["Abbigliamento","👕"],["Studio","📚"],["Tecnologia","💻"],["Salute","💊"],["Altro","📦"]],
  income:[["Stipendio","💼"],["Rimborso","↩️"],["Regalo","🎁"],["Extra","💰"],["Altro","📥"]]
};
const COLORS=["#3568d4","#16a47a","#e05260","#e2a52e","#5b78df","#8c67d9","#d26a9b","#28a69a","#df8140","#72809a"];

const $=id=>document.getElementById(id);
const today=()=>new Date().toISOString().slice(0,10);
const monthKey=d=>d.slice(0,7);
const money=n=>new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(Number(n)||0);
const fmtDate=d=>new Intl.DateTimeFormat("it-IT",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(d+"T00:00:00"));
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);

function defaultState(){
  return {
    version:VERSION,
    transactions:[],
    budgets:{},
    recurring:[],
    accounts:[{id:"main",name:"Conto principale",type:"Conto corrente",initial:0,icon:"🏦"}],
    goals:[],
    subscriptions:[],
    debts:[],
    receipts:[],
    netWorthHistory:[],
    categories:JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)),
    settings:{dark:false,pinHash:"",autoLock:0},
    meta:{lastGenerated:{}}
  };
}
function normalize(raw){
  const s=raw&&typeof raw==="object"?raw:defaultState();
  const d=defaultState();
  s.transactions=Array.isArray(s.transactions)?s.transactions:[];
  s.budgets=s.budgets&&typeof s.budgets==="object"?s.budgets:{};
  s.recurring=Array.isArray(s.recurring)?s.recurring:[];
  s.accounts=Array.isArray(s.accounts)&&s.accounts.length?s.accounts:d.accounts;
  s.goals=Array.isArray(s.goals)?s.goals:[];
  s.subscriptions=Array.isArray(s.subscriptions)?s.subscriptions:[];
  s.debts=Array.isArray(s.debts)?s.debts:[];
  s.receipts=Array.isArray(s.receipts)?s.receipts:[];
  s.netWorthHistory=Array.isArray(s.netWorthHistory)?s.netWorthHistory:[];
  s.categories=s.categories&&typeof s.categories==="object"?s.categories:d.categories;
  s.categories.expense=Array.isArray(s.categories.expense)?s.categories.expense:d.categories.expense;
  s.categories.income=Array.isArray(s.categories.income)?s.categories.income:d.categories.income;
  s.settings={...d.settings,...(s.settings||{})};
  s.meta={...d.meta,...(s.meta||{})};
  // Compatibility with old v3/v4/v5 records.
  s.transactions=s.transactions.map(t=>({...t,id:t.id||uid(),accountId:t.accountId||"main",note:t.note||"",method:t.method||"Altro",category:t.category||"Altro",description:t.description||"Movimento"}));
  s.recurring=s.recurring.map(r=>({...r,id:r.id||uid(),type:r.type||"income",frequency:r.frequency||"monthly",day:Number(r.day)||1,startDate:r.startDate||r.start_date||today(),active:r.active!==false,category:r.category||"Altro",method:r.method||"Bonifico",accountId:r.accountId||"main"}));
  return s;
}
let state=normalize(JSON.parse(localStorage.getItem(STORAGE_KEY)||"null"));
let calendarDate=new Date(new Date().getFullYear(),new Date().getMonth(),1);
let lastActivity=Date.now();
let currentSection="dashboard";

function save(){
  state.version=VERSION;
  localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
}
function backup(){
  const arr=JSON.parse(localStorage.getItem(BACKUP_KEY)||"[]");
  arr.unshift({at:new Date().toISOString(),data:state});
  localStorage.setItem(BACKUP_KEY,JSON.stringify(arr.slice(0,5)));
}
function commit(backupFirst=false){
  if(backupFirst) backup();
  save();
  renderAll();
}
function toast(msg,type=""){
  const el=$("toast");el.textContent=msg;el.className="toast "+type;
  setTimeout(()=>el.classList.add("hidden"),2600);
}
function hashPin(pin){
  // Lightweight local hash. This is an app lock, not encryption.
  let h=2166136261;
  for(const c of pin){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}
  return (h>>>0).toString(16);
}
function isLocked(){return !!state.settings.pinHash && $("lockScreen").classList.contains("hidden")===false}
function showLock(){
  if(!state.settings.pinHash)return;
  $("lockScreen").classList.remove("hidden");$("app").classList.add("hidden");$("lockPin").value="";$("lockError").textContent="";
}
function unlock(){
  if(hashPin($("lockPin").value)===state.settings.pinHash){
    $("lockScreen").classList.add("hidden");$("app").classList.remove("hidden");lastActivity=Date.now();renderAll();
  }else $("lockError").textContent="PIN non corretto.";
}
function touch(){lastActivity=Date.now()}
document.addEventListener("click",touch);document.addEventListener("keydown",touch);
setInterval(()=>{if(state.settings.autoLock&&Date.now()-lastActivity>state.settings.autoLock*60000&&$("lockScreen").classList.contains("hidden"))showLock()},30000);

function monthTransactions(offset=0){
  const d=new Date();d.setMonth(d.getMonth()+offset);const k=d.toISOString().slice(0,7);
  return state.transactions.filter(t=>t.date.startsWith(k));
}
function sum(a,fn){return a.reduce((x,v)=>x+(fn?fn(v):Number(v.amount)||0),0)}
function income(a){return sum(a,t=>t.type==="income"?Number(t.amount):0)}
function expense(a){return sum(a,t=>t.type==="expense"?Number(t.amount):0)}
function accountBalance(id){
  const a=state.accounts.find(x=>x.id===id);let b=Number(a?.initial)||0;
  for(const t of state.transactions)if(t.accountId===id)b+=t.type==="income"?Number(t.amount):-Number(t.amount);
  return b;
}
function totalBalance(){return state.accounts.reduce((x,a)=>x+accountBalance(a.id),0)}
function catList(type){return state.categories[type]||[]}
function catIcon(type,cat){return (catList(type).find(x=>x[0]===cat)||["","•"])[1]}
function prevMonthDate(d){const x=new Date(d.getFullYear(),d.getMonth()-1,1);return x}
function monthLabel(d){return new Intl.DateTimeFormat("it-IT",{month:"long",year:"numeric"}).format(d)}
function percent(n,d){return d?Math.round(n/d*100):0}
function clamp(n,a=0,b=100){return Math.max(a,Math.min(b,n))}

function generateRecurring(){
  let changed=false;
  const now=new Date();
  for(const r of state.recurring.filter(x=>x.active!==false)){
    const start=new Date((r.startDate||today())+"T00:00:00");
    let cursor=new Date(start.getFullYear(),start.getMonth(),1);
    while(cursor<=now){
      let due=null;
      if(r.frequency==="weekly"){
        const target=Math.min(7,Number(r.weekday)||1);
        for(let day=1;day<=31;day++){const x=new Date(cursor.getFullYear(),cursor.getMonth(),day);if(x.getMonth()!==cursor.getMonth())break;if(x.getDay()===target){due=x;break}}
      }else if(r.frequency==="yearly"){
        if(cursor.getMonth()===start.getMonth())due=new Date(cursor.getFullYear(),start.getMonth(),Math.min(start.getDate(),28));
      }else due=new Date(cursor.getFullYear(),cursor.getMonth(),Math.min(Number(r.day)||1,28));
      if(due&&due<=now&&due>=start){
        const key=r.id+"_"+due.toISOString().slice(0,10);
        if(!state.meta.lastGenerated[key]){
          state.transactions.push({id:uid(),type:r.type,amount:Number(r.amount),date:due.toISOString().slice(0,10),category:r.category,method:r.method||"Altro",description:r.description,note:"Generato da ricorrenza",accountId:r.accountId||"main",recurringId:r.id,occurrence:key});
          state.meta.lastGenerated[key]=true;changed=true;
        }
      }
      cursor.setMonth(cursor.getMonth()+1);
    }
  }
  if(changed)save();
}

function renderAll(){
  generateRecurring();
  renderDashboard();renderTransactions();renderAccounts();renderBudgets();renderGoals();renderRecurring();renderAnalytics();renderCalendar();renderAlerts();renderCategories();renderNetWorth();renderSubscriptions();renderDebts();renderReceipts();renderReport();renderChangelog();renderSettings();recordNetWorthSnapshot();
  updateBadge();
}
const TITLES={
  dashboard:["Dashboard","Una panoramica chiara delle tue finanze."],
  transactions:["Transazioni","Controlla, modifica e filtra tutti i movimenti."],
  accounts:["Conti","Separali per sapere esattamente dove sono i tuoi soldi."],
  budgets:["Budget","Limiti mensili per categoria con indicatori automatici."],
  goals:["Obiettivi","Trasforma un obiettivo in un percorso misurabile."],
  recurring:["Ricorrenti","Gestisci entrate e spese automatiche."],
  analytics:["Analisi","Confronti, medie e andamento delle tue abitudini."],
  networth:["Patrimonio","Disponibilità, risparmi e debiti."],
  subscriptions:["Abbonamenti","Controlla rinnovi e costi ricorrenti."],
  debts:["Debiti","Rate, residuo e scadenze."],
  receipts:["Ricevute","Documenti associati alle tue spese."],
  report:["Report","Riepilogo finanziario mensile."],
  calendar:["Calendario","Vedi quando arrivano e partono i soldi."],
  alerts:["Avvisi","Segnalazioni basate sui tuoi budget e sulle tue spese."],
  categories:["Categorie","Personalizza le categorie che usi nelle transazioni."],
  changelog:["Changelog","Cronologia delle versioni, direttamente nell'app."],
  settings:["Impostazioni","Privacy, backup, tema e sicurezza."]
};
function showSection(id){
  currentSection=id;
  document.querySelectorAll(".section").forEach(s=>s.classList.toggle("active",s.id===id));
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.section===id));
  $("pageTitle").textContent=TITLES[id][0];$("pageSubtitle").textContent=TITLES[id][1];
  if(id==="calendar")renderCalendar();
}
document.querySelectorAll(".nav-btn").forEach(b=>b.addEventListener("click",()=>showSection(b.dataset.section)));
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>showSection(b.dataset.go)));



async function createDesktopBackup(reason="manuale"){
  if(!window.desktopAPI) return false;
  let payload=null;
  try { payload=JSON.parse(localStorage.getItem("expenseAppData")||"null"); } catch(e) {}
  if(!payload) return false;
  const r=await window.desktopAPI.saveBackup(payload,reason);
  if(r?.ok) return true;
  return false;
}
async function showBackupManager(){
  if(!window.desktopAPI){toast("Disponibile nella versione desktop","info");return;}
  const list=await window.desktopAPI.listBackups();
  const rows=list.map((b,i)=>`<div class="backup-row"><div><b>${esc(b.name)}</b><small>${new Date(b.modified).toLocaleString("it-IT")} · ${(b.size/1024).toFixed(1)} KB</small></div><button class="mini-btn" data-restore-backup="${i}">Ripristina</button></div>`).join("");
  openModal(`<h2>Backup automatici</h2><p class="modal-sub">L'app crea automaticamente un backup all'avvio e conserva gli ultimi 15.</p><div class="backup-actions"><button class="btn primary" id="makeBackup">Crea backup ora</button><button class="btn secondary" id="openBackupFolder">Apri cartella</button></div><div class="backup-list">${rows||"<div class='empty'>Nessun backup.</div>"}</div>`);
  $("makeBackup").onclick=async()=>{if(await createDesktopBackup("manuale")){toast("Backup creato","success");showBackupManager()}};
  $("openBackupFolder").onclick=()=>window.desktopAPI.openBackupFolder();
  $("modal").querySelectorAll("[data-restore-backup]").forEach(btn=>btn.onclick=async()=>{
    const b=list[Number(btn.dataset.restoreBackup)]; if(!b)return;
    if(!confirm("Ripristinare questo backup? I dati attuali verranno sostituiti."))return;
    const r=await window.desktopAPI.restoreBackup(b.path);
    if(r?.ok){localStorage.setItem("expenseAppData",JSON.stringify(r.payload));location.reload();}
    else alert("Impossibile ripristinare il backup.");
  });
}
if(window.desktopAPI) window.desktopAPI.onBackupRequest((reason)=>createDesktopBackup(reason||"automatico-avvio"));

function renderToday(){
  const d=today(), ts=state.transactions.filter(t=>t.date===d), ni=income(ts), ne=expense(ts);
  $("todayBalance").textContent=money(totalBalance());
  $("todayIncome").textContent="+"+money(ni); $("todayExpense").textContent="−"+money(ne);
  const upcoming=state.recurring.filter(r=>r.active!==false).map(r=>({r,d:nextRecurring(r)})).sort((a,b)=>a.d.localeCompare(b.d))[0];
  $("todayNext").textContent=upcoming?`${upcoming.r.description} · ${fmtDate(upcoming.d)}`:"—";
  $("todaySummary").textContent=ni||ne?`Oggi: ${ni?money(ni)+" di entrate":""}${ni&&ne?" · ":""}${ne?money(ne)+" di spese":""}.`:"Nessun movimento registrato oggi.";
}
function monthForecast(){
  const now=new Date(), days=new Date(now.getFullYear(),now.getMonth()+1,0).getDate(), day=now.getDate();
  const mt=monthTransactions(), inc=income(mt), exp=expense(mt), futureRec=state.recurring.filter(r=>r.active!==false).reduce((s,r)=>{
    const n=new Date(nextRecurring(r)+"T00:00:00"); return n.getMonth()===now.getMonth()?s+(r.type==="income"?Number(r.amount):-Number(r.amount)):s;
  },0);
  const avgDaily=day?exp/day:0, projected=exp+avgDaily*Math.max(0,days-day);
  return {projected,forecastBalance:totalBalance()-futureRec-(projected-exp),inc,exp,daysLeft:days-day};
}
function renderDashboard(){
  const mt=monthTransactions(), pm=monthTransactions(-1), inc=income(mt), exp=expense(mt), sav=inc-exp;
  renderToday();
  $("totalBalance").textContent=money(totalBalance());
  $("monthIncome").textContent=money(inc);$("monthExpense").textContent=money(exp);$("monthSaving").textContent=money(sav);
  $("savingRate").textContent=(inc?Math.round(sav/inc*100):0)+"% del reddito";
  const pi=income(pm),pe=expense(pm);
  $("incomeCompare").textContent=compareText(inc,pi);
  $("expenseCompare").textContent=compareText(exp,pe);
  $("balanceTrend").textContent=sav>=0?"✓ Risparmio positivo":"⚠ Mese in negativo";
  $("balanceTrend").className=sav>=0?"positive":"negative";
  $("balanceMonth").textContent=monthLabel(new Date());
  $("miniAccounts").innerHTML=state.accounts.slice(0,3).map(a=>`<span>${esc(a.icon||"💳")} ${esc(a.name)} <b>${money(accountBalance(a.id))}</b></span>`).join("");
  renderMonthlyChart();renderDonut();renderUpcoming();renderRecent();renderInsight();renderForecast();renderSubscriptionSummary();
}
function compareText(v,p){if(!p)return"Nuovo dato";const d=percent(Math.abs(v-p),Math.abs(p));return (v>=p?"▲ ":"▼ ")+d+"% vs mese scorso"}
function renderMonthlyChart(){
  const months=[];for(let i=5;i>=0;i--){const d=new Date();d.setMonth(d.getMonth()-i);months.push(d)}
  const vals=months.map(d=>{const k=d.toISOString().slice(0,7);let ts=state.transactions.filter(t=>t.date.startsWith(k));return {d,inc:income(ts),exp:expense(ts),net:income(ts)-expense(ts)}});
  const max=Math.max(1,...vals.flatMap(x=>[x.inc,x.exp,Math.abs(x.net)]));
  $("monthlyChart").innerHTML=vals.map(x=>`<div class="month-col"><div class="bars"><i class="bar-income" style="height:${clamp(x.inc/max*100,3,100)}%"></i><i class="bar-expense" style="height:${clamp(x.exp/max*100,3,100)}%"></i></div><b>${new Intl.DateTimeFormat("it-IT",{month:"short"}).format(x.d)}</b><small>${money(x.net)}</small></div>`).join("");
}
function renderDonut(){
  const mt=monthTransactions(), total=expense(mt);$("donutTotal").textContent=money(total).replace(",00","");
  const by={};mt.filter(t=>t.type==="expense").forEach(t=>by[t.category]=(by[t.category]||0)+Number(t.amount));
  const entries=Object.entries(by).sort((a,b)=>b[1]-a[1]).slice(0,6);
  let start=0;const parts=entries.map(([c,v],i)=>{const p=total?v/total*100:0;const s=`${COLORS[i%COLORS.length]} ${start}% ${start+p}%`;start+=p;return s});
  $("donut").style.background=`conic-gradient(${parts.join(",")||"#e8edf5 0 100%"})`;
  $("categoryLegend").innerHTML=entries.length?entries.map(([c,v],i)=>`<div class="legend-row"><span><i style="background:${COLORS[i%COLORS.length]}"></i>${esc(c)}</span><b>${money(v)}</b></div>`).join(""):"<p class='empty'>Nessuna spesa questo mese.</p>";
}
function txRow(t,compact=false){
  const cls=t.type==="income"?"income":"expense", sign=t.type==="income"?"+":"−";
  return `<div class="tx-row ${compact?"compact":""}">
    <div class="tx-icon ${cls}">${catIcon(t.type,t.category)}</div>
    <div class="tx-main"><strong>${esc(t.description)}</strong><small>${esc(t.category)} · ${fmtDate(t.date)} · ${esc((state.accounts.find(a=>a.id===t.accountId)||{}).name||"Conto")}</small></div>
    <b class="tx-value ${cls}">${sign}${money(t.amount)}</b>
    ${compact?"":`<div class="row-actions"><button class="mini-btn" data-edit-tx="${t.id}">✎</button><button class="mini-btn" data-del-tx="${t.id}">×</button></div>`}
  </div>`;
}
function bindTxActions(root=document){
  root.querySelectorAll("[data-edit-tx]").forEach(b=>b.onclick=()=>openTransaction(b.dataset.editTx));
  root.querySelectorAll("[data-del-tx]").forEach(b=>b.onclick=()=>deleteTransaction(b.dataset.delTx));
}
function renderRecent(){
  const a=[...state.transactions].sort((x,y)=>y.date.localeCompare(x.date)).slice(0,6);
  $("recent").innerHTML=a.length?a.map(t=>txRow(t,true)).join(""):"<div class='empty'>Nessuna transazione.</div>";
}
function renderUpcoming(){
  const future=state.recurring.filter(r=>r.active!==false).map(r=>{
    const next=nextRecurring(r);return {...r,next}
  }).sort((a,b)=>a.next.localeCompare(b.next)).slice(0,6);
  $("upcoming").innerHTML=future.length?future.map(r=>`<div class="upcoming-row"><div class="rec-icon ${r.type}">${r.type==="income"?"↗":"↘"}</div><div class="tx-main"><strong>${esc(r.description)}</strong><small>${fmtDate(r.next)} · ${esc(r.category)}</small></div><b class="${r.type==="income"?"tx-value income":"tx-value expense"}">${r.type==="income"?"+":"−"}${money(r.amount)}</b></div>`).join(""):"<div class='empty'>Nessuna ricorrenza attiva.</div>";
}
function renderInsight(){
  const mt=monthTransactions(),exp=expense(mt),budgets=Object.entries(state.budgets);
  let html="";
  const over=budgets.map(([c,b])=>({c,b,u:sum(mt.filter(t=>t.type==="expense"&&t.category===c))})).find(x=>x.u>=x.b);
  if(over)html=`<div class="insight-icon">⚠</div><div><strong>Budget ${esc(over.c)} superato</strong><p>Hai speso ${money(over.u)} su ${money(over.b)}.</p></div>`;
  else if(exp===0)html=`<div class="insight-icon">💡</div><div><strong>Inizia a registrare i movimenti</strong><p>Con più dati potremo generare analisi e previsioni più precise.</p></div>`;
  else html=`<div class="insight-icon">✓</div><div><strong>${monthTransactions().filter(t=>t.type==="expense").length} spese registrate questo mese</strong><p>La tua percentuale di risparmio è ${income(mt)?Math.round((income(mt)-exp)/income(mt)*100):0}%.</p></div>`;
  $("smartInsight").innerHTML=html;
}


function renderForecast(){
  const f=monthForecast(), mt=monthTransactions(), rate=f.inc?Math.round((f.inc-f.projected)/f.inc*100):0;
  $("forecastBox").innerHTML=`<div class="forecast-number">${money(f.forecastBalance)}</div><div class="forecast-grid"><span>Spese previste<strong>${money(f.projected)}</strong></span><span>Risparmio stimato<strong class="${rate>=0?"positive":"negative"}">${rate}%</strong></span><span>Giorni rimanenti<strong>${f.daysLeft}</strong></span></div><p class="muted-line">Stima indicativa basata sulla media giornaliera delle spese e sulle ricorrenze future.</p>`;
}
function subscriptionTotal(){
  return state.subscriptions.reduce((s,x)=>s+(x.frequency==="yearly"?Number(x.amount)/12:Number(x.amount)),0);
}
function renderSubscriptionSummary(){
  $("subscriptionSummary").innerHTML=state.subscriptions.length?`<div class="summary-big">${money(subscriptionTotal())}<small>/ mese</small></div><div class="muted-line">${state.subscriptions.length} abbonamenti · ${money(subscriptionTotal()*12)} stimati all'anno</div>`:"<div class='empty'>Nessun abbonamento registrato.</div>";
}
function renderSubscriptions(){
  const total=subscriptionTotal();$("subscriptionTotal").innerHTML=`<div><span>Costo ricorrente stimato</span><strong>${money(total)}<small>/ mese</small></strong></div><div><span>Proiezione annuale</span><strong>${money(total*12)}</strong></div><div><span>Abbonamenti</span><strong>${state.subscriptions.length}</strong></div>`;
  $("subscriptionsGrid").innerHTML=state.subscriptions.length?state.subscriptions.map(s=>`<div class="subscription-card"><div class="sub-icon">${esc(s.icon||"◉")}</div><div class="grow"><h3>${esc(s.name)}</h3><small>${frequencyLabel(s)} · prossimo ${fmtDate(nextSub(s))}</small></div><strong>${money(s.amount)}<small>${s.frequency==="yearly"?"/ anno":"/ mese"}</small></strong><div class="row-actions"><button class="mini-btn" data-edit-sub="${s.id}">✎</button><button class="mini-btn" data-del-sub="${s.id}">×</button></div></div>`).join(""):"<div class='empty large'>Nessun abbonamento. Aggiungi Netflix, Spotify, assicurazioni o altri costi ricorrenti.</div>";
  $("subscriptionsGrid").querySelectorAll("[data-edit-sub]").forEach(b=>b.onclick=()=>openSubscription(b.dataset.editSub));
  $("subscriptionsGrid").querySelectorAll("[data-del-sub]").forEach(b=>b.onclick=()=>deleteSubscription(b.dataset.delSub));
}
function nextSub(s){const now=new Date(),d=new Date(now.getFullYear(),now.getMonth(),Math.min(Number(s.day)||1,28));if(s.frequency==="yearly"){let x=new Date(now.getFullYear(),new Date(s.startDate+"T00:00:00").getMonth(),Math.min(new Date(s.startDate+"T00:00:00").getDate(),28));if(x<now)x.setFullYear(x.getFullYear()+1);return x.toISOString().slice(0,10)}if(d<now)d.setMonth(d.getMonth()+1);return d.toISOString().slice(0,10)}
function openSubscription(id=null){
  const s=id?state.subscriptions.find(x=>x.id===id):null;
  openModal(`<h2>${s?"Modifica abbonamento":"Nuovo abbonamento"}</h2><form id="subForm" class="form-grid"><label>Servizio<input id="sName" class="input" required value="${esc(s?.name||"")}"></label><label>Costo<input id="sAmount" class="input" type="number" min=".01" step=".01" required value="${s?.amount||""}"></label><label>Frequenza<select id="sFreq" class="input"><option value="monthly">Mensile</option><option value="yearly">Annuale</option></select></label><label>Giorno<input id="sDay" class="input" type="number" min="1" max="28" value="${s?.day||1}"></label><label>Prossima/data di riferimento<input id="sStart" class="input" type="date" value="${s?.startDate||today()}"></label><label>Icona<input id="sIcon" class="input" maxlength="2" value="${esc(s?.icon||"◉")}"></label><div class="modal-actions wide"><button type="button" class="btn secondary" id="cancelModal">Annulla</button><button class="btn primary">Salva</button></div></form>`);
  $("sFreq").value=s?.frequency||"monthly";$("cancelModal").onclick=()=>$("modal").classList.add("hidden");
  $("subForm").onsubmit=e=>{e.preventDefault();const row={id:s?.id||uid(),name:$("sName").value,amount:Number($("sAmount").value),frequency:$("sFreq").value,day:Number($("sDay").value)||1,startDate:$("sStart").value,icon:$("sIcon").value||"◉"};if(s)state.subscriptions[state.subscriptions.findIndex(x=>x.id===s.id)]=row;else state.subscriptions.push(row);$("modal").classList.add("hidden");commit(true);toast("Abbonamento salvato","success")};
}
function deleteSubscription(id){if(confirm("Eliminare l'abbonamento?")){backup();state.subscriptions=state.subscriptions.filter(s=>s.id!==id);commit()}}
function renderDebts(){
  $("debtsGrid").innerHTML=state.debts.length?state.debts.map(d=>{const paid=Math.min(Number(d.total)-Number(d.remaining),Number(d.total)),p=percent(paid,d.total);return `<div class="debt-card"><div class="debt-head"><div class="debt-icon">${esc(d.icon||"💳")}</div><div class="grow"><h3>${esc(d.name)}</h3><small>Rata ${money(d.installment)} · prossima ${d.nextDate?fmtDate(d.nextDate):"—"}</small></div><div class="row-actions"><button class="mini-btn" data-edit-debt="${d.id}">✎</button><button class="mini-btn" data-del-debt="${d.id}">×</button></div></div><div class="debt-numbers"><span>Pagato <b>${money(paid)}</b></span><span>Restante <b>${money(Math.max(0,d.remaining))}</b></span></div><div class="progress"><i style="width:${p}%"></i></div><div class="budget-foot"><span>${p}% rimborsato</span><b>${d.total?Math.ceil(Math.max(0,d.remaining)/Math.max(1,d.installment))+" rate circa":"—"}</b></div></div>`}).join(""):"<div class='empty large'>Nessun debito o finanziamento registrato.</div>";
  $("debtsGrid").querySelectorAll("[data-edit-debt]").forEach(b=>b.onclick=()=>openDebt(b.dataset.editDebt));$("debtsGrid").querySelectorAll("[data-del-debt]").forEach(b=>b.onclick=()=>deleteDebt(b.dataset.delDebt));
}
function openDebt(id=null){
  const d=id?state.debts.find(x=>x.id===id):null;
  openModal(`<h2>${d?"Modifica debito":"Nuovo debito"}</h2><form id="debtForm" class="form-grid"><label>Nome<input id="dName" class="input" required value="${esc(d?.name||"")}"></label><label>Importo totale<input id="dTotal" class="input" type="number" min=".01" step=".01" required value="${d?.total||""}"></label><label>Residuo<input id="dRemain" class="input" type="number" min="0" step=".01" required value="${d?.remaining??""}"></label><label>Rata<input id="dInstall" class="input" type="number" min=".01" step=".01" required value="${d?.installment||""}"></label><label>Prossima rata<input id="dDate" class="input" type="date" value="${d?.nextDate||today()}"></label><label>Icona<input id="dIcon" class="input" maxlength="2" value="${esc(d?.icon||"💳")}"></label><div class="modal-actions wide"><button type="button" class="btn secondary" id="cancelModal">Annulla</button><button class="btn primary">Salva</button></div></form>`);
  $("cancelModal").onclick=()=>$("modal").classList.add("hidden");$("debtForm").onsubmit=e=>{e.preventDefault();const row={id:d?.id||uid(),name:$("dName").value,total:Number($("dTotal").value),remaining:Number($("dRemain").value),installment:Number($("dInstall").value),nextDate:$("dDate").value,icon:$("dIcon").value||"💳"};if(d)state.debts[state.debts.findIndex(x=>x.id===d.id)]=row;else state.debts.push(row);$("modal").classList.add("hidden");commit(true);toast("Debito salvato","success")};
}
function deleteDebt(id){if(confirm("Eliminare questo debito?")){backup();state.debts=state.debts.filter(d=>d.id!==id);commit()}}
function renderReceipts(){
  $("receiptsGrid").innerHTML=state.receipts.length?state.receipts.slice().reverse().map(r=>`<div class="receipt-card"><div class="receipt-preview">${r.data?`<img src="${r.data}" alt="">`:"📄"}</div><div class="grow"><h3>${esc(r.title||"Ricevuta")}</h3><small>${r.date?fmtDate(r.date):"—"} · ${money(r.amount||0)} · ${esc(r.description||"")}</small></div><div class="row-actions"><button class="mini-btn" data-view-receipt="${r.id}">⌕</button><button class="mini-btn" data-del-receipt="${r.id}">×</button></div></div>`).join(""):"<div class='empty large'>Nessuna ricevuta archiviata.</div>";
  $("receiptsGrid").querySelectorAll("[data-view-receipt]").forEach(b=>b.onclick=()=>viewReceipt(b.dataset.viewReceipt));$("receiptsGrid").querySelectorAll("[data-del-receipt]").forEach(b=>b.onclick=()=>deleteReceipt(b.dataset.delReceipt));
}
function openReceipt(id=null){
  const r=id?state.receipts.find(x=>x.id===id):null;
  openModal(`<h2>${r?"Modifica ricevuta":"Aggiungi ricevuta"}</h2><form id="receiptForm" class="form-grid"><label>Titolo<input id="rcTitle" class="input" value="${esc(r?.title||"")}"></label><label>Importo<input id="rcAmount" class="input" type="number" step=".01" value="${r?.amount||""}"></label><label>Data<input id="rcDate" class="input" type="date" value="${r?.date||today()}"></label><label>Descrizione<input id="rcDesc" class="input" value="${esc(r?.description||"")}"></label><label class="wide">Foto/documento<input id="rcFile" class="input" type="file" accept="image/*,.pdf"></label><div id="receiptHint" class="wide muted-line">Per immagini, il file viene salvato localmente nel browser.</div><div class="modal-actions wide"><button type="button" class="btn secondary" id="cancelModal">Annulla</button><button class="btn primary">Salva</button></div></form>`);
  $("cancelModal").onclick=()=>$("modal").classList.add("hidden");
  $("receiptForm").onsubmit=async e=>{e.preventDefault();let data=r?.data||"";const file=$("rcFile").files[0];if(file){if(file.size>3_500_000)return alert("Per mantenere l'app leggera, usa file sotto 3,5 MB.");data=await new Promise((res,rej)=>{const rd=new FileReader();rd.onload=()=>res(rd.result);rd.onerror=rej;rd.readAsDataURL(file)})}const row={id:r?.id||uid(),title:$("rcTitle").value||"Ricevuta",amount:Number($("rcAmount").value)||0,date:$("rcDate").value,description:$("rcDesc").value,data};if(r)state.receipts[state.receipts.findIndex(x=>x.id===r.id)]=row;else state.receipts.push(row);$("modal").classList.add("hidden");commit(true);toast("Ricevuta salvata","success")};
}
function viewReceipt(id){const r=state.receipts.find(x=>x.id===id);if(!r)return;openModal(`<h2>${esc(r.title)}</h2><p class="modal-sub">${r.date?fmtDate(r.date):""} · ${money(r.amount||0)}</p>${r.data&&r.data.startsWith("data:image")?`<img class="receipt-full" src="${r.data}" alt="Ricevuta">`:"<div class='empty'>Documento archiviato.</div>"}`)}
function deleteReceipt(id){if(confirm("Eliminare la ricevuta?")){backup();state.receipts=state.receipts.filter(r=>r.id!==id);commit()}}
function netWorth(){const assets=totalBalance()+state.goals.reduce((s,g)=>s+Number(g.saved||0),0),debts=state.debts.reduce((s,d)=>s+Math.max(0,Number(d.remaining)||0),0);return {assets,debts,total:assets-debts}}
function recordNetWorthSnapshot(){const k=new Date().toISOString().slice(0,7),nw=netWorth();if(!state.netWorthHistory.some(x=>x.month===k)){state.netWorthHistory.push({month:k,value:nw.total});state.netWorthHistory=state.netWorthHistory.slice(-24);save()}}
function renderNetWorth(){
  const n=netWorth();$("netWorthValue").textContent=money(n.total);$("netWorthTrend").textContent=n.total>=0?"Patrimonio positivo":"Patrimonio negativo";
  $("netWorthBreakdown").innerHTML=`<div><span>Disponibilità</span><b>${money(totalBalance())}</b></div><div><span>Obiettivi</span><b>${money(state.goals.reduce((s,g)=>s+Number(g.saved||0),0))}</b></div><div><span>Debiti</span><b class="negative">−${money(n.debts)}</b></div>`;
  const vals=[["Conti",totalBalance()],["Risparmi obiettivi",state.goals.reduce((s,g)=>s+Number(g.saved||0),0)],["Debiti",-n.debts]],mx=Math.max(1,...vals.map(x=>Math.abs(x[1])));$("netWorthBars").innerHTML=vals.map(x=>`<div class="net-bar"><div><span>${x[0]}</span><b class="${x[1]<0?"negative":""}">${money(x[1])}</b></div><div class="progress"><i style="width:${Math.abs(x[1])/mx*100}%;background:${x[1]<0?"var(--red)":"var(--primary)"}"></i></div></div>`).join("");
  const hist=state.netWorthHistory.slice(-8),hm=Math.max(1,...hist.map(x=>Math.abs(x.value)));$("netWorthHistory").innerHTML=hist.length?hist.map(x=>`<div class="history-col"><i style="height:${clamp(Math.abs(x.value)/hm*100,4,100)}%"></i><small>${x.month.slice(5)}</small><b>${money(x.value)}</b></div>`).join(""):"<div class='empty'>Servono alcuni mesi di dati per vedere l'andamento.</div>";
}
function reportMonthValue(){return $("reportMonth").value||today().slice(0,7)}
function renderReport(){
  if(!$("reportMonth"))return;if(!$("reportMonth").value)$("reportMonth").value=today().slice(0,7);const k=reportMonthValue(),ts=state.transactions.filter(t=>t.date.startsWith(k)),inc=income(ts),exp=expense(ts),sav=inc-exp;
  const by={};ts.filter(t=>t.type==="expense").forEach(t=>by[t.category]=(by[t.category]||0)+Number(t.amount));const cats=Object.entries(by).sort((a,b)=>b[1]-a[1]);
  $("reportPreview").innerHTML=`<div class="report-brand"><img src="logo.svg"><div><strong>Gestione Spese</strong><span>Report finanziario · ${esc(k)}</span></div></div><div class="report-title"><h1>${monthLabel(new Date(k+"-01T00:00:00"))}</h1><p>Riepilogo delle tue finanze personali</p></div><div class="report-metrics"><div><span>Entrate</span><b class="positive">${money(inc)}</b></div><div><span>Spese</span><b class="negative">${money(exp)}</b></div><div><span>Risparmio</span><b>${money(sav)}</b></div><div><span>Tasso</span><b>${inc?Math.round(sav/inc*100):0}%</b></div></div><div class="report-cols"><div><h3>Spese per categoria</h3>${cats.length?cats.map(([c,v])=>`<div class="report-line"><span>${esc(c)}</span><b>${money(v)}</b></div>`).join(""):"<p class='muted-line'>Nessuna spesa.</p>"}</div><div><h3>Indicatori</h3><div class="report-line"><span>Transazioni</span><b>${ts.length}</b></div><div class="report-line"><span>Spesa media</span><b>${money(ts.filter(t=>t.type==="expense").length?exp/ts.filter(t=>t.type==="expense").length:0)}</b></div><div class="report-line"><span>Abbonamenti mensili</span><b>${money(subscriptionTotal())}</b></div><div class="report-line"><span>Patrimonio netto attuale</span><b>${money(netWorth().total)}</b></div></div></div><div class="report-note"><strong>Analisi</strong><p>${sav>=0?`Hai chiuso il mese con un risparmio di ${money(sav)}.`:`Hai chiuso il mese in negativo di ${money(Math.abs(sav))}.`} ${cats[0]?`La categoria con più spesa è ${esc(cats[0][0])}.`:""}</p></div>`;
}
if($("reportMonth"))$("reportMonth").addEventListener("change",renderReport);
if($("printReport"))$("printReport").onclick=()=>window.print();

function renderTransactions(){
  const opts=(sel,arr)=>{const v=$(sel).value;$(sel).innerHTML=arr;$(sel).value=[...$(sel).options].some(o=>o.value===v)?v:"all"};
  opts("txAccount",'<option value="all">Tutti i conti</option>'+state.accounts.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join(""));
  opts("txCategory",'<option value="all">Tutte le categorie</option>'+[...new Set([...state.categories.expense,...state.categories.income].map(x=>x[0]))].map(c=>`<option>${esc(c)}</option>`).join(""));
  const q=$("txSearch").value.toLowerCase(),type=$("txType").value,acc=$("txAccount").value,cat=$("txCategory").value,from=$("txFrom").value,to=$("txTo").value;
  let a=state.transactions.filter(t=>(!q||`${t.description} ${t.note} ${t.category}`.toLowerCase().includes(q))&&(type==="all"||t.type===type)&&(acc==="all"||t.accountId===acc)&&(cat==="all"||t.category===cat)&&(!from||t.date>=from)&&(!to||t.date<=to)).sort((x,y)=>y.date.localeCompare(x.date));
  $("transactionsList").innerHTML=a.length?a.map(t=>txRow(t)).join(""):"<div class='empty large'>Nessuna transazione corrisponde ai filtri.</div>";
  bindTxActions($("transactionsList"));
}
["txSearch","txType","txAccount","txCategory","txFrom","txTo"].forEach(id=>$(id).addEventListener("input",renderTransactions));

function renderAccounts(){
  $("accountsGrid").innerHTML=state.accounts.map(a=>{
    const bal=accountBalance(a.id),count=state.transactions.filter(t=>t.accountId===a.id).length;
    return `<div class="account-card"><div class="account-top"><div class="account-icon">${esc(a.icon||"💳")}</div><div class="row-actions"><button class="mini-btn" data-edit-account="${a.id}">✎</button>${state.accounts.length>1?`<button class="mini-btn" data-del-account="${a.id}">×</button>`:""}</div></div><h3>${esc(a.name)}</h3><small>${esc(a.type)} · ${count} movimenti</small><strong class="${bal>=0?"positive":"negative"}">${money(bal)}</strong></div>`;
  }).join("");
  $("accountsGrid").querySelectorAll("[data-edit-account]").forEach(b=>b.onclick=()=>openAccount(b.dataset.editAccount));
  $("accountsGrid").querySelectorAll("[data-del-account]").forEach(b=>b.onclick=()=>deleteAccount(b.dataset.delAccount));
}

function renderBudgets(){
  const mt=monthTransactions();
  const entries=Object.entries(state.budgets);
  $("budgetGrid").innerHTML=entries.length?entries.map(([cat,limit])=>{
    const used=sum(mt.filter(t=>t.type==="expense"&&t.category===cat)),p=percent(used,limit),over=used>limit;
    return `<div class="budget-card"><div class="budget-head"><div><span class="cat-badge">${catIcon("expense",cat)}</span><strong>${esc(cat)}</strong></div><div class="row-actions"><button class="mini-btn" data-edit-budget="${esc(cat)}">✎</button><button class="mini-btn" data-del-budget="${esc(cat)}">×</button></div></div><div class="budget-numbers"><strong>${money(used)}</strong><span>di ${money(limit)}</span></div><div class="progress"><i class="${over?"over":""}" style="width:${clamp(p)}%"></i></div><div class="budget-foot"><span>${p}% utilizzato</span><b class="${over?"negative":"positive"}">${over?"Superato":"Disponibile "+money(Math.max(0,limit-used))}</b></div></div>`;
  }).join(""):"<div class='empty large'>Nessun budget configurato.</div>";
  $("budgetGrid").querySelectorAll("[data-edit-budget]").forEach(b=>b.onclick=()=>openBudget(b.dataset.editBudget));
  $("budgetGrid").querySelectorAll("[data-del-budget]").forEach(b=>b.onclick=()=>deleteBudget(b.dataset.delBudget));
}

function renderGoals(){
  $("goalsGrid").innerHTML=state.goals.length?state.goals.map(g=>{
    const p=clamp(percent(g.saved,g.target)),remaining=Math.max(0,g.target-g.saved);
    return `<div class="goal-card"><div class="goal-head"><div class="goal-icon">${esc(g.icon||"🎯")}</div><div class="grow"><h3>${esc(g.name)}</h3><small>${g.deadline?`Scadenza ${fmtDate(g.deadline)}`:"Nessuna scadenza"}</small></div><div class="row-actions"><button class="mini-btn" data-edit-goal="${g.id}">✎</button><button class="mini-btn" data-del-goal="${g.id}">×</button></div></div><div class="goal-value">${money(g.saved)} <span>/ ${money(g.target)}</span></div><div class="progress goal-progress"><i style="width:${p}%"></i></div><div class="budget-foot"><span>${p}% completato</span><b>${remaining?`Mancano ${money(remaining)}`:"🎉 Obiettivo raggiunto"}</b></div></div>`;
  }).join(""):"<div class='empty large'>Crea il tuo primo obiettivo di risparmio.</div>";
  $("goalsGrid").querySelectorAll("[data-edit-goal]").forEach(b=>b.onclick=()=>openGoal(b.dataset.editGoal));
  $("goalsGrid").querySelectorAll("[data-del-goal]").forEach(b=>b.onclick=()=>deleteGoal(b.dataset.delGoal));
}

function nextRecurring(r){
  const start=new Date((r.startDate||today())+"T00:00:00"),now=new Date(),base=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  if(r.frequency==="weekly"){
    const target=Number(r.weekday)||1,diff=(target-base.getDay()+7)%7;
    const d=new Date(base);d.setDate(base.getDate()+diff);return d.toISOString().slice(0,10);
  }
  if(r.frequency==="yearly"){
    let d=new Date(base.getFullYear(),start.getMonth(),Math.min(start.getDate(),28));if(d<base)d.setFullYear(d.getFullYear()+1);return d.toISOString().slice(0,10);
  }
  let d=new Date(base.getFullYear(),base.getMonth(),Math.min(Number(r.day)||1,28));if(d<base)d.setMonth(d.getMonth()+1);return d.toISOString().slice(0,10);
}
function renderRecurring(){
  $("recurringGrid").innerHTML=state.recurring.length?state.recurring.map(r=>`<div class="rec-card ${r.active===false?"paused":""}"><div class="rec-head"><div class="rec-icon ${r.type}">${r.type==="income"?"↗":"↘"}</div><div class="grow"><h3>${esc(r.description)}</h3><small>${esc(r.category)} · ${frequencyLabel(r)}</small></div><span class="status ${r.active===false?"paused":""}">${r.active===false?"In pausa":"Attiva"}</span></div><div class="rec-middle"><strong class="${r.type==="income"?"positive":"negative"}">${r.type==="income"?"+":"−"}${money(r.amount)}</strong><span>Prossima: ${fmtDate(nextRecurring(r))}</span></div><div class="rec-foot"><button class="btn tiny secondary" data-toggle-rec="${r.id}">${r.active===false?"Riattiva":"Sospendi"}</button><div class="row-actions"><button class="mini-btn" data-edit-rec="${r.id}">✎</button><button class="mini-btn" data-del-rec="${r.id}">×</button></div></div></div>`).join(""):"<div class='empty large'>Nessuna entrata o spesa ricorrente.</div>";
  $("recurringGrid").querySelectorAll("[data-toggle-rec]").forEach(b=>b.onclick=()=>{const r=state.recurring.find(x=>x.id===b.dataset.toggleRec);r.active=r.active===false;commit(true);});
  $("recurringGrid").querySelectorAll("[data-edit-rec]").forEach(b=>b.onclick=()=>openRecurring(b.dataset.editRec));
  $("recurringGrid").querySelectorAll("[data-del-rec]").forEach(b=>b.onclick=()=>deleteRecurring(b.dataset.delRec));
}
function frequencyLabel(r){if(r.frequency==="weekly")return"Ogni settimana";if(r.frequency==="yearly")return"Ogni anno";return"Ogni mese";}

function renderAnalytics(){
  const n=Number($("analyticsPeriod")?.value||6), months=[];for(let i=n-1;i>=0;i--){const d=new Date();d.setMonth(d.getMonth()-i);months.push(d)}
  const vals=months.map(d=>{const k=d.toISOString().slice(0,7),ts=state.transactions.filter(t=>t.date.startsWith(k));return{d,inc:income(ts),exp:expense(ts),net:income(ts)-expense(ts)}});
  const totalI=sum(vals,x=>x.inc),totalE=sum(vals,x=>x.exp),avgE=totalE/n,rate=totalI?Math.round((totalI-totalE)/totalI*100):0;
  const best=vals.reduce((a,b)=>b.net>a.net?b:a,vals[0]||{net:0});
  $("analyticsCards").innerHTML=`<div class="analytics-card"><span>Entrate totali</span><strong class="positive">${money(totalI)}</strong><small>ultimi ${n} mesi</small></div><div class="analytics-card"><span>Spese totali</span><strong class="negative">${money(totalE)}</strong><small>ultimi ${n} mesi</small></div><div class="analytics-card"><span>Media spese/mese</span><strong>${money(avgE)}</strong><small>media del periodo</small></div><div class="analytics-card"><span>Tasso risparmio</span><strong>${rate}%</strong><small>del reddito</small></div><div class="analytics-card"><span>Mese migliore</span><strong>${money(best.net||0)}</strong><small>${best.d?monthLabel(best.d):"—"}</small></div>`;
  const max=Math.max(1,...vals.flatMap(x=>[x.inc,x.exp]));
  $("incomeExpenseChart").innerHTML=vals.map(x=>`<div class="compare-col"><div class="compare-bars"><i class="bar-income" style="height:${clamp(x.inc/max*100,2,100)}%"></i><i class="bar-expense" style="height:${clamp(x.exp/max*100,2,100)}%"></i></div><small>${new Intl.DateTimeFormat("it-IT",{month:"short"}).format(x.d)}</small></div>`).join("");
  const mt=monthTransactions(),by={};mt.filter(t=>t.type==="expense").forEach(t=>by[t.category]=(by[t.category]||0)+Number(t.amount));const cats=Object.entries(by).sort((a,b)=>b[1]-a[1]).slice(0,8),mx=cats[0]?.[1]||1;
  $("categoryBars").innerHTML=cats.length?cats.map(([c,v],i)=>`<div class="cat-bar-row"><div><span>${catIcon("expense",c)} ${esc(c)}</span><b>${money(v)}</b></div><div class="progress"><i style="width:${v/mx*100}%;background:${COLORS[i%COLORS.length]}"></i></div></div>`).join(""):"<div class='empty'>Nessuna spesa questo mese.</div>";
}
$("analyticsPeriod").addEventListener("change",renderAnalytics);

function renderCalendar(){
  const y=calendarDate.getFullYear(),m=calendarDate.getMonth();$("calendarTitle").textContent=new Intl.DateTimeFormat("it-IT",{month:"long",year:"numeric"}).format(calendarDate);
  const first=new Date(y,m,1),days=new Date(y,m+1,0).getDate(),offset=(first.getDay()+6)%7;
  const headers=["Lun","Mar","Mer","Gio","Ven","Sab","Dom"];let out=headers.map(h=>`<div class="cal-head">${h}</div>`).join("");
  for(let i=0;i<offset;i++)out+=`<div class="cal-cell empty-day"></div>`;
  for(let day=1;day<=days;day++){const d=`${y}-${String(m+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`,ts=state.transactions.filter(t=>t.date===d),inc=income(ts),exp=expense(ts),isToday=d===today();out+=`<div class="cal-cell ${isToday?"today":""}" data-cal-date="${d}"><span class="day-num">${day}</span>${inc?`<small class="cal-income">+${money(inc)}</small>`:""}${exp?`<small class="cal-expense">−${money(exp)}</small>`:""}</div>`}
  $("calendarGrid").innerHTML=out;
  $("calendarGrid").querySelectorAll("[data-cal-date]").forEach(c=>c.onclick=()=>{const d=c.dataset.calDate;$("txFrom").value=d;$("txTo").value=d;showSection("transactions");renderTransactions()});
}
$("prevMonth").onclick=()=>{calendarDate.setMonth(calendarDate.getMonth()-1);renderCalendar()};
$("nextMonth").onclick=()=>{calendarDate.setMonth(calendarDate.getMonth()+1);renderCalendar()};

function buildAlerts(){
  const a=[],mt=monthTransactions();
  Object.entries(state.budgets).forEach(([c,l])=>{const u=sum(mt.filter(t=>t.type==="expense"&&t.category===c));const p=percent(u,l);if(p>=100)a.push({level:"danger",title:`Budget ${c} superato`,text:`Hai speso ${money(u)} su ${money(l)}.`});else if(p>=80)a.push({level:"warn",title:`Budget ${c} quasi esaurito`,text:`Hai utilizzato il ${p}% del limite.`})});
  const sav=income(mt)-expense(mt);if(sav<0)a.push({level:"danger",title:"Mese in negativo",text:`Le spese superano le entrate di ${money(Math.abs(sav))}.`});
  const upcoming=state.recurring.filter(r=>r.active!==false).map(r=>({r,d:new Date(nextRecurring(r)+"T00:00:00")})).filter(x=>(x.d-new Date())<8*864e5&&x.d>=new Date());
  if(upcoming.length)a.push({level:"info",title:`${upcoming.length} ricorrenze nei prossimi 7 giorni`,text:upcoming.map(x=>x.r.description).join(", ")});
  return a;
}
function renderAlerts(){
  const a=buildAlerts();$("alertsList").innerHTML=a.length?a.map(x=>`<div class="alert-card ${x.level}"><div class="alert-icon">${x.level==="danger"?"⚠":x.level==="warn"?"!":"i"}</div><div><strong>${esc(x.title)}</strong><p>${esc(x.text)}</p></div></div>`).join(""):"<div class='empty large'>✓ Nessun avviso. La situazione sembra sotto controllo.</div>";
}
function updateBadge(){const n=buildAlerts().length;$("alertBadge").textContent=n;$("alertBadge").classList.toggle("hidden",!n)}

function renderCategories(){
  const rows=[...state.categories.expense.map(x=>({type:"expense",name:x[0],icon:x[1]})),...state.categories.income.map(x=>({type:"income",name:x[0],icon:x[1]}))];
  $("categoriesGrid").innerHTML=rows.map(c=>`<div class="category-card"><span class="category-icon">${c.icon}</span><div class="grow"><strong>${esc(c.name)}</strong><small>${c.type==="income"?"Entrata":"Spesa"}</small></div><button class="mini-btn" data-edit-cat="${c.type}|${encodeURIComponent(c.name)}">✎</button><button class="mini-btn" data-del-cat="${c.type}|${encodeURIComponent(c.name)}">×</button></div>`).join("");
  $("categoriesGrid").querySelectorAll("[data-edit-cat]").forEach(b=>b.onclick=()=>openCategory(b.dataset.editCat));
  $("categoriesGrid").querySelectorAll("[data-del-cat]").forEach(b=>b.onclick=()=>deleteCategory(b.dataset.delCat));
}
function renderChangelog(){
  $("changelogContent").innerHTML=[["7.2.2","Smartphone, tablet e PWA",["Interfaccia responsive","Navigazione mobile","PWA installabile","Supporto smartphone e tablet","Service Worker per uso più affidabile","Icone PWA dedicate"]],
    ["7.1.0","Backup automatici e sicurezza dei dati",["Backup automatico all'avvio","Conservazione degli ultimi 15 backup","Ripristino completo dei dati","Gestione backup dalle Impostazioni","Apertura della cartella dei backup","Icona personalizzata dell'app"]],
    ["7.0.0","Finanza personale completa",["Dashboard finanziaria avanzata","Previsioni e analisi delle spese","Obiettivi di risparmio","Calendario finanziario","Avvisi intelligenti","Categorie personalizzabili","Ricorrenze settimanali, mensili e annuali","PIN e blocco automatico"]],
    ["5.3.1","Pulizia interfaccia",["Rimossa la vecchia scritta blu flottante","Rifiniture del tema chiaro e tipografia"]],
    ["5.3.0","Rifinitura tema chiaro",["Palette più morbida","Font e gerarchia tipografica migliorati","Pulsanti e contrasto rifiniti"]],
    ["5.2.0","Changelog integrato e branding",["Changelog direttamente nell'app","Logo SVG e favicon","GUI e controlli migliorati"]],
    ["5.1.0","Correzioni interfaccia",["Modalità scura corretta","Risolti problemi di duplicazione logo"]],
    ["5.0.0","Restyling grafico",["Nuova identità visiva","Dashboard e componenti ridisegnati"]],
    ["4.0.0","Ricorrenze e filtri",["Spese ricorrenti","Filtri avanzati","Migrazione e backup"]],
    ["3.0.0","Backup e compatibilità",["Versionamento dati","Backup automatici","Import/export JSON"]],
    ["2.0.0","Entrate ricorrenti",["Entrate mensili automatiche"]],
    ["1.0.0","Prima versione",["Dashboard, transazioni, budget e salvataggio locale"]]
  ].map((v,i)=>`<article class="timeline-item ${i===0?"current":""}"><div class="timeline-dot"></div><div class="timeline-card"><div class="timeline-head"><span class="version-pill">${v[0]}</span>${i===0?"<b>VERSIONE ATTUALE</b>":""}</div><h3>${v[1]}</h3><ul>${v[2].map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div></article>`).join("");
}
function renderSettings(){
  $("pinStatus").textContent=state.settings.pinHash?"PIN attivo":"PIN non attivo";
  $("pinToggle").textContent=state.settings.pinHash?"Cambia/Rimuovi PIN":"Configura PIN";
  $("autoLock").value=String(state.settings.autoLock||0);$("themeSelect").value=state.settings.dark?"dark":"light";
  document.body.classList.toggle("dark",!!state.settings.dark);$("themeBtn").textContent=state.settings.dark?"☾":"☀";
}

function openModal(content){$("modalContent").innerHTML=content;$("modal").classList.remove("hidden")}
$("modalClose").onclick=()=>$("modal").classList.add("hidden");$("modal").addEventListener("click",e=>{if(e.target===$("modal"))$("modal").classList.add("hidden")});

function accountOptions(selected="main"){return state.accounts.map(a=>`<option value="${a.id}" ${a.id===selected?"selected":""}>${esc(a.icon||"💳")} ${esc(a.name)}</option>`).join("")}
function categoryOptions(type,selected=""){return catList(type).map(c=>`<option value="${esc(c[0])}" ${c[0]===selected?"selected":""}>${esc(c[1])} ${esc(c[0])}</option>`).join("")}

function openTransaction(id=null,type="expense"){
  const t=id?state.transactions.find(x=>x.id===id):null,tt=t?.type||type;
  openModal(`<h2>${t?"Modifica transazione":"Nuova transazione"}</h2><p class="modal-sub">Registra il movimento in modo rapido e preciso.</p>
  <form id="txForm" class="form-grid">
    <label>Tipo<select id="fType" class="input"><option value="expense" ${tt==="expense"?"selected":""}>Spesa</option><option value="income" ${tt==="income"?"selected":""}>Entrata</option></select></label>
    <label>Importo<input id="fAmount" class="input" type="number" min=".01" step=".01" required value="${t?.amount||""}"></label>
    <label>Data<input id="fDate" class="input" type="date" required value="${t?.date||today()}"></label>
    <label>Conto<select id="fAccount" class="input">${accountOptions(t?.accountId||"main")}</select></label>
    <label>Categoria<select id="fCategory" class="input">${categoryOptions(tt,t?.category||"")}</select></label>
    <label>Metodo<input id="fMethod" class="input" value="${esc(t?.method||"Carta")}"></label>
    <label class="wide">Descrizione<input id="fDesc" class="input" required value="${esc(t?.description||"")}"></label>
    <label class="wide">Nota<textarea id="fNote" class="input">${esc(t?.note||"")}</textarea></label>
    <div class="modal-actions wide"><button type="button" class="btn secondary" id="cancelModal">Annulla</button><button class="btn primary">Salva</button></div>
  </form>`);
  $("fType").onchange=()=>{$("fCategory").innerHTML=categoryOptions($("fType").value,"")};
  $("cancelModal").onclick=()=>$("modal").classList.add("hidden");
  $("txForm").onsubmit=e=>{e.preventDefault();const row={id:t?.id||uid(),type:$("fType").value,amount:Number($("fAmount").value),date:$("fDate").value,accountId:$("fAccount").value,category:$("fCategory").value,method:$("fMethod").value,description:$("fDesc").value,note:$("fNote").value};if(t)state.transactions[state.transactions.findIndex(x=>x.id===t.id)]=row;else state.transactions.push(row);$("modal").classList.add("hidden");commit(true);toast(t?"Transazione modificata":"Transazione salvata","success")};
}
function deleteTransaction(id){if(confirm("Eliminare questa transazione?")){backup();state.transactions=state.transactions.filter(t=>t.id!==id);commit();toast("Transazione eliminata")}}

function openAccount(id=null){
  const a=id?state.accounts.find(x=>x.id===id):null;
  openModal(`<h2>${a?"Modifica conto":"Nuovo conto"}</h2><form id="accountForm" class="form-grid">
  <label>Nome<input id="aName" class="input" required value="${esc(a?.name||"")}"></label>
  <label>Tipo<select id="aType" class="input"><option>Conto corrente</option><option>Carta</option><option>Contanti</option><option>Risparmi</option><option>PayPal</option><option>Altro</option></select></label>
  <label>Saldo iniziale<input id="aInitial" class="input" type="number" step=".01" value="${a?.initial??0}"></label>
  <label>Icona<input id="aIcon" class="input" maxlength="2" value="${esc(a?.icon||"💳")}"></label>
  <div class="modal-actions wide"><button type="button" class="btn secondary" id="cancelModal">Annulla</button><button class="btn primary">Salva</button></div></form>`);
  if(a)$("aType").value=a.type;
  $("cancelModal").onclick=()=>$("modal").classList.add("hidden");
  $("accountForm").onsubmit=e=>{e.preventDefault();const row={id:a?.id||uid(),name:$("aName").value,type:$("aType").value,initial:Number($("aInitial").value)||0,icon:$("aIcon").value||"💳"};if(a)state.accounts[state.accounts.findIndex(x=>x.id===a.id)]=row;else state.accounts.push(row);$("modal").classList.add("hidden");commit(true);toast("Conto salvato","success")};
}
function deleteAccount(id){if(state.accounts.length<=1)return;const used=state.transactions.some(t=>t.accountId===id);if(used){alert("Questo conto contiene transazioni. Spostale prima di eliminarlo.");return}if(confirm("Eliminare il conto?")){backup();state.accounts=state.accounts.filter(a=>a.id!==id);commit()}}

function openBudget(cat=null){
  openModal(`<h2>${cat?"Modifica budget":"Nuovo budget"}</h2><form id="budgetForm" class="form-grid"><label>Categoria<select id="bCat" class="input">${catList("expense").map(x=>`<option value="${esc(x[0])}" ${x[0]===cat?"selected":""}>${x[1]} ${esc(x[0])}</option>`).join("")}</select></label><label>Limite mensile<input id="bAmount" class="input" type="number" min=".01" step=".01" required value="${cat?state.budgets[cat]:""}"></label><div class="modal-actions wide"><button type="button" class="btn secondary" id="cancelModal">Annulla</button><button class="btn primary">Salva</button></div></form>`);
  $("cancelModal").onclick=()=>$("modal").classList.add("hidden");
  $("budgetForm").onsubmit=e=>{e.preventDefault();const c=$("bCat").value,a=Number($("bAmount").value);if(cat&&cat!==c)delete state.budgets[cat];state.budgets[c]=a;$("modal").classList.add("hidden");commit(true);toast("Budget salvato","success")};
}
function deleteBudget(cat){if(confirm("Eliminare questo budget?")){backup();delete state.budgets[cat];commit()}}

function openGoal(id=null){
  const g=id?state.goals.find(x=>x.id===id):null;
  openModal(`<h2>${g?"Modifica obiettivo":"Nuovo obiettivo"}</h2><form id="goalForm" class="form-grid"><label>Nome obiettivo<input id="gName" class="input" required value="${esc(g?.name||"")}"></label><label>Importo obiettivo<input id="gTarget" class="input" type="number" min=".01" step=".01" required value="${g?.target||""}"></label><label>Risparmi attuali<input id="gSaved" class="input" type="number" min="0" step=".01" value="${g?.saved||0}"></label><label>Scadenza<input id="gDeadline" class="input" type="date" value="${g?.deadline||""}"></label><label>Icona<input id="gIcon" class="input" maxlength="2" value="${esc(g?.icon||"🎯")}"></label><div class="modal-actions wide"><button type="button" class="btn secondary" id="cancelModal">Annulla</button><button class="btn primary">Salva</button></div></form>`);
  $("cancelModal").onclick=()=>$("modal").classList.add("hidden");
  $("goalForm").onsubmit=e=>{e.preventDefault();const row={id:g?.id||uid(),name:$("gName").value,target:Number($("gTarget").value),saved:Number($("gSaved").value)||0,deadline:$("gDeadline").value,icon:$("gIcon").value||"🎯"};if(g)state.goals[state.goals.findIndex(x=>x.id===g.id)]=row;else state.goals.push(row);$("modal").classList.add("hidden");commit(true);toast("Obiettivo salvato","success")};
}
function deleteGoal(id){if(confirm("Eliminare l'obiettivo?")){backup();state.goals=state.goals.filter(g=>g.id!==id);commit()}}

function openRecurring(id=null){
  const r=id?state.recurring.find(x=>x.id===id):null;
  openModal(`<h2>${r?"Modifica ricorrenza":"Nuova ricorrenza"}</h2><p class="modal-sub">Puoi creare entrate o spese settimanali, mensili o annuali.</p><form id="recForm" class="form-grid">
  <label>Tipo<select id="rType" class="input"><option value="expense" ${r?.type==="expense"?"selected":""}>Spesa</option><option value="income" ${r?.type==="income"?"selected":""}>Entrata</option></select></label>
  <label>Importo<input id="rAmount" class="input" type="number" min=".01" step=".01" required value="${r?.amount||""}"></label>
  <label>Frequenza<select id="rFreq" class="input"><option value="monthly">Mensile</option><option value="weekly">Settimanale</option><option value="yearly">Annuale</option></select></label>
  <label id="rDayLabel">Giorno del mese<input id="rDay" class="input" type="number" min="1" max="28" value="${r?.day||1}"></label>
  <label>Data di inizio<input id="rStart" class="input" type="date" required value="${r?.startDate||today()}"></label>
  <label>Conto<select id="rAccount" class="input">${accountOptions(r?.accountId||"main")}</select></label>
  <label>Categoria<select id="rCategory" class="input">${categoryOptions(r?.type||"expense",r?.category||"")}</select></label>
  <label>Metodo<input id="rMethod" class="input" value="${esc(r?.method||"Bonifico")}"></label>
  <label class="wide">Descrizione<input id="rDesc" class="input" required value="${esc(r?.description||"")}"></label>
  <div class="modal-actions wide"><button type="button" class="btn secondary" id="cancelModal">Annulla</button><button class="btn primary">Salva</button></div></form>`);
  $("rFreq").value=r?.frequency||"monthly";
  const update=()=>{const f=$("rFreq").value;$("rDayLabel").style.display=f==="monthly"?"block":"none";$("rCategory").innerHTML=categoryOptions($("rType").value,"")};
  $("rType").onchange=update;$("rFreq").onchange=update;update();
  $("cancelModal").onclick=()=>$("modal").classList.add("hidden");
  $("recForm").onsubmit=e=>{e.preventDefault();const row={id:r?.id||uid(),type:$("rType").value,amount:Number($("rAmount").value),frequency:$("rFreq").value,day:Number($("rDay").value)||1,startDate:$("rStart").value,accountId:$("rAccount").value,category:$("rCategory").value,method:$("rMethod").value,description:$("rDesc").value,active:r?.active!==false};if(r)state.recurring[state.recurring.findIndex(x=>x.id===r.id)]=row;else state.recurring.push(row);$("modal").classList.add("hidden");commit(true);toast("Ricorrenza salvata","success")};
}
function deleteRecurring(id){if(confirm("Eliminare questa ricorrenza?")){backup();state.recurring=state.recurring.filter(r=>r.id!==id);commit()}}

function openCategory(key=null){
  let type="expense",old="",item=null;if(key){[type,old]=key.split("|");old=decodeURIComponent(old);item=state.categories[type].find(x=>x[0]===old)}
  openModal(`<h2>${item?"Modifica categoria":"Nuova categoria"}</h2><form id="catForm" class="form-grid"><label>Tipo<select id="cType" class="input"><option value="expense" ${type==="expense"?"selected":""}>Spesa</option><option value="income" ${type==="income"?"selected":""}>Entrata</option></select></label><label>Nome<input id="cName" class="input" required value="${esc(item?.[0]||"")}"></label><label>Icona<input id="cIcon" class="input" maxlength="2" value="${esc(item?.[1]||"📌")}"></label><div class="modal-actions wide"><button type="button" class="btn secondary" id="cancelModal">Annulla</button><button class="btn primary">Salva</button></div></form>`);
  $("cancelModal").onclick=()=>$("modal").classList.add("hidden");
  $("catForm").onsubmit=e=>{e.preventDefault();const nt=$("cType").value,nn=$("cName").value.trim(),ni=$("cIcon").value||"📌";if(!nn)return;let target=state.categories[nt];if(item){state.categories[type]=state.categories[type].filter(x=>x[0]!==old);state.categories[nt]=state.categories[nt].filter(x=>x[0]!==nn);state.categories[nt].push([nn,ni]);state.transactions.forEach(t=>{if(t.type===type&&t.category===old)t.category=nn})}else{if(target.some(x=>x[0]===nn))return alert("Categoria già esistente.");target.push([nn,ni])}$("modal").classList.add("hidden");commit(true);toast("Categoria salvata","success")};
}
function deleteCategory(key){let [type,name]=key.split("|");name=decodeURIComponent(name);if(state.categories[type].length<=1)return alert("Deve rimanere almeno una categoria.");if(confirm(`Eliminare la categoria "${name}"?`)){state.categories[type]=state.categories[type].filter(x=>x[0]!==name);commit(true)}}

function pinSetup(){
  if(state.settings.pinHash){
    openModal(`<h2>Gestione PIN</h2><p class="modal-sub">Puoi cambiare o rimuovere il PIN.</p><div class="pin-actions"><button class="btn primary" id="changePin">Cambia PIN</button><button class="btn danger" id="removePin">Rimuovi PIN</button></div>`);
    $("changePin").onclick=()=>pinForm();$("removePin").onclick=()=>{if(confirm("Rimuovere la protezione PIN?")){state.settings.pinHash="";save();$("modal").classList.add("hidden");renderSettings();toast("PIN rimosso")}};
  }else pinForm();
}
function pinForm(){
  openModal(`<h2>Imposta PIN</h2><p class="modal-sub">Usa un PIN da 4 a 8 cifre. Il PIN serve a bloccare l'app su questo browser.</p><form id="pinForm"><label>Nuovo PIN<input id="p1" class="input pin-input" inputmode="numeric" maxlength="8" type="password" pattern="[0-9]{4,8}" required></label><label>Conferma PIN<input id="p2" class="input pin-input" inputmode="numeric" maxlength="8" type="password" pattern="[0-9]{4,8}" required></label><div class="modal-actions"><button type="button" class="btn secondary" id="cancelModal">Annulla</button><button class="btn primary">Salva PIN</button></div></form>`);
  $("cancelModal").onclick=()=>$("modal").classList.add("hidden");
  $("pinForm").onsubmit=e=>{e.preventDefault();if($("p1").value!==$("p2").value)return alert("I PIN non coincidono.");if(!/^\d{4,8}$/.test($("p1").value))return alert("Il PIN deve contenere da 4 a 8 cifre.");state.settings.pinHash=hashPin($("p1").value);save();$("modal").classList.add("hidden");renderSettings();toast("PIN attivato","success")};
}

function exportData(){
  backup();const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`gestione-spese-v${VERSION}-backup.json`;a.click();URL.revokeObjectURL(a.href);toast("Backup esportato","success")
}
$("importFile").onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const imported=normalize(JSON.parse(r.result));backup();state=imported;save();renderAll();toast("Backup importato","success")}catch(err){alert("File non valido.")}};r.readAsText(f)};
$("exportBtn").onclick=exportData;
$("resetBtn").onclick=()=>{if(confirm("ATTENZIONE: cancellerai tutti i dati locali. Continuare?")&&confirm("Sei sicuro? Questa operazione non è annullabile senza un backup.")){backup();state=defaultState();save();renderAll();toast("Dati cancellati")}};
$("pinToggle").onclick=pinSetup;
$("autoLock").onchange=()=>{state.settings.autoLock=Number($("autoLock").value);save();toast("Blocco automatico aggiornato","success")};
$("themeSelect").onchange=()=>{state.settings.dark=$("themeSelect").value==="dark";save();renderSettings()};
$("themeBtn").onclick=()=>{state.settings.dark=!state.settings.dark;save();renderSettings()};

$("unlockBtn").onclick=unlock;$("lockPin").addEventListener("keydown",e=>{if(e.key==="Enter")unlock()});
$("lockBtn").onclick=()=>{if(state.settings.pinHash)showLock();else pinForm()};

function bindActions(){
  $("quickExpense").onclick=()=>openTransaction(null,"expense");
  $("quickIncome").onclick=()=>openTransaction(null,"income");
  $("quickRecurring").onclick=()=>openRecurring();
  document.querySelectorAll("[data-action]").forEach(b=>b.onclick=()=>{const a=b.dataset.action;if(a==="backup-manager")showBackupManager();if(a==="new-expense")openTransaction(null,"expense");if(a==="new-account")openAccount();if(a==="new-budget")openBudget();if(a==="new-goal")openGoal();if(a==="new-recurring")openRecurring();if(a==="new-category")openCategory();if(a==="new-subscription")openSubscription();if(a==="new-debt")openDebt();if(a==="new-receipt")openReceipt()});
}
bindActions();

function init(){
  // Preserve previous local data and create a backup before first migration.
  if(state.version!=="7.0.0"){backup();state.version=VERSION;save()}
  if(state.settings.pinHash)showLock();
  else {$("app").classList.remove("hidden");renderAll()}
}
init();

// v7.2.2 — Mobile/PWA navigation
// On mobile the app uses the same section system as the desktop sidebar.
// Using scrollIntoView here was incorrect because inactive sections use
// display:none; the navigation must call showSection() instead.
function activateMobileNav(target) {
  document.querySelectorAll(".mobile-nav-item").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.mobileTarget === target);
  });
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest(".mobile-nav-item[data-mobile-target]");
  if (!btn) return;

  const target = btn.dataset.mobileTarget;
  if (!document.getElementById(target)) return;

  showSection(target);
  activateMobileNav(target);

  // Start each section at its top, without keeping the dashboard/header fixed.
  const main = document.querySelector("main");
  if (main) main.scrollTo({top: 0, behavior: "smooth"});
  else window.scrollTo({top: 0, behavior: "smooth"});
});

const originalShowSection = showSection;
showSection = function(id) {
  originalShowSection(id);
  activateMobileNav(id);
};
