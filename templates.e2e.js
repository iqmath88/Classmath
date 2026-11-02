// نيبور كلاس v2.18.0 — قوالب جاهزة: المحاضرة (اختيار عند الإنشاء + «قوالبي»)، الملزمة (فصل جاهز)، والامتحان (منها النموذج الوزاري).
// node templates.e2e.js
const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const ROOT=__dirname;const TYPES={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.woff':'font/woff','.woff2':'font/woff2','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p==='/')p='/index.html';const f=path.join(ROOT,p);if(!f.startsWith(ROOT)||!fs.existsSync(f)){r.writeHead(404);return r.end()}r.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r)});
let pass=0,fail=0;const ok=(n,c,i)=>{if(c){pass++;console.log('PASS',n)}else{fail++;console.log('FAIL',n,i===undefined?'':JSON.stringify(i))}};
const answers=[];const nextAnswer=v=>answers.push(v);
const goChapter=async p=>{await p.evaluate(()=>{document.getElementById('modal').innerHTML='';goToTab('lectures')});await p.waitForTimeout(400);await p.click('.openProject');await p.waitForTimeout(300);await p.click('.chapterOpen');await p.waitForTimeout(400)};
(async()=>{await new Promise(r=>server.listen(0,r));const base='http://localhost:'+server.address().port;const b=await chromium.launch();
try{
 const p=await b.newPage({viewport:{width:1180,height:820}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
 p.on('dialog',d=>{const v=answers.length?answers.shift():undefined;if(d.type()==='prompt')d.accept(v!==undefined?String(v):d.defaultValue());else if(v===false)d.dismiss();else d.accept()});
 await p.goto(base+'/index.html');await p.waitForTimeout(1400);if(await p.$('#swSkip'))await p.click('#swSkip');
 // ===== قوالب المحاضرة =====
 await goChapter(p);await p.click(await p.$('#emptyNewLecture')?'#emptyNewLecture':'#newLectureBtn');await p.waitForTimeout(400);
 const pick=await p.evaluate(()=>[...document.querySelectorAll('[data-ltpl]')].map(x=>x.dataset.ltpl));
 ok('«محاضرة جديدة» تعرض اختيار القالب: شرح درس، حل تمارين، مراجعة فصل، ورقة عمل، فارغة، نموذج توضيحي',pick.join(',')==='lesson,solving,review,worksheet,blank,sample',pick);
 await p.click('[data-ltpl="lesson"]');await p.waitForTimeout(900);
 const ed=await p.evaluate(()=>{const L=window.NiborEditorDebug.lecture;return {n:L.blocks.length,types:L.blocks.map(b=>b.type).join(','),empty:L.blocks.every(b=>!b.content),tpl:L.blocks.every(b=>b.tpl),hint:document.querySelector('.blockEditor .richContent')?.dataset.placeholder||'',title:L.title}});
 ok('قالب «شرح درس»: 9 صناديق بالترتيب الصحيح وفارغة',ed.n===9&&ed.types==='objectives,text,definition,theorem,example,example,exercise,exercise,homework'&&ed.empty,ed);
 ok('النص الإرشادي يظهر رماديًا داخل الصندوق (لا محتوى حقيقي)',/أن يتعرّف الطالب/.test(ed.hint),ed.hint);
 ok('القالب لا يحمل محتوى «الأعداد المركبة» القديم',!/العدد المركب/.test(await p.evaluate(()=>JSON.stringify(window.NiborEditorDebug.lecture.blocks))));
 // ملء صندوق التعريف فقط ثم المعاينة: الفارغة لا تُطبع
 await p.evaluate(()=>{const L=window.NiborEditorDebug.lecture;L.title='النهايات';L.blocks[2].content='النهاية هي $\\lim_{x\\to a}f(x)=L$';window.NiborEditorDebug.render()});await p.waitForTimeout(700);
 await p.click('#saveLecture');await p.waitForTimeout(600);await p.click('#previewLecture');
 for(let i=0;i<30;i++){await p.waitForTimeout(400);if(await p.evaluate(()=>/تم إنشاء المعاينة/.test(document.getElementById('lecturePreviewStatus').textContent)))break}
 const pv=await p.evaluate(()=>{const a=document.getElementById('lecturePreviewArea');return {visible:[...a.querySelectorAll('.lectureBlock')].filter(x=>x.offsetHeight>0).length,txt:a.innerText,pages:a.querySelectorAll('.lecturePaper').length}});
 ok('الطباعة: الصندوق المملوء فقط يظهر، والصناديق الفارغة لا تُطبع',pv.visible===1&&/النهاية هي/.test(pv.txt)&&!/مبرهنة/.test(pv.txt)&&pv.pages===1,pv);
 await p.click('#backEditor');await p.waitForTimeout(1200);
 // حفظ كقالب (الهيكل فقط)
 nextAnswer('قالب النهايات');nextAnswer(true);
 await p.evaluate(()=>{document.querySelector('.lectureInfoDetails').open=true});await p.click('#saveAsTpl');await p.waitForTimeout(500);
 const saved=await p.evaluate(()=>window.MasarStorage.get('masar-education-v1-lecture-templates',[]));
 ok('«حفظ كقالب»: يُحفظ بالاسم، الهيكل فقط، بلا محتوى',saved.length===1&&saved[0].name==='قالب النهايات'&&saved[0].blocks.length===9&&saved[0].blocks.every(b=>!b.content)&&/النهاية هي/.test(saved[0].blocks[2].hint||''),saved[0]&&{n:saved[0].blocks.length,h:saved[0].blocks[2].hint});
 await goChapter(p);await p.click('#newLectureBtn');await p.waitForTimeout(400);
 ok('«قوالبي» تظهر في نافذة الاختيار',await p.evaluate(()=>!!document.querySelector('[data-ltpl^="u:"]')));
 await p.click('[data-ltpl^="u:"]');await p.waitForTimeout(900);
 ok('محاضرة من «قوالبي»: الصناديق نفسها فارغة',await p.evaluate(()=>{const L=window.NiborEditorDebug.lecture;return L.blocks.length===9&&L.blocks.every(b=>!b.content)}));
 await p.evaluate(()=>{document.getElementById('modal').innerHTML='';goToTab('lectures')});await p.waitForTimeout(400);
 // ===== قالب الملزمة =====
 await p.click('.openProject');await p.waitForTimeout(400);
 nextAnswer('الفصل الثاني: التفاضل');nextAnswer(true);nextAnswer('3');
 await p.click('#newChapterBtn');await p.waitForTimeout(900);
 const ch=await p.evaluate(()=>{const L=window.MasarStorage.get('masar-education-v1-lectures',[]).filter(l=>l.chapter==='الفصل الثاني: التفاضل');return {n:L.length,titles:L.map(l=>l.title),types:L.map(l=>l.blocks.length)}});
 ok('قالب الملزمة: فصل جاهز بـ 3 محاضرات شرح + مراجعة الفصل',ch.n===4&&ch.titles.join('|')==='المحاضرة 1|المحاضرة 2|المحاضرة 3|مراجعة الفصل',ch);
 ok('صفحة الفصل تعرض المحاضرات الأربع وزر تصدير الملزمة',await p.evaluate(()=>document.querySelectorAll('.openLecture').length===4&&!!document.getElementById('bookletBtn')));
 // ===== قوالب الامتحان =====
 await p.evaluate(()=>{window.__printed=[];window.__realPrintHTML=window.__realPrintHTML||window.printHTML;window.printHTML=(title,body,wp,inst,exam,em)=>{window.__printed.push({title,body,em:em||{}})};for(const k of Object.keys(localStorage))if(/examBuilderDraft/.test(k))localStorage.removeItem(k);document.getElementById('modal').innerHTML='';openExamBuilder()});await p.waitForTimeout(600);
 await p.click('#ebLoadTpl');await p.waitForTimeout(400);
 const ets=await p.evaluate(()=>[...document.querySelectorAll('[data-etbuiltin]')].map(x=>x.dataset.etbuiltin));
 ok('قوالب امتحانية جاهزة: وزاري، نصف السنة، شهري، يومي',ets.join(',')==='ministerial,midyear,monthly,quiz',ets);
 await p.click('[data-etbuiltin="ministerial"]');await p.waitForTimeout(700);
 const mq=await p.evaluate(()=>({q:document.querySelectorAll('[data-savebank]').length,marks:[...document.querySelectorAll('[data-qmarks]')].map(x=>x.value).join(','),labels:[...document.querySelectorAll('#ebQuestions .fieldLbl')].map(x=>x.textContent.trim()).filter(t=>/^فرع/.test(t)).slice(0,3).join('|'),ans:document.getElementById('ebAnswerCount').value,badge:!!document.querySelector('.qeKept')}));
 ok('النموذج الوزاري: 6 أسئلة، 20 درجة لكل سؤال، يُجاب عن 5',mq.q===6&&mq.marks==='20,20,20,20,20,20'&&mq.ans==='5',mq);
 ok('النموذج الوزاري: الفروع A و B (لا أ و ب)',/^فرع \(A\)/.test(mq.labels)&&/فرع \(B\)/.test(mq.labels),mq.labels);
 // ملء فرع من كل سؤال ثم الطباعة
 await p.evaluate(()=>{document.querySelectorAll('[data-ptexthost] [contenteditable="true"]').forEach((e,i)=>{e.innerHTML='جد ناتج $x^'+i+'$';e.dispatchEvent(new Event('input',{bubbles:true}))})});await p.waitForTimeout(900);
 await p.evaluate(()=>{window.confirm=()=>true;document.getElementById('ebPrint').click()});await p.waitForTimeout(800);
 const pr=await p.evaluate(()=>window.__printed[0]?window.__printed[0].body.replace(/<[^>]+>/g,''):'');
 const prEm=await p.evaluate(()=>window.__printed[0]?window.__printed[0].em:{});
 ok('النموذج الوزاري: رأس ملوّن واحد يحمل المعلومات الرسمية، وأسئلة بنمط «س1 :»',!!prEm.officialHeader&&prEm.officialHeader.session==='الدور الأول'&&prEm.officialHeader.duration==='ثلاث ساعات'&&!/اللجنة الدائمة/.test(pr)&&await p.evaluate(()=>{const b=window.__printed[0].body;return /class="mQ"/.test(b)&&!/examQGlass/.test(b)&&/س1 :/.test(b.replace(/<[^>]+>/g,''))}),prEm);
 // الرأس الحقيقي: نستدعي محرك الطباعة الفعلي ونفحص الرأس الملوّن
 const band=await p.evaluate(async()=>{const real=window.__realPrintHTML;window.print=()=>{};const em=window.__printed[0].em;await real('نموذج امتحان وزاري',window.__printed[0].body,false,undefined,true,em,null);await new Promise(r=>setTimeout(r,600));const h=document.querySelector('#printArea .pBandOfficial');return {one:document.querySelectorAll('#printArea .printPage, #printArea .pageWrap').length?[...document.querySelectorAll('#printArea .printPage, #printArea .pageWrap')][0].querySelectorAll('.pBand').length:0,txt:h?h.innerText:'',colored:h?!h.classList.contains('pBandMono'):false,orn:!!(h&&h.querySelector('.pHeaderOrnament'))}});
 ok('الطباعة الوزارية: رأس واحد ملوّن مزخرف فيه اللجنة الدائمة ووزارة التربية والدور والوقت',band.one===1&&band.colored&&band.orn&&/اللجنة الدائمة للامتحانات العامة/.test(band.txt)&&/جمهورية العراق - وزارة التربية/.test(band.txt)&&/الدور الأول/.test(band.txt)&&/ثلاث ساعات/.test(band.txt),band);
 ok('الطباعة الوزارية: اسم الطالب والرقم الامتحاني والملاحظة',/إسم الطالب/.test(pr)&&/الرقم الامتحاني/.test(pr)&&/الإجابة عن خمسة أسئلة فقط/.test(pr));
 ok('الطباعة الوزارية: الفروع A- و B- و C-',/A- /.test(pr)&&/B- /.test(pr)&&/C- /.test(pr));
 ok('مجموع الدرجات = 100 (أعلى 5 أسئلة من 6)',await p.evaluate(()=>{let m='';const t=window.toast;window.toast=x=>{m+=x};try{document.getElementById('ebPrint').click()}finally{window.toast=t}return /المجموع 100/.test(m)||/100/.test(m)}));
 // امتحان عادي: معلومات الصف والمادة والوقت تظهر الآن (كانت تُهمل)
 await p.click('#ebLoadTpl');await p.waitForTimeout(400);await p.click('[data-etbuiltin="monthly"]');await p.waitForTimeout(700);
 await p.evaluate(()=>{document.querySelectorAll('[data-ptexthost] [contenteditable="true"]').forEach(e=>{e.innerHTML='سؤال';e.dispatchEvent(new Event('input',{bubbles:true}))});window.__printed=[]});await p.waitForTimeout(900);
 await p.evaluate(()=>document.getElementById('ebPrint').click());await p.waitForTimeout(800);
 const pr2=await p.evaluate(()=>window.__printed[0]?window.__printed[0].body:'');
 ok('الامتحان الشهري: الصف والمادة والوقت واسم الطالب في أعلى الورقة، بلا رأس وزاري، وفروع أ) ب)',/الصف:/.test(pr2)&&/المادة:/.test(pr2)&&/الوقت: ساعة واحدة/.test(pr2)&&/اسم الطالب/.test(pr2)&&!/اللجنة الدائمة/.test(pr2)&&/أ\) /.test(pr2),pr2.slice(0,300));
 await p.evaluate(()=>document.getElementById('modal').innerHTML='');
 ok('لا أخطاء JavaScript',errs.length===0,errs);
 // الهاتف: نافذة القوالب بلا تمرير أفقي
 const q=await b.newPage({viewport:{width:390,height:844}});q.on('dialog',d=>d.accept());await q.goto(base+'/index.html');await q.waitForTimeout(1400);
 await goChapter(q);await q.click(await q.$('#emptyNewLecture')?'#emptyNewLecture':'#newLectureBtn');await q.waitForTimeout(400);
 ok('الهاتف: نافذة القوالب بعمودين ولا تمرير أفقي',await q.evaluate(()=>!!document.querySelector('.ltGrid')&&document.documentElement.scrollWidth<=innerWidth+1));
}finally{await b.close();server.close()}
console.log('\nv2.18.0 templates: '+pass+' PASS, '+fail+' FAIL');process.exit(fail?1:0)})();
