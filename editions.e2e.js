// نيبور كلاس v2.15.0 — نسخة الطالب (بلا حلول، مع أسطر إجابة) ونسخة الأستاذ (مع الحلول)، للمحاضرة والملزمة.
// node editions.e2e.js
const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const ROOT=__dirname;const TYPES={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.woff':'font/woff','.woff2':'font/woff2','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p==='/')p='/index.html';const f=path.join(ROOT,p);if(!f.startsWith(ROOT)||!fs.existsSync(f)){r.writeHead(404);return r.end()}r.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r)});
let pass=0,fail=0;const ok=(n,c,i)=>{if(c){pass++;console.log('PASS',n)}else{fail++;console.log('FAIL',n,i===undefined?'':JSON.stringify(i))}};
const goChapter=async p=>{await p.evaluate(()=>{document.getElementById('modal').innerHTML='';goToTab('lectures')});await p.waitForTimeout(400);await p.click('.openProject');await p.waitForTimeout(300);await p.click('.chapterOpen');await p.waitForTimeout(400)};
const area=p=>p.evaluate(()=>{const a=document.getElementById('lecturePreviewArea');return {txt:a.innerText,sol:a.querySelectorAll('.lectureSolution').length,lines:[...a.querySelectorAll('.type-exercise .answerLines span')].length,exLines:a.querySelectorAll('.type-example .answerLines').length,pill:!!a.querySelector('.lecEdPill'),pages:a.querySelectorAll('.lecturePaper').length,status:document.getElementById('lecturePreviewStatus').textContent}});
(async()=>{await new Promise(r=>server.listen(0,r));const base='http://localhost:'+server.address().port;const b=await chromium.launch();
try{
 const p=await b.newPage({viewport:{width:1180,height:820},acceptDownloads:true});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 await p.goto(base+'/index.html');await p.waitForTimeout(1400);if(await p.$('#swSkip'))await p.click('#swSkip');
 await goChapter(p);await p.click(await p.$('#emptyNewLecture')?'#emptyNewLecture':'#newLectureBtn');await p.waitForTimeout(800);
 await p.evaluate(()=>{const L=window.NiborEditorDebug.lecture;const mk=(type,content,solution)=>({id:'t'+Math.random().toString(36).slice(2),type,title:type==='example'?'مثال':'تمرين',content,solution,keepTogether:true,smart:{answerLines:0,showSolution:true}});
  L.blocks.push(mk('example','جد ناتج $2+3$','حل المثال الظاهر $=5$'),mk('exercise','جد ناتج $7\\times 8$','حل التمرين السري: الناتج $56$ لأن ضرب سبعة في ثمانية يعطي ستة وخمسين وهذا شرح أطول للحل'));window.NiborEditorDebug.render()});
 await p.waitForTimeout(700);await p.click('#saveLecture');await p.waitForTimeout(600);
 await p.click('#previewLecture');await p.waitForTimeout(2200);
 const t=await area(p);
 ok('المعاينة تبدأ بنسخة الأستاذ: الحلول ظاهرة',/حل التمرين السري/.test(t.txt)&&/حل المثال الظاهر/.test(t.txt)&&!t.pill,t);
 ok('مفتاح «نسخة الأستاذ / نسخة الطالب» في شريط المعاينة',await p.evaluate(()=>document.querySelectorAll('.previewToolbar [data-edition]').length===2&&document.querySelector('[data-edition="teacher"]').classList.contains('on')));
 await p.click('[data-edition="student"]');await p.waitForTimeout(2200);
 const s=await area(p);
 ok('نسخة الطالب: حل التمرين مخفي',!/حل التمرين السري/.test(s.txt),s);
 ok('نسخة الطالب: مكان الحل أسطر إجابة بحسب طول الحل (3 أسطر على الأقل)',s.lines>=3,s.lines);
 ok('نسخة الطالب: حلول الأمثلة ظاهرة افتراضيًا',/حل المثال الظاهر/.test(s.txt));
 ok('نسخة الطالب: وسم «نسخة الطالب» في رأس الصفحة',s.pill);
 ok('حالة المعاينة تذكر «نسخة الطالب»',/نسخة الطالب/.test(s.status),s.status);
 ok('خيار «إخفاء حلول الأمثلة أيضًا» يظهر مع نسخة الطالب',await p.evaluate(()=>!document.querySelector('.edExamples').hidden));
 await p.check('#edExamples');await p.waitForTimeout(2200);
 const s2=await area(p);
 ok('مع خيار الأمثلة: حل المثال مخفي ومكانه أسطر',!/حل المثال الظاهر/.test(s2.txt)&&s2.exLines>=1&&s2.sol===0,s2);
 ok('الاختيار محفوظ على الجهاز',await p.evaluate(()=>{const v=JSON.parse(localStorage.getItem('nibor-print-edition')||'{}');return v.student===true&&v.examples===true}));
 ok('البيانات لم تتغير: الحلول باقية في المحاضرة',await p.evaluate(()=>/حل التمرين السري/.test(JSON.stringify(window.NiborEditorDebug.lecture.blocks))));
 // ملف PDF يحمل اسم النسخة
 await p.evaluate(()=>{const o=window.NiborPDF.exportLecture;window.NiborPDF.exportLecture=async(l,opts)=>{window.__title=l.title;const pg=opts.paginate;opts.paginate=async x=>{const h=await pg(x);window.__lecHtml=h;return h};return o(l,opts)}});
 await p.click('#pdfLecture');await p.waitForSelector('#pdfDl',{timeout:120000});
 const pdf=await p.evaluate(()=>({t:window.__title,sec:/حل التمرين السري/.test(window.__lecHtml||''),pill:/lecEdPill/.test(window.__lecHtml||'')}));
 ok('PDF نسخة الطالب: الاسم ينتهي بـ «نسخة الطالب» وبلا حلول',/نسخة الطالب$/.test(pdf.t)&&!pdf.sec&&pdf.pill,pdf);
 await p.evaluate(()=>document.getElementById('modal').innerHTML='');
 // المحرر يبقى بالحلول حتى مع اختيار نسخة الطالب
 await p.click('#backEditor');await p.waitForTimeout(1500);
 ok('المحرر يعرض الحلول دائمًا (نسخة الطالب للطباعة فقط)',await p.evaluate(()=>/حل التمرين السري/.test(document.querySelector('.lectureEditor').innerText+[...document.querySelectorAll('.lectureEditor textarea')].map(x=>x.value).join(' '))));
 // العودة إلى نسخة الأستاذ
 await p.click('#previewLecture');await p.waitForTimeout(2000);
 ok('المعاينة تتذكر النسخة المختارة',await p.evaluate(()=>document.querySelector('[data-edition="student"]').classList.contains('on')));
 await p.click('[data-edition="teacher"]');await p.waitForTimeout(2000);
 const t2=await area(p);ok('الرجوع إلى نسخة الأستاذ يعيد كل الحلول',/حل التمرين السري/.test(t2.txt)&&/حل المثال الظاهر/.test(t2.txt)&&!t2.pill,t2);
 // الملزمة
 await p.click('#backEditor');await p.waitForTimeout(800);await p.click('#saveLecture');await p.waitForTimeout(500);
 await goChapter(p);await p.click('#bookletBtn');await p.waitForTimeout(400);
 ok('ورقة الملزمة: اختيار النسخة (الأستاذ افتراضيًا)',await p.evaluate(()=>document.querySelectorAll('[data-bk-ed]').length===2&&document.querySelector('[data-bk-ed="teacher"]').classList.contains('on')&&document.getElementById('bkExWrap').hidden));
 await p.click('[data-bk-ed="student"]');
 ok('اختيار نسخة الطالب يُظهر خيار الأمثلة',await p.evaluate(()=>!document.getElementById('bkExWrap').hidden));
 await p.evaluate(()=>{const o=window.NiborPDF.exportLecture;window.NiborPDF.exportLecture=async(l,opts)=>{window.__bkTitle=l.title;const pg=opts.paginate;opts.paginate=async x=>{const h=await pg(x);window.__bk=h;return h};return o(l,opts)}});
 await p.click('#bkGo');await p.waitForSelector('#pdfDl',{timeout:180000});
 const bk=await p.evaluate(()=>{const d=document.createElement('div');d.innerHTML=window.__bk;return {t:window.__bkTitle,sec:/حل التمرين السري/.test(d.innerText||d.textContent),ex:/حل المثال الظاهر/.test(d.textContent),badge:d.querySelector('.bookCover .bcEdition')?.textContent||'',lines:d.querySelectorAll('.type-exercise .answerLines span').length}});
 ok('ملزمة الطالب: بلا حلول التمارين ومكانها أسطر',!bk.sec&&bk.lines>=3,bk);
 ok('ملزمة الطالب: حلول الأمثلة ظاهرة (الخيار غير مفعّل)',bk.ex,bk);
 ok('ملزمة الطالب: شارة «نسخة الطالب» على الغلاف واسم الملف',bk.badge==='نسخة الطالب'&&/نسخة الطالب$/.test(bk.t),bk);
 await p.evaluate(()=>document.getElementById('modal').innerHTML='');await p.waitForTimeout(200);
 await p.click('#bookletBtn');await p.waitForTimeout(400);
 ok('اختيار النسخة محفوظ مع إعدادات الملزمة',await p.evaluate(()=>document.querySelector('[data-bk-ed="student"]').classList.contains('on')));
 await p.click('[data-bk-ed="teacher"]');await p.click('#bkGo');await p.waitForSelector('#pdfDl',{timeout:180000});
 const bt=await p.evaluate(()=>{const d=document.createElement('div');d.innerHTML=window.__bk;return {t:window.__bkTitle,sec:/حل التمرين السري/.test(d.textContent),badge:d.querySelector('.bookCover .bcEdition')?.textContent||''}});
 ok('ملزمة الأستاذ: بالحلول وشارة «نسخة الأستاذ» واسم بلا لاحقة',bt.sec&&/نسخة الأستاذ/.test(bt.badge)&&!/نسخة/.test(bt.t),bt);
 ok('لا أخطاء JavaScript',errs.length===0,errs);
}finally{await b.close();server.close()}
console.log('\nv2.15.0 editions: '+pass+' PASS, '+fail+' FAIL');process.exit(fail?1:0)})();
