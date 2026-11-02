// نيبور كلاس v2.17.1 — اختبارات إعادة إنتاج: بنك الأسئلة والامتحانات، وثغرات v2.17.0 (الترقية، تبويبان على المحاضرة نفسها، الإغلاق فور الحفظ، استعادة نسخة قديمة).
// node review-qbank.e2e.js
const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const ROOT=__dirname;const TYPES={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.woff':'font/woff','.woff2':'font/woff2','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p==='/')p='/index.html';const f=path.join(ROOT,p);if(!f.startsWith(ROOT)||!fs.existsSync(f)){r.writeHead(404);return r.end()}r.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r)});
let pass=0,fail=0;const ok=(n,c,i)=>{if(c){pass++;console.log('PASS',n)}else{fail++;console.log('FAIL',n,i===undefined?'':JSON.stringify(i))}};
const CLOUD={rows:{}};
async function mockCloud(ctx){await ctx.route('https://sync.test/**',async route=>{const req=route.request(),u=new URL(req.url());
 if(req.method()==='POST'){JSON.parse(req.postData()).forEach(r=>{CLOUD.rows[r.id]=JSON.parse(JSON.stringify(r))});return route.fulfill({status:201,body:''})}
 const id=(u.searchParams.get('id')||'').replace(/^eq\./,'');const row=CLOUD.rows[id];const sel=u.searchParams.get('select')||'';
 const out=!row?[]:/ls:payload->lectureSync/.test(sel)?[{ls:row.payload.lectureSync||null}]:[{payload:JSON.parse(JSON.stringify(row.payload)),updated_at:row.updated_at}];
 return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(out)})})}
