/* =========================================================
   نيبور كلاس v2.9.0 — طبقة التخزين الدائم (IndexedDB)
   ---------------------------------------------------------
   • كل بيانات التطبيق (الطلبة، الدرجات، الحضور… والمحاضرات والمشاريع)
     تُحفظ في IndexedDB بدل localStorage (سعة أكبر بكثير من ~5MB).
   • ذاكرة مؤقتة في الذاكرة تجعل القراءة متزامنة، فلا يتغير أي كود قديم.
   • ترحيل آمن مرة واحدة: نسخ → تحقق → لقطة احتياطية → ثم تحرير localStorage.
   • لقطات احتياطية تلقائية يومية داخل الجهاز (آخر 7 أيام) مع استعادة وتنزيل.
   • إذا تعذّر IndexedDB يعمل كما كان على localStorage.
   ========================================================= */
(function(global){
"use strict";
const DB_NAME="niborClassDB",DB_VER=1,KV="kv",SNAP="snapshots",META="meta";
const MANAGED=/^(sdb:|masar-education-)/;          // المفاتيح التي تديرها الطبقة
const KEEP_SNAPSHOTS=7;
const cache=new Map();                               // key → JSON string
const pending=new Map();                             // key → string | null (حذف)
let db=null,mode="memory",flushTimer=null,lastError=null,persisted=null,migratedInfo=null;
// v2.17.0: كتابات تصل قبل فتح IndexedDB كانت تبقى في الذاكرة فقط ثم يمحوها التحميل من القاعدة — تُحفظ هنا وتُطبَّق بعد الفتح
let booting=true;const early=new Map();
let retryTimer=null,retryDelay=500,inflight=0;const flushWaiters=[];
// v2.17.1: سجل كتابة متزامن في localStorage — يبقى حتى لو أُغلق التطبيق فجأة قبل اكتمال معاملة IndexedDB (المعيار يُلغيها عند الإغلاق)،
// ويُحذف بعد تأكيد الكتابة، ويُعاد تطبيقه عند الفتح التالي إن بقي.
const JPFX="nbj:",JDEL="\u0000DEL",JMAX=1500000;
function jPut(k,v){try{if(v===null)localStorage.setItem(JPFX+k,JDEL);else if(v.length<=JMAX)localStorage.setItem(JPFX+k,v)}catch(_){}}
function jClear(k,v){try{const cur=localStorage.getItem(JPFX+k);if(cur!==null&&(cur===v||(v===null&&cur===JDEL)))localStorage.removeItem(JPFX+k)}catch(_){}}
function jReplay(){let n=0;try{const ks=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(JPFX))ks.push(k)}
  ks.forEach(jk=>{const k=jk.slice(JPFX.length);if(!MANAGED.test(k)){localStorage.removeItem(jk);return}const v=localStorage.getItem(jk);if(v===JDEL){cache.delete(k);pending.set(k,null)}else{cache.set(k,v);pending.set(k,v)}n++})}catch(_){}return n}
const listeners={error:[],saved:[]};
// تزامن بين التبويبات: كل تبويب يحمل نسخة في الذاكرة، فنبث التغييرات حتى لا يكتب تبويب قديم فوق الجديد
let bc=null;try{bc=new BroadcastChannel("nibor-class-db");bc.onmessage=e=>{const m=e.data||{};if(!m.k||!MANAGED.test(m.k))return;if(m.v===null)cache.delete(m.k);else cache.set(m.k,m.v);try{global.dispatchEvent(new CustomEvent("masar:storage-remote",{detail:{key:m.k}}))}catch(_){}}}catch(_){bc=null}
function broadcast(k,v){if(bc)try{bc.postMessage({k,v})}catch(_){}}
function emit(type,detail){(listeners[type]||[]).forEach(fn=>{try{fn(detail)}catch(_){}});try{global.dispatchEvent(new CustomEvent("masar:storage-"+type,{detail}))}catch(_){}}

function lsAvailable(){try{localStorage.setItem("__nb","1");localStorage.removeItem("__nb");return true}catch(_){return false}}
function lsKeys(){const out=[];try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&MANAGED.test(k))out.push(k)}}catch(_){}return out}

