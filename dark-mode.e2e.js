// نيبور كلاس v2.18.3 — الوضع الليلي: الورقة في المحرر تبقى بألوان الطباعة، والنصوص مقروءة (تباين ≥ 4.5) في عرضَي «الصفحة» و«العناصر».
// node dark-mode.e2e.js
const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const ROOT=__dirname;const TYPES={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.woff':'font/woff','.woff2':'font/woff2','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p==='/')p='/index.html';const f=path.join(ROOT,p);if(!f.startsWith(ROOT)||!fs.existsSync(f)){r.writeHead(404);return r.end()}r.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r)});
let pass=0,fail=0;const ok=(n,c,i)=>{if(c){pass++;console.log('PASS',n)}else{fail++;console.log('FAIL',n,i===undefined?'':JSON.stringify(i))}};
const measure=(p,sel)=>p.evaluate(sel=>{
 const lum=c=>{const m=c.match(/\d+(\.\d+)?/g);if(!m)return 1;const [r,g,b]=m.slice(0,3).map(Number).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*r+.7152*g+.0722*b};
 const bgOf=e=>{while(e){const c=getComputedStyle(e).backgroundColor;if(c&&!/rgba\(0, 0, 0, 0\)|transparent/.test(c))return c;e=e.parentElement}return 'rgb(255,255,255)'};
 const out=[];document.querySelectorAll(sel).forEach(e=>{if(!e.offsetParent)return;if(![...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))return; // نص مباشر فقط (لا الحاويات)
 const fg=getComputedStyle(e).color,bg=bgOf(e);const L1=lum(fg),L2=lum(bg);out.push({k:e.className.split(' ')[0],fg,bg,cr:Math.round((Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05)*10)/10})});
 return {n:out.length,low:out.filter(x=>x.cr<4.5)}},sel);
(async()=>{await new Promise(r=>server.listen(0,r));const base='http://localhost:'+server.address().port;const b=await chromium.launch();
try{const p=await b.newPage({viewport:{width:1180,height:820}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 await p.goto(base+'/index.html');await p.waitForTimeout(1400);if(await p.$('#swSkip'))await p.click('#swSkip');
 await p.evaluate(()=>{if(!S.settings.dark)document.getElementById('darkBtn').click()});await p.waitForTimeout(300);
 ok('الوضع الليلي مفعّل',await p.evaluate(()=>document.documentElement.classList.contains('dark')));
 await p.evaluate(()=>{document.getElementById('modal').innerHTML='';goToTab('lectures')});await p.waitForTimeout(400);await p.click('.openProject');await p.waitForTimeout(300);await p.click('.chapterOpen');await p.waitForTimeout(400);
 await p.click(await p.$('#emptyNewLecture')?'#emptyNewLecture':'#newLectureBtn');await p.waitForTimeout(300);if(await p.$('[data-ltpl]'))await p.click('[data-ltpl="sample"]');await p.waitForTimeout(1500);
 await p.evaluate(()=>{const b=document.querySelectorAll('.blockEditor')[2];b&&b.scrollIntoView({block:'center'});b&&b.click()});await p.waitForTimeout(500);
 const paper=await p.evaluate(()=>{const pp=document.querySelector('.pvPaper');const rc=pp&&pp.querySelector('.richContent');const bg=e=>{while(e){const c=getComputedStyle(e).backgroundColor;if(c&&!/rgba\(0, 0, 0, 0\)/.test(c))return c;e=e.parentElement}return ''};return {page:pp?getComputedStyle(pp).backgroundColor:'',box:rc?bg(rc):'',bar:getComputedStyle(document.querySelector('.editorTopbar')).backgroundColor}});
 const light=c=>{const m=(c.match(/\d+/g)||[]).map(Number);return m.length>=3&&m[0]>200&&m[1]>200&&m[2]>200};
 ok('عرض «الصفحة»: الورقة وصناديقها بألوان الطباعة (فاتحة)',light(paper.page)&&light(paper.box),paper);
 ok('شريط المحرر حول الورقة يبقى داكنًا',!light(paper.bar),paper.bar);
 const m1=await measure(p,'.pvPaper .richContent, .pvPaper .richContent *, .pvPaper .blockEditorHead *, .pvPaper [data-rich-field]');
 ok('عرض «الصفحة»: كل النصوص مقروءة (تباين ≥ 4.5)',m1.n>3&&m1.low.length===0,m1);
 await p.click('#viewToggle');await p.waitForTimeout(1200);
 const m2=await measure(p,'.lectureEditor .richContent, .lectureEditor .blockEditorHead *, .lectureEditor [data-rich-field]');
 ok('عرض «العناصر»: كل النصوص مقروءة (تباين ≥ 4.5)',m2.n>3&&m2.low.length===0,m2.low.slice(0,4));
 await p.click('#viewToggle');await p.waitForTimeout(1000);
 await p.click('#previewLecture');await p.waitForTimeout(2500);
 const m3=await measure(p,'#lecturePreviewArea .lectureBlock *');
 ok('المعاينة في الوضع الليلي: مقروءة',m3.n>3&&m3.low.length===0,m3.low.slice(0,4));
 ok('لا أخطاء JavaScript',errs.length===0,errs);
}finally{await b.close();server.close()}
console.log('\nv2.18.3 dark mode: '+pass+' PASS, '+fail+' FAIL');process.exit(fail?1:0)})();