async function device(b,base){const ctx=await b.newContext({viewport:{width:1180,height:820}});await mockCloud(ctx);const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));p.on('dialog',d=>d.accept());await p.goto(base+'/index.html');await p.waitForTimeout(1400);if(await p.$('#swSkip'))await p.click('#swSkip');return p}
const goChapter=async p=>{await p.evaluate(()=>{document.getElementById('modal').innerHTML='';goToTab('lectures')});await p.waitForTimeout(400);await p.click('.openProject');await p.waitForTimeout(300);await p.click('.chapterOpen');await p.waitForTimeout(400)};
const setTitle=(p,t)=>p.evaluate(t=>{document.querySelector('.lectureInfoDetails').open=true;const e=document.getElementById('lecTitle');e.value=t;e.dispatchEvent(new Event('input'))},t);
const lecs=p=>p.evaluate(()=>window.MasarStorage.get('masar-education-v1-lectures',[]).map(l=>l.title));
async function newLecture(p,title){await goChapter(p);await p.click(await p.$('#emptyNewLecture')?'#emptyNewLecture':'#newLectureBtn');await p.waitForTimeout(250);if(await p.$('[data-ltpl]'))await p.click('[data-ltpl="sample"]');await p.waitForTimeout(700);await setTitle(p,title);await p.click('#saveLecture');await p.waitForTimeout(600);await p.evaluate(()=>{document.getElementById('modal').innerHTML='';goToTab('lectures')});await p.waitForTimeout(300)}
async function openLec(p,title){await goChapter(p);const id=await p.evaluate(t=>window.MasarStorage.get('masar-education-v1-lectures',[]).find(l=>l.title===t).id,title);await p.click('.openLecture[data-id="'+id+'"]');await p.waitForTimeout(800)}
const MATHQ='احسب قيمة <span class="mathInline" contenteditable="false" data-latex="\\frac{1}{2}+\\sqrt{x}">½+√x</span> عندما x=4';
(async()=>{await new Promise(r=>server.listen(0,r));const base='http://localhost:'+server.address().port;const b=await chromium.launch();
try{
 // ===== بنك الأسئلة والامتحان =====
 const p=await device(b,base);
 await p.evaluate(()=>{window.__printed=[];window.printHTML=(title,body)=>{window.__printed.push({title,body})}});
 await p.evaluate(()=>openQuestionBank(false));await p.waitForTimeout(300);await p.click('#qbAddNew');await p.waitForTimeout(400);
 await p.evaluate(h=>{const ed=document.querySelector('#qeTextHost [contenteditable="true"]');ed.innerHTML=h;ed.dispatchEvent(new Event('input',{bubbles:true}));document.getElementById('qeChapter').value='الفصل الأول';document.getElementById('qeTopic').value='الكسور';document.getElementById('qeMarks').value='5'},MATHQ);
 await p.click('#qeSave');await p.waitForTimeout(400);
 const row=await p.evaluate(()=>document.querySelector('#qbList [data-qbid] .bd b')?.textContent||'');
 ok('بنك الأسئلة: القائمة تعرض نص السؤال لا وسوم HTML',!!row&&!/<span|data-latex|class=/.test(row),row);
 ok('بنك الأسئلة: المعادلة محفوظة كما هي في السؤال',await p.evaluate(()=>S.qbank.some(q=>q.text.includes('data-latex="\\frac{1}{2}+\\sqrt{x}"'))));
 const hasSearch=await p.$('#qbSearch');ok('بنك الأسئلة: يوجد بحث نصي',!!hasSearch);
 if(hasSearch){await p.fill('#qbSearch','قيمة');await p.waitForTimeout(300);const n1=await p.evaluate(()=>[...document.querySelectorAll('#qbList [data-qbid]')].filter(r=>r.style.display!=='none').length);await p.fill('#qbSearch','غير موجود إطلاقًا');await p.waitForTimeout(300);const n2=await p.evaluate(()=>[...document.querySelectorAll('#qbList [data-qbid]')].filter(r=>r.style.display!=='none').length);ok('البحث يجد السؤال ويستبعد غير المطابق',n1===1&&n2===0,[n1,n2]);await p.fill('#qbSearch','')}
 await p.evaluate(()=>document.getElementById('modal').innerHTML='');
 // امتحان: سؤال بفرعين وحل نموذجي ← حفظ في البنك
 await p.evaluate(()=>{for(const k of Object.keys(localStorage))if(/examBuilderDraft/.test(k))localStorage.removeItem(k)});
 await p.evaluate(()=>openExamBuilder());await p.waitForTimeout(600);
 await p.evaluate(()=>{const q=document.querySelector('#ebQuestions [data-qid]')||document.querySelector('#ebQuestions');});
 const qid=await p.evaluate(()=>document.querySelector('[data-savebank]').dataset.savebank);
 await p.evaluate(()=>{const ed=document.querySelector('[data-qtexthost] [contenteditable="true"]');ed.innerHTML='جد ناتج ما يأتي:';ed.dispatchEvent(new Event('input',{bubbles:true}))});
 await p.evaluate(()=>document.querySelector('[data-addp]')?.click());await p.waitForTimeout(300);
 await p.evaluate(()=>{const ps=[...document.querySelectorAll('[data-ptexthost] [contenteditable="true"]')];ps[0].innerHTML='الفرع الأول $2+3$';ps[0].dispatchEvent(new Event('input',{bubbles:true}));if(ps[1]){ps[1].innerHTML='الفرع الثاني';ps[1].dispatchEvent(new Event('input',{bubbles:true}))}
   const ans=document.querySelector('[data-qanshost] [contenteditable="true"]');ans.innerHTML='الحل: 5';ans.dispatchEvent(new Event('input',{bubbles:true}));
   const mk=document.querySelector('[data-qmarks]');mk.value='10';mk.dispatchEvent(new Event('input',{bubbles:true}))});
 await p.waitForTimeout(1000);
 const examQ=await p.evaluate(()=>{const k=Object.keys(localStorage).find(k=>/examBuilderDraft/.test(k));return k?JSON.parse(localStorage.getItem(k)).data.questions[0]:null});
 await p.click('[data-savebank]');await p.waitForTimeout(400);await p.click('#qeSave');await p.waitForTimeout(500);
 const bq=await p.evaluate(()=>S.qbank.find(q=>/جد ناتج ما يأتي/.test(q.text)));
 ok('حفظ سؤال الامتحان في البنك يحتفظ بالفروع',!!bq&&(bq.parts||[]).filter(x=>x.text).length===2,{bank:bq&&bq.parts,exam:examQ&&examQ.parts});
 ok('حفظ سؤال الامتحان في البنك يحتفظ بالحل النموذجي',!!bq&&/الحل: 5/.test(bq.answer||''),bq&&bq.answer);
 const before=await p.evaluate(()=>S.qbank.length);
 await p.click('[data-savebank]');await p.waitForTimeout(400);await p.click('#qeSave');await p.waitForTimeout(500);
 ok('حفظ السؤال نفسه مرة ثانية لا يكرره في البنك',await p.evaluate(()=>S.qbank.length)===before,[before,await p.evaluate(()=>S.qbank.length)]);
 // إضافة من البنك مرتين
 await p.evaluate(()=>document.getElementById('ebFromBank').click());await p.waitForTimeout(400);
 await p.evaluate(()=>{document.querySelectorAll('[data-qbcheck]').forEach(c=>c.checked=true)});await p.click('#qbConfirm');await p.waitForTimeout(1000);
 const n1=await p.evaluate(()=>{const k=Object.keys(localStorage).find(k=>/examBuilderDraft/.test(k));return JSON.parse(localStorage.getItem(k)).data.questions.length});
 await p.evaluate(()=>document.getElementById('ebFromBank').click());await p.waitForTimeout(400);
 await p.evaluate(()=>{document.querySelectorAll('[data-qbcheck]').forEach(c=>c.checked=true)});await p.click('#qbConfirm');await p.waitForTimeout(1000);
 const draft=await p.evaluate(()=>{const k=Object.keys(localStorage).find(k=>/examBuilderDraft/.test(k));return JSON.parse(localStorage.getItem(k)).data});
 ok('إضافة الأسئلة نفسها من البنك مرتين لا تكررها في الامتحان',draft.questions.length===n1,[n1,draft.questions.length]);
 const fromBank=draft.questions.find(q=>/قيمة/.test(q.text));
 ok('السؤال المضاف من البنك نسخة مستقلة (تعديله لا يغيّر البنك)',!!fromBank&&await p.evaluate(id=>!S.qbank.some(q=>q.id===id),fromBank.id));
 // الطباعة: نسخة الطالب ونموذج الإجابة
 await p.evaluate(()=>window.__printed=[]);await p.evaluate(()=>document.getElementById('ebPrint').click());await p.waitForTimeout(600);
 await p.evaluate(()=>document.getElementById('ebPrintAnswers')?.click());await p.waitForTimeout(600);
 const pr=await p.evaluate(()=>window.__printed.map(x=>({t:x.title,math:/data-latex="\\frac\{1\}\{2\}\+\\sqrt\{x\}"/.test(x.body),parts:/الفرع الأول/.test(x.body),ans:/الحل: 5/.test(x.body)})));
 ok('ورقة الأسئلة: المعادلة والفروع موجودة، ولا حلول فيها',pr[0]&&pr[0].math&&pr[0].parts&&!pr[0].ans,pr);
 ok('نموذج الإجابة: يحوي الحلول',pr[1]&&pr[1].ans,pr);
 await p.evaluate(()=>document.getElementById('modal').innerHTML='');
 ok('لا أخطاء (البنك والامتحان)',p.errs.length===0,p.errs);
 await p.context().close();
 // ===== الترقية من v2.16 (سجل مزامنة بلا بصمات) =====
 const A=await device(b,base);await A.evaluate(()=>{S.settings.sync={url:'https://sync.test',key:'anon',code:'room-r'};saveKey('settings',S.settings)});
 await newLecture(A,'قبل الترقية');await A.waitForTimeout(3500);
 await A.evaluate(()=>{const m=window.MasarStorage.get('masar-education-v1-sync-meta',{});delete m.base;window.MasarStorage.set('masar-education-v1-sync-meta',m)});
 await openLec(A,'قبل الترقية');await setTitle(A,'عُدّلت بعد الترقية');await A.click('#saveLecture');await A.waitForTimeout(500);
 await A.evaluate(()=>{const m=window.MasarStorage.get('masar-education-v1-sync-meta',{});delete m.base;window.MasarStorage.set('masar-education-v1-sync-meta',m);document.getElementById('modal').innerHTML='';goToTab('lectures')});
 await A.evaluate(()=>syncPull(true));await A.waitForTimeout(600);
 const tA=await lecs(A);ok('الترقية من إصدار بلا بصمات: تعديل محلي عادي لا يُنتج نسخة متعارضة زائفة',tA.filter(t=>/عُدّلت بعد الترقية|قبل الترقية/.test(t)).length===1&&tA.includes('عُدّلت بعد الترقية'),tA);
 // ===== تبويبان على المحاضرة نفسها =====
 await newLecture(A,'محاضرة التبويبين');
 const A2=await A.context().newPage();A2.on('dialog',d=>d.accept());await A2.goto(base+'/index.html');await A2.waitForTimeout(1500);
 await openLec(A,'محاضرة التبويبين');await openLec(A2,'محاضرة التبويبين');
 await setTitle(A,'محاضرة التبويبين — من التبويب الأول');await A.click('#saveLecture');await A.waitForTimeout(600);
 await setTitle(A2,'محاضرة التبويبين — من التبويب الثاني');await A2.click('#saveLecture');await A2.waitForTimeout(600);
 const t2=await lecs(A2);ok('تبويبان يحرران المحاضرة نفسها: لا يضيع تعديل الأول',t2.some(t=>t.startsWith('محاضرة التبويبين — من التبويب الأول'))&&t2.some(t=>t.startsWith('محاضرة التبويبين — من التبويب الثاني')),t2);
 await A2.close();
 // ===== الإغلاق فور الحفظ =====
 await openLec(A,'عُدّلت بعد الترقية');await setTitle(A,'حُفظت ثم أُغلق التطبيق فورًا');await A.click('#saveLecture');
 const ctxA=A.context();await A.close({runBeforeUnload:false});
 const A3=await ctxA.newPage();A3.on('dialog',d=>d.accept());await A3.goto(base+'/index.html');await A3.waitForTimeout(1800);
 const rec=await A3.evaluate(()=>{const L=window.MasarStorage.get('masar-education-v1-lectures',[]).map(l=>l.title);const d=window.MasarStorage.get('masar-education-v1-lecture-draft',null);return {L,draft:d&&d.title}});
 ok('الإغلاق المفاجئ فور الضغط على «حفظ»: المحاضرة نفسها محفوظة (سجل الكتابة)',rec.L.includes('حُفظت ثم أُغلق التطبيق فورًا'),rec);
 ok('سجل الكتابة يُفرَّغ بعد اكتمال الحفظ',await A3.evaluate(async()=>{await window.MasarDB.whenFlushed();await new Promise(r=>setTimeout(r,300));return !Object.keys(localStorage).some(k=>k.startsWith('nbj:'))}));
 await ctxA.close();
 // ===== استعادة نسخة احتياطية قديمة بعد مزامنة بيانات أحدث =====
 {const D=await device(b,base);await D.evaluate(()=>{S.settings.sync={url:'https://sync.test',key:'anon',code:'room-restore'};saveKey('settings',S.settings)});
  await newLecture(D,'الإصدار الأول من المحاضرة');await D.waitForTimeout(3500);
  const oldBackup=await D.evaluate(()=>backupData());
  await openLec(D,'الإصدار الأول من المحاضرة');await setTitle(D,'الإصدار الأحدث من المحاضرة');await D.click('#saveLecture');await D.waitForTimeout(3800);
  await D.evaluate(()=>{document.getElementById('modal').innerHTML='';goToTab('settings')});
  await D.setInputFiles('#importFile',{name:'old.json',mimeType:'application/json',buffer:Buffer.from(oldBackup)});await D.waitForTimeout(2500);
  await D.evaluate(()=>syncPull(true));await D.waitForTimeout(800);await D.evaluate(()=>window.MasarDB.whenFlushed());
  const where=await D.evaluate(async()=>{const L=window.MasarStorage.get('masar-education-v1-lectures',[]).map(l=>l.title);const arch=(window.NiborLectureSync.conflicts()||[]).filter(c=>c.item).map(c=>c.item.title);const pre=JSON.stringify((await loadRaw('safety:preImport',null))||{});return {L,arch,inPre:pre.includes('الإصدار الأحدث من المحاضرة')}});
  const has=t=>where.L.some(x=>x.startsWith(t))||where.arch.some(x=>x.startsWith(t));
  ok('استعادة نسخة قديمة بعد مزامنة أحدث: الإصداران محفوظان (في القائمة أو الأرشيف) ولا يضيع شيء بصمت',has('الإصدار الأول من المحاضرة')&&(has('الإصدار الأحدث من المحاضرة')||where.inPre),where);
  ok('ونقطة استرجاع «قبل الاستيراد» تحوي الإصدار الأحدث',where.inPre,where);
  ok('لا أخطاء (الاستعادة)',D.errs.length===0,D.errs);await D.context().close()}
}finally{await b.close();server.close()}
console.log('\nv2.17.1 review & qbank: '+pass+' PASS, '+fail+' FAIL');process.exit(fail?1:0)})();
