// نيبور كلاس v2.17.0 — حماية البيانات (P0): الكتابة الدائمة ومؤشر الحفظ، التبويبان، وتعارضات المزامنة بين جهازين.
// node data-safety-sync.e2e.js     (Playwright + Chromium)
const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const ROOT=__dirname;const TYPES={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.woff':'font/woff','.woff2':'font/woff2','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p==='/')p='/index.html';const f=path.join(ROOT,p);if(!f.startsWith(ROOT)||!fs.existsSync(f)){r.writeHead(404);return r.end()}r.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r)});
let pass=0,fail=0;const ok=(n,c,i)=>{if(c){pass++;console.log('PASS',n)}else{fail++;console.log('FAIL',n,i===undefined?'':JSON.stringify(i))}};
const CLOUD={rows:{},offline:new Set()};
async function mockCloud(ctx,name){await ctx.route('https://sync.test/**',async route=>{if(CLOUD.offline.has(name))return route.abort('internetdisconnected');const req=route.request(),u=new URL(req.url());
 if(req.method()==='POST'){JSON.parse(req.postData()).forEach(r=>{CLOUD.rows[r.id]=JSON.parse(JSON.stringify(r))});return route.fulfill({status:201,body:''})}
 const id=(u.searchParams.get('id')||'').replace(/^eq\./,'');const row=CLOUD.rows[id];const sel=u.searchParams.get('select')||'';
 const out=!row?[]:/ls:payload->lectureSync/.test(sel)?[{ls:row.payload.lectureSync||null}]:[{payload:JSON.parse(JSON.stringify(row.payload)),updated_at:row.updated_at}];
 return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(out)})})}
async function device(b,base,name,opts={}){const ctx=await b.newContext({viewport:{width:1180,height:820}});await mockCloud(ctx,name);
 if(opts.clockOffset)await ctx.addInitScript(off=>{const _D=Date;class D extends _D{constructor(...a){if(a.length)super(...a);else super(_D.now()+off)}static now(){return _D.now()+off}}window.Date=D},opts.clockOffset);
 const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));p.on('dialog',d=>d.accept());
 await p.goto(base+'/index.html');await p.waitForTimeout(1400);if(await p.$('#swSkip'))await p.click('#swSkip');p.name=name;return p}
