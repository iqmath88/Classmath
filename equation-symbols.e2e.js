// نيبور كلاس v2.19.0 — محرر المعادلات: 12 مجموعة وأكثر من 250 رمزًا تُرسم كلها بلا أخطاء، وبحث، والمؤشر داخل أول خانة.
// node equation-symbols.e2e.js
const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const ROOT=__dirname;const TYPES={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.woff':'font/woff','.woff2':'font/woff2','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p==='/')p='/index.html';const f=path.join(ROOT,p);if(!f.startsWith(ROOT)||!fs.existsSync(f)){r.writeHead(404);return r.end()}r.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r)});
let pass=0,fail=0;const ok=(n,c,i)=>{if(c){pass++;console.log('PASS',n)}else{fail++;console.log('FAIL',n,i===undefined?'':JSON.stringify(i))}};
(async()=>{await new Promise(r=>server.listen(0,r));const base='http://localhost:'+server.address().port;const b=await chromium.launch();
try{const p=await b.newPage({viewport:{width:1180,height:820}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 await p.goto(base+'/index.html');await p.waitForTimeout(1400);if(await p.$('#swSkip'))await p.click('#swSkip');
 await p.evaluate(()=>{document.getElementById('modal').innerHTML='';goToTab('lectures')});await p.waitForTimeout(400);await p.click('.openProject');await p.waitForTimeout(300);await p.click('.chapterOpen');await p.waitForTimeout(400);
 await p.click(await p.$('#emptyNewLecture')?'#emptyNewLecture':'#newLectureBtn');await p.waitForTimeout(300);if(await p.$('[data-ltpl]'))await p.click('[data-ltpl="sample"]');await p.waitForTimeout(1300);
 const rc=await p.$('.blockEditor[data-index="2"] .richContent');await rc.click();await p.keyboard.press('End');
 await p.keyboard.press('Control+Shift+E');await p.waitForTimeout(900);
 const tabs=await p.evaluate(()=>[...document.querySelectorAll('#eqTabs button')].map(b=>b.textContent));
 ok('12 مجموعة رموز',tabs.length===12&&['رموز يونانية','دوال','مجموعات ومنطق','علاقات وأسهم','هندسة ومتجهات','القطوع المخروطية','إحصاء واحتمال'].every(t=>tabs.includes(t)),tabs);
 let total=0,errsK=0;const per={};
 for(let i=0;i<tabs.length;i++){await p.click('#eqTabs button:nth-child('+(i+1)+')');await p.waitForTimeout(250);const r=await p.evaluate(()=>({n:document.querySelectorAll('#eqSymbols button').length,e:document.querySelectorAll('#eqSymbols .katex-error').length,k:document.querySelectorAll('#eqSymbols .katex').length}));total+=r.n;errsK+=r.e;per[tabs[i]]=r.n}
 ok('أكثر من 250 رمزًا',total>=250,{total,per});
 ok('كل الرموز تُرسم بلا أخطاء KaTeX',errsK===0,errsK);
 // الإدراج والمؤشر
 await p.click('#eqTabs button:nth-child(1)');await p.waitForTimeout(200);
 await p.click('#eqSymbols button[title="كسر"]');await p.keyboard.type('1');
 ok('«كسر»: المؤشر داخل البسط',await p.evaluate(()=>document.getElementById('eqLatexInput').value)==='\\frac{1}{}');
 await p.fill('#eqLatexInput','');await p.click('#eqTabs button:nth-child(4)');await p.waitForTimeout(200);
 await p.click('#eqSymbols button[title="نهاية من اليمين"]');await p.keyboard.type('a');
 ok('«نهاية من اليمين»: المؤشر قبل +',await p.evaluate(()=>document.getElementById('eqLatexInput').value)==='\\lim_{x \\to a^{+}}'||await p.evaluate(()=>/\\lim_\{x \\to \{?a\}?\^\{\+\}\}/.test(document.getElementById('eqLatexInput').value)),await p.evaluate(()=>document.getElementById('eqLatexInput').value));
 // البحث
 await p.fill('#eqSearch','سيغما');await p.waitForTimeout(300);
 const sg=await p.evaluate(()=>[...document.querySelectorAll('#eqSymbols button')].map(b=>b.title));
 ok('البحث «سيغما» يجد σ و Σ',sg.some(t=>/σ/.test(t))&&sg.some(t=>/Σ/.test(t)),sg);
 await p.fill('#eqSearch','تكامل');await p.waitForTimeout(300);
 ok('البحث «تكامل» يجد عدة رموز من مجموعات مختلفة',await p.evaluate(()=>document.querySelectorAll('#eqSymbols button').length)>=4);
 await p.fill('#eqSearch','قطع زائد');await p.waitForTimeout(300);
 await p.click('#eqSymbols button[title="قطع زائد (أفقي)"]');
 ok('إدراج «قطع زائد» من نتائج البحث',/\\frac\{x\^\{2\}\}\{a\^\{2\}\}-\\frac\{y\^\{2\}\}\{b\^\{2\}\}=1/.test(await p.evaluate(()=>document.getElementById('eqLatexInput').value)));
 await p.fill('#eqSearch','كلمة غير موجودة');await p.waitForTimeout(300);
 ok('بحث بلا نتائج: رسالة واضحة',await p.evaluate(()=>!!document.querySelector('#eqSymbols .eqNoHit')));
 await p.click('#eqTabs button:nth-child(2)');await p.waitForTimeout(250);
 ok('اختيار مجموعة يمسح البحث ويعرض المجموعة',await p.evaluate(()=>document.getElementById('eqSearch').value===''&&document.querySelectorAll('#eqSymbols button').length>=25));
 // الحفظ في الصندوق
 await p.fill('#eqLatexInput','\\alpha+\\beta=\\frac{\\pi}{2}');await p.waitForTimeout(400);await p.click('#eqInsert');await p.waitForTimeout(700);
 const blk=await p.evaluate(()=>{const b=window.NiborEditorDebug.lecture.blocks[2];return String(b.content||'')+' '+String(b.contentHtml||'')});
 ok('المعادلة تُدرج في الصندوق',blk.includes('\\alpha+\\beta=\\frac{\\pi}{2}'),blk.slice(-200));
 ok('لا أخطاء JavaScript',errs.length===0,errs);
}finally{await b.close();server.close()}
console.log('\nv2.19.0 equation symbols: '+pass+' PASS, '+fail+' FAIL');process.exit(fail?1:0)})();