function openDB(){return new Promise((resolve,reject)=>{
  if(!global.indexedDB)return reject(new Error("NO_IDB"));
  let req;try{req=indexedDB.open(DB_NAME,DB_VER)}catch(e){return reject(e)}
  req.onupgradeneeded=()=>{const d=req.result;
    if(!d.objectStoreNames.contains(KV))d.createObjectStore(KV);
    if(!d.objectStoreNames.contains(SNAP))d.createObjectStore(SNAP,{keyPath:"id",autoIncrement:true});
    if(!d.objectStoreNames.contains(META))d.createObjectStore(META)};
  req.onsuccess=()=>{const d=req.result;d.onversionchange=()=>{try{d.close()}catch(_){}};resolve(d)};
  req.onerror=()=>reject(req.error||new Error("IDB_OPEN_FAILED"));
  req.onblocked=()=>reject(new Error("IDB_BLOCKED"));
  setTimeout(()=>reject(new Error("IDB_TIMEOUT")),6000);
})}
function tx(stores,modeRW,fn){return new Promise((resolve,reject)=>{let t;try{t=db.transaction(stores,modeRW)}catch(e){return reject(e)}
  let result;t.oncomplete=()=>resolve(result);t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error||new Error("TX_ABORTED"));
  try{result=fn(t)}catch(e){try{t.abort()}catch(_){}reject(e)}})}
function reqP(r){return new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}

async function loadAllKV(){const out=new Map();await tx([KV],"readonly",t=>{const st=t.objectStore(KV);const cur=st.openCursor();cur.onsuccess=()=>{const c=cur.result;if(c){out.set(String(c.key),c.value);c.continue()}}});return out}
async function metaGetP(k){let v;await tx([META],"readonly",t=>{const r=t.objectStore(META).get(k);r.onsuccess=()=>{v=r.result}});return v}
async function metaSet(k,v){return tx([META],"readwrite",t=>{t.objectStore(META).put(v,k)})}

/* ---------- الترحيل من localStorage (مرة واحدة، بلا فقدان) ---------- */
async function migrateFromLocalStorage(){
  const done=await metaGetP("migratedFromLocalStorage");
  if(done){migratedInfo=done;return}
  const keys=lsKeys();
  const copy={};keys.forEach(k=>{const v=localStorage.getItem(k);if(v!==null&&!cache.has(k))copy[k]=v});
  const n=Object.keys(copy).length;
  if(n){
    // 1) لقطة احتياطية كاملة قبل أي تغيير
    const before={};cache.forEach((v,k)=>{before[k]=v});Object.assign(before,copy);
    await tx([SNAP],"readwrite",t=>{t.objectStore(SNAP).add({at:new Date().toISOString(),reason:"قبل الترحيل إلى IndexedDB",kv:before,size:JSON.stringify(before).length})});
    // 2) نسخ إلى IndexedDB
    await tx([KV],"readwrite",t=>{const st=t.objectStore(KV);Object.entries(copy).forEach(([k,v])=>st.put(v,k))});
    // 3) تحقق: إعادة القراءة ومطابقة كل مفتاح
    const check=await loadAllKV();
    const bad=Object.keys(copy).filter(k=>check.get(k)!==copy[k]);
    if(bad.length)throw new Error("MIGRATION_VERIFY_FAILED:"+bad.length);
    Object.entries(copy).forEach(([k,v])=>cache.set(k,v));
  }
  // 4) تحرير localStorage فقط بعد نجاح التحقق
  keys.forEach(k=>{try{localStorage.removeItem(k)}catch(_){}});
  migratedInfo={at:new Date().toISOString(),keys:n};
  await metaSet("migratedFromLocalStorage",migratedInfo);
}

/* ---------- الكتابة: دفعات صغيرة في معاملة واحدة ---------- */
// v2.17.1: الكتابة تبدأ في المهمة نفسها (microtask) لا في مهمة لاحقة — فإغلاق التطبيق فور الحفظ لا يسبق بدء المعاملة
function scheduleFlush(){if(flushTimer)return;emit("pending",{count:pending.size});flushTimer=true;const run=()=>{flushTimer=null;flush()};if(typeof queueMicrotask==="function")queueMicrotask(run);else Promise.resolve().then(run)}
function settleWaiters(){if(pending.size||inflight)return;while(flushWaiters.length)try{flushWaiters.shift()(true)}catch(_){}}
async function flush(){
  if(mode!=="idb"||!pending.size){settleWaiters();return true}
  const batch=new Map(pending);pending.clear();inflight++;
  try{
    // «تم الحفظ» لا يُعلن إلا بعد oncomplete للمعاملة، أي بعد الكتابة الدائمة فعلًا
    await tx([KV],"readwrite",t=>{const st=t.objectStore(KV);batch.forEach((v,k)=>{if(v===null)st.delete(k);else st.put(v,k)})});
    inflight--;
    if(lastError){lastError=null}
    retryDelay=500;
    batch.forEach((v,k)=>jClear(k,v));
    emit("saved",{keys:[...batch.keys()],pending:pending.size});
    if(pending.size)scheduleFlush();else settleWaiters();
    return true;
  }catch(err){
    inflight--;
    // أعد الدفعة للانتظار حتى لا تضيع، وأبلغ الواجهة، وأعد المحاولة تلقائيًا بمهلة متزايدة
    batch.forEach((v,k)=>{if(!pending.has(k))pending.set(k,v)});
    lastError=err;emit("error",err);
    clearTimeout(retryTimer);retryTimer=setTimeout(()=>{retryTimer=null;flush()},retryDelay);retryDelay=Math.min(retryDelay*2,30000);
    return false;
  }
}

