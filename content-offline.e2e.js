// نيبور كلاس v2.17.0 — (P1) دقة المعادلات بعد الحفظ وإعادة الفتح، عدم قص المعادلات في الصفحة، مسودة الامتحان، العمل دون اتصال والتحديث.
// node content-offline.e2e.js
const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const ROOT=__dirname;const TYPES={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.woff':'font/woff','.woff2':'font/woff2','.json':'application/json','.webmanifest':'application/manifest+json'};
let swVariant=0;
const server=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p==='/')p='/index.html';const f=path.join(ROOT,p);if(!f.startsWith(ROOT)||!fs.existsSync(f)){r.writeHead(404);return r.end()}
 if(p==='/sw.js'&&swVariant){r.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'});return r.end(fs.readFileSync(f,'utf8').replace(/const CACHE = "([^"]+)"/,'const CACHE = "$1-next"'))}
 r.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r)});
let pass=0,fail=0;const ok=(n,c,i)=>{if(c){pass++;console.log('PASS',n)}else{fail++;console.log('FAIL',n,i===undefined?'':JSON.stringify(i))}};
const EQS=['\\frac{a+b}{c-d}','\\sqrt[3]{x^2+1}','e^{2x}\\ln x','\\log_{2}(x+1)','\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}','\\begin{vmatrix}a&b\\\\c&d\\end{vmatrix}','\\begin{cases}x+y=3\\\\x-y=1\\end{cases}','\\alpha+\\beta=\\gamma\\pi','\\begin{aligned}f(x)&=x^2+2x+1\\\\&=(x+1)^2\\end{aligned}','\\frac{x^2}{a^2}+\\frac{y^2}{b^2}=1','\\lim_{x\\to0}\\frac{\\sin x}{x}=1','\\int_0^1 x^2\\,dx=\\frac13','\\sum_{n=1}^{\\infty}\\frac{1}{n^2}=\\frac{\\pi^2}{6}'];
const LONG='f(x)='+Array.from({length:28},(_,i)=>(i+1)+'x^{'+(i+1)+'}').join('+');
const goChapter=async p=>{await p.evaluate(()=>{document.getElementById('modal').innerHTML='';goToTab('lectures')});await p.waitForTimeout(400);await p.click('.openProject');await p.waitForTimeout(300);await p.click('.chapterOpen');await p.waitForTimeout(400)};
(async()=>{await new Promise(r=>server.listen(0,r));const base='http://localhost:'+server.address().port;const b=await chromium.launch();
try{
 const ctx=await b.newContext({viewport:{width:1180,height:820}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 await p.goto(base+'/index.html');await p.waitForTimeout(1400);if(await p.$('#swSkip'))await p.click('#swSkip');
 // ===== المعادلات: حفظ وإعادة فتح =====
 await goChapter(p);await p.click(await p.$('#emptyNewLecture')?'#emptyNewLecture':'#newLectureBtn');await p.waitForTimeout(250);if(await p.$('[data-ltpl]'))await p.click('[data-ltpl="sample"]');await p.waitForTimeout(800);
 await p.evaluate(([EQS,LONG])=>{const L=window.NiborEditorDebug.lecture;L.title='اختبار المعادلات';
   EQS.forEach((e,i)=>L.blocks.push({id:'eq'+i,type:i%2?'example':'definition',title:'مثال '+i,content:'لنحسب القيمة التالية $'+e+'$ ثم نكمل الشرح بالعربية.',solution:i%2?'الحل: $$'+e+'$$':'',keepTogether:true}));
   L.blocks.push({id:'eqLong',type:'example',title:'معادلة طويلة',content:'$$'+LONG+'$$',solution:'',keepTogether:true});
   window.NiborEditorDebug.render()},[EQS,LONG]);
 await p.waitForTimeout(800);await p.click('#saveLecture');await p.waitForTimeout(800);
 await p.evaluate(()=>window.MasarDB.whenFlushed());await p.reload();await p.waitForTimeout(1500);
 const stored=await p.evaluate(()=>{const l=window.MasarStorage.get('masar-education-v1-lectures',[]).find(x=>x.title==='اختبار المعادلات');return l?l.blocks.map(b=>[b.id,b.content||'',b.solution||'']):null});
 const lost=EQS.filter((e,i)=>{const row=(stored||[]).find(r=>r[0]==='eq'+i);return !row||!row[1].includes('$'+e+'$')||(i%2&&!row[2].includes('$$'+e+'$$'))});
 ok('13 معادلة (كسور، جذور، لوغاريتمات، مصفوفات، محددات، أنظمة، رموز يونانية، خطوات، قطوع) لا تتغير بعد الحفظ وإعادة التحميل',stored&&lost.length===0,lost);
 await goChapter(p);const id=await p.evaluate(()=>window.MasarStorage.get('masar-education-v1-lectures',[]).find(x=>x.title==='اختبار المعادلات').id);
 await p.click('.openLecture[data-id="'+id+'"]');await p.waitForTimeout(1200);
 await p.click('#saveLecture');await p.waitForTimeout(600);
 const again=await p.evaluate(()=>window.MasarStorage.get('masar-education-v1-lectures',[]).find(x=>x.title==='اختبار المعادلات').blocks.map(b=>b.content+'|'+(b.solution||'')).join('\n'));
 ok('فتح المحاضرة ثم حفظها مجددًا دون تعديل لا يغيّر أي معادلة',EQS.every(e=>again.includes('$'+e+'$')),again.slice(0,200));
 await p.click('#previewLecture');await p.waitForTimeout(3500);
 const pv=await p.evaluate(()=>{const a=document.getElementById('lecturePreviewArea');const papers=[...a.querySelectorAll('.lecturePaper')];
   const errs=a.querySelectorAll('.katex-error').length,kx=a.querySelectorAll('.katex').length;
   let clipped=[];papers.forEach((pp,pi)=>{const r=pp.getBoundingClientRect();pp.querySelectorAll('.katex-display, .katex').forEach(k=>{const q=k.getBoundingClientRect();if(q.width&&(q.left<r.left-1||q.right>r.right+1))clipped.push(pi)})});
   const empty=papers.filter(pp=>!pp.querySelector('.lectureBlock')&&!pp.classList.contains('blankPage')).length;
   return {pages:papers.length,errs,kx,clipped:clipped.length,empty}});
 ok('المعاينة: كل المعادلات مرسومة بلا أخطاء KaTeX',pv.errs===0&&pv.kx>=EQS.length*1.4,pv);
 ok('المعاينة: لا معادلة تتجاوز حدود الصفحة (حتى المعادلة الطويلة جدًا)',pv.clipped===0,pv);
 ok('المعاينة: لا صفحات فارغة غير مقصودة',pv.empty===0,pv);
 await p.click('#backEditor');await p.waitForTimeout(1500);
 ok('عدد صفحات المحرر = عدد صفحات المعاينة',await p.evaluate(n=>{const pl=window.NiborEditorDebug.plan;return !!pl&&(pl.pages||pl.count||pl.length||0)===n},pv.pages)||await p.evaluate(n=>document.querySelectorAll('.pvSeam').length+1===n,pv.pages),pv.pages);
 // ===== مسودة الامتحان =====
 await p.evaluate(()=>{document.getElementById('modal').innerHTML='';goToTab('home')});await p.waitForTimeout(300);
 await p.click('#qaExam');await p.waitForTimeout(600);
 await p.evaluate(()=>{const t=document.getElementById('ebTitle');t.value='امتحان المتجهات';t.dispatchEvent(new Event('input',{bubbles:true}))});
 await p.click('#ebX');await p.waitForTimeout(50);
 ok('مسودة الامتحان تُحفظ فورًا عند الإغلاق',await p.evaluate(()=>{const k=Object.keys(localStorage).find(k=>/examBuilderDraft/.test(k));return !!k&&/امتحان المتجهات/.test(localStorage.getItem(k))}));
 await p.click('#qaExam');await p.waitForTimeout(600);
 ok('إعادة فتح الامتحان تستعيد المسودة',await p.evaluate(()=>document.getElementById('ebTitle').value==='امتحان المتجهات'));
 await p.evaluate(()=>document.getElementById('modal').innerHTML='');
 ok('لا أخطاء (المحتوى)',errs.length===0,errs);
 // ===== دون اتصال والتحديث =====
 const c2=await b.newContext({viewport:{width:1180,height:820}});const q=await c2.newPage();const qerr=[];q.on('pageerror',e=>qerr.push(e.message));q.on('dialog',d=>d.accept());
 await q.goto(base+'/index.html');await q.waitForTimeout(1500);
 await q.evaluate(async()=>{await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready});await q.waitForTimeout(4000);
 await q.evaluate(()=>{S.students.push({id:'off1',name:'طالب قبل التحديث',grade:'السادس إعدادي',section:'أ',gender:'ذكر',status:'مستمر'});save.students()});await q.evaluate(()=>window.MasarDB.whenFlushed());
 await c2.setOffline(true);await q.reload();await q.waitForTimeout(2500);
 ok('دون اتصال: التطبيق يفتح كاملًا من الجهاز',await q.evaluate(()=>!!document.querySelector('#tabs .tab')&&typeof katex!=='undefined'));
 ok('دون اتصال: البيانات موجودة',await q.evaluate(()=>S.students.some(s=>s.id==='off1')));
 await c2.setOffline(false);swVariant=1;
 const waiting=await q.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update();for(let i=0;i<40&&!reg.waiting;i++)await new Promise(r=>setTimeout(r,250));return !!reg.waiting});
 ok('التحديث: الإصدار الجديد يُنزَّل وينتظر الموافقة',waiting);
 await q.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await new Promise(r=>{navigator.serviceWorker.addEventListener('controllerchange',r,{once:true});reg.waiting.postMessage({type:'SKIP_WAITING'})})});
 await q.reload();await q.waitForTimeout(2000);
 ok('بعد التحديث: البيانات باقية',await q.evaluate(()=>S.students.some(s=>s.id==='off1')));
 ok('بعد التحديث: ذاكرة الإصدار القديم حُذفت (لا ملفات قديمة)',await q.evaluate(async()=>{const k=await caches.keys();return k.length===1&&/-next$/.test(k[0])}));
 ok('لا أخطاء (دون اتصال/تحديث)',qerr.length===0,qerr);
}finally{await b.close();server.close()}
console.log('\nv2.17.0 content & offline: '+pass+' PASS, '+fail+' FAIL');process.exit(fail?1:0)})();