const enableSync=p=>p.evaluate(()=>{S.settings.sync={url:'https://sync.test',key:'anon',code:'room-p0'};saveKey('settings',S.settings)});
const goChapter=async p=>{await p.evaluate(()=>{document.getElementById('modal').innerHTML='';goToTab('lectures')});await p.waitForTimeout(400);await p.click('.openProject');await p.waitForTimeout(300);await p.click('.chapterOpen');await p.waitForTimeout(400)};
const lecs=p=>p.evaluate(()=>window.MasarStorage.get('masar-education-v1-lectures',[]).map(l=>({id:l.id,title:l.title,body:JSON.stringify(l.blocks||[])})));
async function newLecture(p,title){await goChapter(p);await p.click(await p.$('#emptyNewLecture')?'#emptyNewLecture':'#newLectureBtn');await p.waitForTimeout(700);await setTitle(p,title);await p.click('#saveLecture');await p.waitForTimeout(600);await p.evaluate(()=>{document.getElementById('modal').innerHTML='';goToTab('lectures')});await p.waitForTimeout(300)}
async function setTitle(p,t){await p.evaluate(t=>{document.querySelector('.lectureInfoDetails').open=true;const e=document.getElementById('lecTitle');e.value=t;e.dispatchEvent(new Event('input'))},t)}
async function openLecture(p,title){await goChapter(p);const id=await p.evaluate(t=>window.MasarStorage.get('masar-education-v1-lectures',[]).find(l=>l.title===t).id,title);await p.click('.openLecture[data-id="'+id+'"]');await p.waitForTimeout(800);return id}
async function editAndSave(p,title,newTitle){await openLecture(p,title);await setTitle(p,newTitle);await p.click('#saveLecture');await p.waitForTimeout(600);await p.evaluate(()=>{document.getElementById('modal').innerHTML='';goToTab('lectures')});await p.waitForTimeout(300)}
const pull=p=>p.evaluate(()=>syncPull(true)).then(()=>p.waitForTimeout(500));
const push=p=>p.evaluate(()=>syncPush()).then(()=>p.waitForTimeout(300));
(async()=>{await new Promise(r=>server.listen(0,r));const base='http://localhost:'+server.address().port;const b=await chromium.launch();
try{
 // ===== 1) التخزين المحلي =====
 {const ctx=await b.newContext();
  await ctx.addInitScript(()=>{if(sessionStorage.getItem('early-done'))return;sessionStorage.setItem('early-done','1');let m;Object.defineProperty(window,'MasarDB',{configurable:true,get(){return m},set(v){m=v;try{v.setItem('masar-education-v1-early-test',JSON.stringify('كُتب قبل فتح القاعدة'))}catch(e){}}})});
  const p=await ctx.newPage();p.on('dialog',d=>d.accept());await p.goto(base+'/index.html');await p.waitForTimeout(1500);
  await p.evaluate(()=>window.MasarDB.whenFlushed());await p.reload();await p.waitForTimeout(1500);
  ok('كتابة تمت قبل اكتمال فتح IndexedDB لا تضيع بعد إعادة التحميل',await p.evaluate(()=>window.MasarDB.getItem('masar-education-v1-early-test'))==='"كُتب قبل فتح القاعدة"');
  await ctx.close()}
 {const p=await device(b,base,'S1');
  await goChapter(p);await p.click(await p.$('#emptyNewLecture')?'#emptyNewLecture':'#newLectureBtn');await p.waitForTimeout(700);await setTitle(p,'اختبار الحفظ الدائم');
  // كل كتابة تفشل مؤقتًا (امتلاء المساحة)
  await p.evaluate(()=>{const put=IDBObjectStore.prototype.put;window.__failPut=true;IDBObjectStore.prototype.put=function(...a){if(window.__failPut){const e=new DOMException('full','QuotaExceededError');throw e}return put.apply(this,a)}});
  await p.click('#saveLecture');await p.waitForTimeout(700);
  const st1=await p.evaluate(()=>({lec:document.getElementById('lectureSaveState').textContent,hdr:document.getElementById('saveState')?.className||'',txt:document.getElementById('saveState')?.textContent||''}));
  ok('فشل الكتابة: لا رسالة «محفوظة»، بل تحذير في المحرر و«فشل الحفظ» في الشريط العلوي',/فشل الحفظ|لم تُحفظ/.test(st1.lec)&&!/محفوظة ✓$/.test(st1.lec)&&/bad/.test(st1.hdr)&&/المساحة ممتلئة/.test(st1.txt),st1);
  await p.evaluate(()=>{window.__failPut=false});await p.waitForTimeout(2500);
  const st2=await p.evaluate(()=>({lec:document.getElementById('lectureSaveState').textContent,hdr:document.getElementById('saveState')?.textContent||'',pending:window.MasarDB.pendingCount}));
  ok('بعد زوال السبب: إعادة محاولة تلقائية ثم «تم الحفظ»',/محفوظة ✓/.test(st2.lec)&&/تم الحفظ/.test(st2.hdr)&&st2.pending===0,st2);
  await p.reload();await p.waitForTimeout(1500);
  ok('المحاضرة محفوظة فعلًا بعد إعادة التحميل',(await lecs(p)).some(l=>l.title==='اختبار الحفظ الدائم'));
  // تبويبان
  const p2=await p.context().newPage();p2.on('dialog',d=>d.accept());await p2.goto(base+'/index.html');await p2.waitForTimeout(1500);
  await p.evaluate(()=>{S.students.push({id:'tabA',name:'طالب من التبويب الأول',grade:'السادس إعدادي',section:'أ',gender:'ذكر',status:'مستمر'});save.students()});await p.waitForTimeout(600);
  ok('التبويب الثاني يرى الطالب المضاف في الأول دون إعادة تحميل',await p2.evaluate(()=>S.students.some(s=>s.id==='tabA')));
  await p2.evaluate(()=>{S.students.push({id:'tabB',name:'طالب من التبويب الثاني',grade:'السادس إعدادي',section:'أ',gender:'أنثى',status:'مستمر'});save.students()});await p2.waitForTimeout(600);
  await p.evaluate(()=>window.MasarDB.whenFlushed());await p.reload();await p.waitForTimeout(1500);
  ok('حفظ التبويب الثاني لا يمحو ما أضافه الأول',await p.evaluate(()=>['tabA','tabB'].every(id=>S.students.some(s=>s.id===id))));
  ok('لا أخطاء (التخزين)',p.errs.length===0,p.errs);await p.context().close()}
 // ===== 2) المزامنة =====
 const A=await device(b,base,'A'),B=await device(b,base,'B',{clockOffset:-86400000}); // ساعة الجهاز B متأخرة يومًا كاملًا
 await enableSync(A);await enableSync(B);
 await newLecture(A,'الدالة الأسية');await A.waitForTimeout(3500);await pull(B);
 ok('نقطة البداية: المحاضرة على الجهازين',(await lecs(B)).some(l=>l.title==='الدالة الأسية'));
 // (أ) ساعة متأخرة: B يعدّل وحده — يجب أن يفوز تعديله رغم أن توقيته «أقدم»
 await editAndSave(B,'الدالة الأسية','الدالة الأسية — تعديل B');await B.waitForTimeout(3500);await pull(A);
 let la=await lecs(A);ok('ساعة جهاز متأخرة يومًا: تعديله يصل ولا يُتجاهل',la.some(l=>l.title==='الدالة الأسية — تعديل B')&&!la.some(l=>l.title==='الدالة الأسية'),la.map(l=>l.title));
 // (ب) تعديل متزامن للمحاضرة نفسها دون اتصال على الجهازين
 CLOUD.offline.add('A');CLOUD.offline.add('B');
 await editAndSave(A,'الدالة الأسية — تعديل B','نسخة A');await editAndSave(B,'الدالة الأسية — تعديل B','نسخة B');
 await A.waitForTimeout(3000);CLOUD.offline.delete('A');await push(A);
 CLOUD.offline.delete('B');await pull(B);await B.waitForTimeout(3500);await pull(A);
 const ta=(await lecs(A)).map(l=>l.title),tb=(await lecs(B)).map(l=>l.title);
 ok('تعارض: لا يضيع أي تعديل — النسختان موجودتان على الجهازين',['نسخة A','نسخة B'].every(t=>ta.some(x=>x.startsWith(t)))&&['نسخة A','نسخة B'].every(t=>tb.some(x=>x.startsWith(t))),{ta,tb});
 await B.evaluate(()=>goToTab('lectures'));await B.waitForTimeout(400);
 ok('تعارض: إشعار واضح في صفحة المحاضرات مع زر فتح النسختين',await B.evaluate(()=>!!document.querySelector('.syncConflicts')&&document.querySelectorAll('.syncConflicts [data-conf-open]').length>=2));
 await B.click('#confDone');await B.waitForTimeout(300);ok('«فهمت» يخفي الإشعار',!(await B.$('.syncConflicts')));
 // (ج) محاضرة مفتوحة في المحرر لا تُستبدل من الخلفية
 await newLecture(A,'التكامل');await A.waitForTimeout(3500);await pull(B);
 await openLecture(A,'التكامل');await A.evaluate(()=>{const rc=document.querySelector('.blockEditor .richContent');if(rc){rc.focus()}});
 await editAndSave(B,'التكامل','التكامل — من B');await B.waitForTimeout(3500);
 await pull(A);
 const openState=await A.evaluate(()=>({ed:!!document.querySelector('.lectureEditor'),title:document.getElementById('lecTitle').value}));
 ok('مزامنة أثناء التحرير: المحرر باقٍ والمحتوى المفتوح لم يُستبدل',openState.ed&&openState.title==='التكامل',openState);
 await setTitle(A,'التكامل — من A');await A.click('#saveLecture');await A.waitForTimeout(3800);await pull(B);
 const tb2=(await lecs(B)).map(l=>l.title);ok('بعد الحفظ: تعديل A وتعديل B كلاهما محفوظ',tb2.some(t=>t.startsWith('التكامل — من A'))&&tb2.some(t=>t.startsWith('التكامل — من B')),tb2);
 await A.evaluate(()=>{document.getElementById('modal').innerHTML='';goToTab('lectures')});await A.waitForTimeout(400);
 // (د) حذف دون اتصال مقابل تعديل على جهاز آخر
 await newLecture(A,'المتتاليات');await A.waitForTimeout(3500);await pull(B);
 CLOUD.offline.add('A');await goChapter(A);const idS=await A.evaluate(()=>window.MasarStorage.get('masar-education-v1-lectures',[]).find(l=>l.title==='المتتاليات').id);await A.click('[data-del="'+idS+'"]');await A.waitForTimeout(600);
 await editAndSave(B,'المتتاليات','المتتاليات — عُدّلت');await B.waitForTimeout(3500);
 CLOUD.offline.delete('A');await pull(A);
 ok('حُذفت دون اتصال على جهاز وعُدّلت على آخر: تُستبقى ولا تضيع',(await lecs(A)).some(l=>l.title==='المتتاليات — عُدّلت'));
 // (هـ) حذف عادي غير متعارض ما زال يعمل، ولا يعود
 await newLecture(A,'للحذف');await A.waitForTimeout(3500);await pull(B);
 await goChapter(A);const idD=await A.evaluate(()=>window.MasarStorage.get('masar-education-v1-lectures',[]).find(l=>l.title==='للحذف').id);await A.click('[data-del="'+idD+'"]');await A.waitForTimeout(3500);
 await pull(B);ok('حذف غير متعارض يصل إلى الجهاز الآخر',!(await lecs(B)).some(l=>l.title==='للحذف'));
 await B.evaluate(()=>scheduleSync());await B.waitForTimeout(3500);await pull(A);ok('ولا يعود بعد رفع الجهاز الآخر',!(await lecs(A)).some(l=>l.title==='للحذف'));
 // (و) انقطاع طويل ثم عودة
 CLOUD.offline.add('B');await newLecture(B,'كُتبت دون اتصال');await B.waitForTimeout(3000);
 ok('الرفع دون اتصال يفشل بلا أخطاء',await B.evaluate(()=>!!S.settings.syncDirtyAt));
 CLOUD.offline.delete('B');await push(B);await pull(A);ok('بعد عودة الاتصال: تصل المحاضرة',(await lecs(A)).some(l=>l.title==='كُتبت دون اتصال'));
 ok('لا أخطاء (المزامنة)',A.errs.length===0&&B.errs.length===0,[A.errs,B.errs]);
}finally{await b.close();server.close()}
console.log('\nv2.17.0 data safety & sync: '+pass+' PASS, '+fail+' FAIL');process.exit(fail?1:0)})();