/* ---------- واجهة متزامنة فوق الذاكرة ---------- */
const api={
  ready:null,
  get mode(){return mode},
  get lastError(){return lastError},
  get persisted(){return persisted},
  get migration(){return migratedInfo},
  managed:k=>MANAGED.test(k),
  getItem(k){if(mode==="local"){try{return localStorage.getItem(k)}catch(_){return null}}return cache.has(k)?cache.get(k):null},
  setItem(k,v){v=String(v);
    if(mode==="local"){localStorage.setItem(k,v);return}               // يرمي عند الامتلاء كما كان
    cache.set(k,v);if(mode==="idb"){jPut(k,v);pending.set(k,v);scheduleFlush();broadcast(k,v)}else if(booting)early.set(k,v)},
  removeItem(k){if(mode==="local"){try{localStorage.removeItem(k)}catch(_){}return}cache.delete(k);if(mode==="idb"){jPut(k,null);pending.set(k,null);scheduleFlush();broadcast(k,null)}else if(booting)early.set(k,null)},
  get pendingCount(){return pending.size+inflight},
  // يحل حين تُكتب كل التغييرات المعلقة كتابة دائمة (أو فورًا إن لم يكن هناك ما يُكتب)
  whenFlushed(){if(mode!=="idb")return Promise.resolve(true);if(!pending.size&&!inflight)return Promise.resolve(true);return new Promise(r=>{flushWaiters.push(r);scheduleFlush()})},
  keys(prefix){if(mode==="local"){const o=[];try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&(!prefix||k.startsWith(prefix)))o.push(k)}}catch(_){}return o.sort()}
    return [...cache.keys()].filter(k=>!prefix||k.startsWith(prefix)).sort()},
  flush,
  on(type,fn){(listeners[type]=listeners[type]||[]).push(fn)},
  /* ----- اللقطات الاحتياطية ----- */
  async snapshot(reason){if(mode!=="idb")return null;await flush();const kv={};cache.forEach((v,k)=>{kv[k]=v});const rec={at:new Date().toISOString(),reason:reason||"لقطة تلقائية",kv,size:JSON.stringify(kv).length};
    let id;await tx([SNAP],"readwrite",t=>{const r=t.objectStore(SNAP).add(rec);r.onsuccess=()=>{id=r.result}});await api.pruneSnapshots();return id},
  async listSnapshots(){if(mode!=="idb")return [];const out=[];await tx([SNAP],"readonly",t=>{const c=t.objectStore(SNAP).openCursor();c.onsuccess=()=>{const x=c.result;if(x){const v=x.value;out.push({id:v.id,at:v.at,reason:v.reason,size:v.size,keys:Object.keys(v.kv||{}).length});x.continue()}}});return out.sort((a,b)=>b.id-a.id)},
  async getSnapshot(id){let v;await tx([SNAP],"readonly",t=>{const r=t.objectStore(SNAP).get(Number(id));r.onsuccess=()=>{v=r.result}});return v},
  async pruneSnapshots(){const all=await api.listSnapshots();const auto=all.filter(s=>!/قبل/.test(s.reason||""));const keepPre=all.filter(s=>/قبل/.test(s.reason||"")).slice(0,3);const keep=new Set([...auto.slice(0,KEEP_SNAPSHOTS),...keepPre].map(s=>s.id));const drop=all.filter(s=>!keep.has(s.id));if(drop.length)await tx([SNAP],"readwrite",t=>{const st=t.objectStore(SNAP);drop.forEach(s=>st.delete(s.id))});return drop.length},
  async restoreSnapshot(id){const s=await api.getSnapshot(id);if(!s||!s.kv)throw new Error("SNAPSHOT_NOT_FOUND");await api.snapshot("قبل الاستعادة");
    const keys=new Set([...cache.keys()].filter(k=>MANAGED.test(k)));Object.keys(s.kv).forEach(k=>keys.delete(k));
    await tx([KV],"readwrite",t=>{const st=t.objectStore(KV);keys.forEach(k=>st.delete(k));Object.entries(s.kv).forEach(([k,v])=>st.put(v,k))});
    keys.forEach(k=>cache.delete(k));Object.entries(s.kv).forEach(([k,v])=>cache.set(k,v));pending.clear();return true},
  async dailySnapshot(){if(mode!=="idb")return null;const today=new Date().toISOString().slice(0,10);const last=await metaGetP("lastAutoSnapshot");if(last===today)return null;
    const hasData=[...cache.keys()].some(k=>MANAGED.test(k));if(!hasData)return null;const id=await api.snapshot("لقطة يومية تلقائية");await metaSet("lastAutoSnapshot",today);return id},
  /* ----- نسخة كاملة (ملف): كل البيانات والمحاضرات ----- */
  exportAll(){const kv={};const ks=mode==="local"?api.keys():[...cache.keys()];ks.filter(k=>MANAGED.test(k)).forEach(k=>{const v=api.getItem(k);if(v!==null)kv[k]=v});
    return {schema:"nibor-class-full-backup",schemaVersion:1,appVersion:(document.querySelector('meta[name="application-version"]')||{}).content||"",exportedAt:new Date().toISOString(),kv}},
  async importAll(payload){if(!payload||payload.schema!=="nibor-class-full-backup"||!payload.kv||typeof payload.kv!=="object")throw new Error("ليس ملف نسخة كاملة من نيبور كلاس");
    const bad=Object.keys(payload.kv).filter(k=>!MANAGED.test(k)||typeof payload.kv[k]!=="string");if(bad.length)throw new Error("الملف يحتوي مفاتيح غير مسموحة");
    if(mode==="idb"){await api.snapshot("قبل استيراد نسخة كاملة");const old=[...cache.keys()].filter(k=>MANAGED.test(k));
      await tx([KV],"readwrite",t=>{const st=t.objectStore(KV);old.forEach(k=>st.delete(k));Object.entries(payload.kv).forEach(([k,v])=>st.put(v,k))});
      old.forEach(k=>cache.delete(k));Object.entries(payload.kv).forEach(([k,v])=>cache.set(k,v));pending.clear()}
    else{api.keys().filter(k=>MANAGED.test(k)).forEach(k=>localStorage.removeItem(k));Object.entries(payload.kv).forEach(([k,v])=>localStorage.setItem(k,v))}
    return Object.keys(payload.kv).length},
  async estimate(){try{if(navigator.storage&&navigator.storage.estimate){const e=await navigator.storage.estimate();return {usage:e.usage||0,quota:e.quota||0}}}catch(_){}return null},
  async requestPersist(){try{if(navigator.storage&&navigator.storage.persist){persisted=await navigator.storage.persisted();if(!persisted)persisted=await navigator.storage.persist();return persisted}}catch(_){}persisted=null;return null}
};

