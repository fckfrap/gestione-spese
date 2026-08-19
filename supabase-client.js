/* Gestione Spese v7.3.0 - Supabase REST client
   The publishable/anon key is safe to expose in a browser app.
   NEVER put the service_role key in this file. */
const SUPABASE_CONFIG = {
  url: "https://ruldeqnxgcbgxtmsdvxs.supabase.co",
  anonKey: "sb_publishable_tf1MJ5MjV_vk0AJeIRB4ig_K49ZF_UJ"
};

const SupabaseSync = (() => {
  const configured = () => !!SUPABASE_CONFIG.url && !!SUPABASE_CONFIG.anonKey && !SUPABASE_CONFIG.anonKey.startsWith("INSERISCI_");
  const SESSION_KEY = "gestioneSpeseSupabaseSession";
  let session = null;
  let timer = null;
  let syncing = false;
  let initialized = false;

  function readSession(){
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
  }
  function writeSession(value){
    session=value;
    if(value) localStorage.setItem(SESSION_KEY, JSON.stringify(value));
    else localStorage.removeItem(SESSION_KEY);
  }
  function authHeaders(token=session?.access_token){
    return {
      apikey: SUPABASE_CONFIG.anonKey,
      Authorization: `Bearer ${token || SUPABASE_CONFIG.anonKey}`,
      "Content-Type": "application/json"
    };
  }
  async function request(path, options={}){
    const res=await fetch(SUPABASE_CONFIG.url+path, {
      ...options,
      headers:{...authHeaders(),...(options.headers||{})}
    });
    const text=await res.text();
    let body=null; try{body=text?JSON.parse(text):null}catch{body=text}
    if(!res.ok) throw new Error(body?.msg||body?.message||body?.error_description||body?.error||`Supabase HTTP ${res.status}`);
    return body;
  }
  async function authRequest(path, options={}){
    const res=await fetch(SUPABASE_CONFIG.url+path, {
      ...options,
      headers:{apikey:SUPABASE_CONFIG.anonKey,"Content-Type":"application/json",...(options.headers||{})}
    });
    const text=await res.text();
    let body=null; try{body=text?JSON.parse(text):null}catch{body=text}
    if(!res.ok) throw new Error(body?.msg||body?.message||body?.error_description||body?.error||`Supabase Auth HTTP ${res.status}`);
    return body;
  }

  async function signUp(email,password){
    if(!configured()) throw new Error("Configura prima la publishable/anon key di Supabase.");
    const data=await authRequest("/auth/v1/signup",{method:"POST",body:JSON.stringify({email,password})});
    if(data?.access_token) writeSession(data);
    return data;
  }
  async function signIn(email,password){
    if(!configured()) throw new Error("Configura prima la publishable/anon key di Supabase.");
    const data=await authRequest("/auth/v1/token?grant_type=password",{method:"POST",body:JSON.stringify({email,password})});
    writeSession(data);
    return data;
  }
  async function refresh(){
    if(!session?.refresh_token) return false;
    try{
      const data=await authRequest("/auth/v1/token?grant_type=refresh_token",{method:"POST",body:JSON.stringify({refresh_token:session.refresh_token})});
      writeSession(data); return true;
    }catch{writeSession(null);return false;}
  }
  async function signOut(){
    try{ if(session?.access_token) await authRequest("/auth/v1/logout",{method:"POST",headers:{Authorization:`Bearer ${session.access_token}`}}); }catch{}
    writeSession(null);
  }
  function user(){ return session?.user || null; }
  function isAuthenticated(){ return !!session?.access_token; }

  async function getTable(table){
    return request(`/rest/v1/${table}?select=*`);
  }
  async function upsert(table, rows){
    if(!rows.length) return;
    await request(`/rest/v1/${table}`,{
      method:"POST",
      headers:{Prefer:"resolution=merge-duplicates,return=minimal"},
      body:JSON.stringify(rows)
    });
  }
  async function removeMissing(table, localIds, idColumn="id"){
    const remote=await request(`/rest/v1/${table}?select=${idColumn}`);
    const keep=new Set(localIds.map(String));
    const remove=remote.filter(r=>!keep.has(String(r[idColumn]))).map(r=>r[idColumn]);
    for(const id of remove){
      await request(`/rest/v1/${table}?${encodeURIComponent(idColumn)}=eq.${encodeURIComponent(id)}`,{method:"DELETE"});
    }
  }

  function accountRows(state){return state.accounts.map(a=>({id:String(a.id),user_id:user().id,name:a.name,type:a.type,initial:Number(a.initial)||0,icon:a.icon||"💳"}));}
  function transactionRows(state){return state.transactions.map(t=>({id:String(t.id),user_id:user().id,type:t.type,amount:Number(t.amount)||0,date:t.date,account_id:t.accountId||null,category:t.category||"Altro",method:t.method||"Altro",description:t.description||"Movimento",note:t.note||"",recurring_id:t.recurringId||null,occurrence:t.occurrence||null}));}
  function recurringRows(state){return state.recurring.map(r=>({id:String(r.id),user_id:user().id,type:r.type,amount:Number(r.amount)||0,frequency:r.frequency||"monthly",day:Number(r.day)||1,start_date:r.startDate||null,account_id:r.accountId||null,category:r.category||"Altro",method:r.method||"Bonifico",description:r.description||"",active:r.active!==false}));}
  function budgetRows(state){return Object.entries(state.budgets).map(([category,amount])=>({id:`budget_${encodeURIComponent(category)}`,user_id:user().id,category,amount:Number(amount)||0}));}
  function goalRows(state){return state.goals.map(g=>({id:String(g.id),user_id:user().id,name:g.name,target:Number(g.target)||0,saved:Number(g.saved)||0,deadline:g.deadline||null,icon:g.icon||"🎯"}));}
  function subscriptionRows(state){return state.subscriptions.map(s=>({id:String(s.id),user_id:user().id,name:s.name,amount:Number(s.amount)||0,frequency:s.frequency||"monthly",day:Number(s.day)||1,start_date:s.startDate||null,icon:s.icon||"◉"}));}
  function debtRows(state){return state.debts.map(d=>({id:String(d.id),user_id:user().id,name:d.name,total:Number(d.total)||0,remaining:Number(d.remaining)||0,installment:Number(d.installment)||0,next_date:d.nextDate||null,icon:d.icon||"💳"}));}
  function categoryRows(state){return [...(state.categories.expense||[]).map(x=>({type:"expense",name:x[0],icon:x[1]})),...(state.categories.income||[]).map(x=>({type:"income",name:x[0],icon:x[1]}))].map(x=>({id:`${x.type}_${encodeURIComponent(x.name)}`,user_id:user().id,type:x.type,name:x.name,icon:x.icon||"📌"}));}
  function netWorthRows(state){return state.netWorthHistory.map(x=>({id:`${String(x.month).slice(0,7)}`,user_id:user().id,month:String(x.month).slice(0,10),value:Number(x.value)||0}));}

  async function pushState(state){
    if(!isAuthenticated() || syncing) return;
    syncing=true;
    try{
      const groups=[
        ["accounts",accountRows(state)],
        ["transactions",transactionRows(state)],
        ["recurring",recurringRows(state)],
        ["budgets",budgetRows(state)],
        ["goals",goalRows(state)],
        ["subscriptions",subscriptionRows(state)],
        ["debts",debtRows(state)],
        ["categories",categoryRows(state)],
        ["net_worth_history",netWorthRows(state)]
      ];
      for(const [table,rows] of groups){
        await upsert(table,rows);
        await removeMissing(table,rows.map(r=>r.id));
      }
      localStorage.setItem("gestioneSpeseLastSync",new Date().toISOString());
    } finally { syncing=false; }
  }

  async function pullState(state){
    if(!isAuthenticated() || syncing) return state;
    syncing=true;
    try{
      const [accounts,transactions,recurring,budgets,goals,subscriptions,debts,categories,history]=await Promise.all([
        getTable("accounts"),getTable("transactions"),getTable("recurring"),getTable("budgets"),getTable("goals"),getTable("subscriptions"),getTable("debts"),getTable("categories"),getTable("net_worth_history")
      ]);
      const hasCloudData=[accounts,transactions,recurring,budgets,goals,subscriptions,debts,categories,history].some(a=>a.length);
      if(!hasCloudData){ syncing=false; await pushState(state); return state; }

      if(accounts.length) state.accounts=accounts.map(a=>({id:a.id,name:a.name,type:a.type,initial:Number(a.initial)||0,icon:a.icon||"💳"}));
      state.transactions=transactions.map(t=>({id:t.id,type:t.type,amount:Number(t.amount)||0,date:t.date,accountId:t.account_id||"main",category:t.category||"Altro",method:t.method||"Altro",description:t.description||"Movimento",note:t.note||"",recurringId:t.recurring_id||undefined,occurrence:t.occurrence||undefined}));
      state.recurring=recurring.map(r=>({id:r.id,type:r.type,amount:Number(r.amount)||0,frequency:r.frequency,day:Number(r.day)||1,startDate:r.start_date,accountId:r.account_id||"main",category:r.category||"Altro",method:r.method||"Bonifico",description:r.description||"",active:r.active!==false}));
      state.budgets={}; budgets.forEach(b=>state.budgets[b.category]=Number(b.amount)||0);
      state.goals=goals.map(g=>({id:g.id,name:g.name,target:Number(g.target)||0,saved:Number(g.saved)||0,deadline:g.deadline||"",icon:g.icon||"🎯"}));
      state.subscriptions=subscriptions.map(s=>({id:s.id,name:s.name,amount:Number(s.amount)||0,frequency:s.frequency,day:Number(s.day)||1,startDate:s.start_date,icon:s.icon||"◉"}));
      state.debts=debts.map(d=>({id:d.id,name:d.name,total:Number(d.total)||0,remaining:Number(d.remaining)||0,installment:Number(d.installment)||0,nextDate:d.next_date||"",icon:d.icon||"💳"}));
      state.categories={expense:categories.filter(c=>c.type==="expense").map(c=>[c.name,c.icon||"📌"]),income:categories.filter(c=>c.type==="income").map(c=>[c.name,c.icon||"📌"])};
      if(!state.categories.expense.length) state.categories.expense=defaultCategoriesFallback("expense");
      if(!state.categories.income.length) state.categories.income=defaultCategoriesFallback("income");
      state.netWorthHistory=history.map(h=>({month:String(h.month).slice(0,10),value:Number(h.value)||0}));
      localStorage.setItem("gestioneSpeseLastSync",new Date().toISOString());
      return state;
    } finally { syncing=false; }
  }

  function defaultCategoriesFallback(type){
    const values=type==="expense" ? [["Cibo","🍔"],["Casa","🏠"],["Auto","🚗"],["Telefonia","📱"],["Svago","🎮"],["Abbigliamento","👕"],["Studio","📚"],["Tecnologia","💻"],["Salute","💊"],["Altro","📦"]] : [["Stipendio","💼"],["Rimborso","↩️"],["Regalo","🎁"],["Extra","💰"],["Altro","📥"]];
    return values;
  }

  function queueSave(state){
    if(!isAuthenticated() || syncing) return;
    clearTimeout(timer);
    timer=setTimeout(async()=>{
      try{ await pushState(state); window.dispatchEvent(new CustomEvent("supabase-sync",{detail:{ok:true}})); }
      catch(err){ console.error("Supabase sync:",err); window.dispatchEvent(new CustomEvent("supabase-sync",{detail:{ok:false,error:err.message}})); }
    },700);
  }

  async function init(){
    if(initialized) return {configured:configured(),authenticated:isAuthenticated()};
    initialized=true;
    if(!configured()) return {configured:false,authenticated:false};
    session=readSession();
    if(session && session.expires_at && session.expires_at*1000<Date.now()+60000) await refresh();
    return {configured:true,authenticated:isAuthenticated()};
     
  }
window.SupabaseSync = SupabaseSync;
  return {configured,init,signUp,signIn,signOut,refresh,user,isAuthenticated,pullState,queueSave};
})();