api.ready=(async()=>{
  try{
    db=await openDB();
    const all=await loadAllKV();all.forEach((v,k)=>cache.set(k,v));
    mode="idb";booting=false;
    // ما كُتب أثناء الفتح يغلب ما في القاعدة (لأنه أحدث)، ثم يُحفظ
    // كتابات لم تكتمل في الجلسة السابقة (إغلاق مفاجئ) تُستعاد من السجل أولًا
    if(jReplay())scheduleFlush();
    if(early.size){early.forEach((v,k)=>{if(v===null){cache.delete(k);pending.set(k,null)}else{cache.set(k,v);pending.set(k,v);jPut(k,v)}});early.clear();scheduleFlush()}
    try{await migrateFromLocalStorage()}catch(err){
      // فشل الترحيل: لا نحذف شيئًا من localStorage، ونقرأ منه ما لم يُنسخ
      console.error("ترحيل التخزين لم يكتمل — البيانات باقية في localStorage",err);
      lsKeys().forEach(k=>{if(!cache.has(k)){const v=localStorage.getItem(k);if(v!==null){cache.set(k,v);pending.set(k,v)}}});scheduleFlush();
    }
    api.requestPersist();
    setTimeout(()=>{api.dailySnapshot().catch(e=>console.warn("لقطة يومية",e))},4000);
  }catch(err){
    console.warn("IndexedDB غير متاح — العمل على localStorage كما في الإصدارات السابقة",err);
    db=null;mode=lsAvailable()?"local":"memory";booting=false;
    // الكتابات المبكرة تنتقل إلى localStorage حتى لا تضيع
    if(mode==="local")early.forEach((v,k)=>{try{if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v)}catch(_){}});early.clear();
  }
  return mode;
})();

// حفظ ما تبقّى عند إخفاء الصفحة أو إغلاقها
const bye=()=>{if(pending.size)flush()};
try{document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")bye()});global.addEventListener("pagehide",bye)}catch(_){}

global.MasarDB=api;
})(window);
