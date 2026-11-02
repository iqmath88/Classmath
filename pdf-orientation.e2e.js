// نيبور كلاس v2.17.1 — PDF يطابق المعاينة في A4 العمودي والأفقي (كان الأفقي يُقاس بارتفاع 297 ملم أثناء التصدير فيُقطَّع).
// node pdf-orientation.e2e.js      (Playwright + poppler-utils: pdfinfo)
const http=require('http'),fs=require('fs'),path=require('path'),os=require('os'),cp=require('child_process');const {chromium}=require('playwright');
const ROOT=__dirname;const TYPES={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.woff':'font/woff','.woff2':'font/woff2','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p==='/')p='/index.html';const f=path.join(ROOT,p);if(!f.startsWith(ROOT)||!fs.existsSync(f)){r.writeHead(404);return r.end()}r.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r)});
let pass=0,fail=0;const ok=(n,c,i)=>{if(c){pass++;console.log('PASS',n)}else{fail++;console.log('FAIL',n,i===undefined?'':JSON.stringify(i))}};
(async()=>{await new Promise(r=>server.listen(0,r));const base='http://localhost:'+server.address().port;const b=await chromium.launch();
try{const p=await b.newPage({viewport:{width:1180,height:820},acceptDownloads:true});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 await p.goto(base+'/index.html');await p.waitForTimeout(1400);if(await p.$('#swSkip'))await p.click('#swSkip');
 await p.evaluate(()=>{document.getElementById('modal').innerHTML='';goToTab('lectures')});await p.waitForTimeout(400);await p.click('.openProject');await p.waitForTimeout(300);await p.click('.chapterOpen');await p.waitForTimeout(400);
 await p.click(await p.$('#emptyNewLecture')?'#emptyNewLecture':'#newLectureBtn');await p.waitForTimeout(800);
 await p.evaluate(()=>{const L=window.NiborEditorDebug.lecture;L.title='اتجاه الصفحة';L.blocks=L.blocks.slice(0,3);for(let i=0;i<14;i++)L.blocks.push({id:'b'+i,type:i%2?'example':'definition',title:'تعريف المشتقة '+i,content:'المشتقة الأولى للدالة $f(x)=x^3+2x$ هي $f\'(x)=3x^2+2$ والنهاية $$\\lim_{h\\to0}\\frac{f(x+h)-f(x)}{h}$$',solution:i%2?'الحل: $3(2)^2+2=14$':'',keepTogether:true});window.NiborEditorDebug.render()});
 await p.waitForTimeout(800);
 await p.evaluate(()=>{const o=window.NiborPDF.exportLecture;window.NiborPDF.exportLecture=async(l,opts)=>{const pg=opts.paginate;opts.paginate=async x=>{const h=await pg(x);const d=document.createElement('div');d.innerHTML=h;window.__exp=[...d.querySelectorAll('.lecturePaper')].map(x=>x.querySelectorAll('.lectureBlock').length).join(',');return h};return o(l,opts)}});
 for(const o of ['portrait','landscape']){
  await p.evaluate(o=>{document.querySelector('.lectureInfoDetails').open=true;const s=document.getElementById('lecOrient');s.value=o;s.dispatchEvent(new Event('change',{bubbles:true}))},o);await p.waitForTimeout(1000);
  await p.click('#saveLecture');await p.waitForTimeout(400);await p.click('#previewLecture');
  for(let i=0;i<30;i++){await p.waitForTimeout(500);if(await p.evaluate(()=>/تم إنشاء المعاينة/.test(document.getElementById('lecturePreviewStatus').textContent)))break}
  const pv=await p.evaluate(()=>[...document.querySelectorAll('#lecturePreviewArea .lecturePaper')].map(x=>x.querySelectorAll('.lectureBlock').length).join(','));
  await p.click('#pdfLecture');await p.waitForSelector('#pdfDl',{timeout:180000});
  const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#pdfDl')]);const fp=path.join(os.tmpdir(),'orient-'+o+'.pdf');fs.copyFileSync(await dl.path(),fp);
  const info=cp.execSync('pdfinfo "'+fp+'"').toString();const pages=+/Pages:\s+(\d+)/.exec(info)[1];const size=/Page size:\s+([\d.]+) x ([\d.]+)/.exec(info);const land=+size[1]>+size[2];
  const exp=await p.evaluate(()=>window.__exp);
  ok(o+': توزيع التصدير = توزيع المعاينة (الصناديق في كل صفحة)',exp===pv,{pv,exp});
  ok(o+': عدد صفحات PDF = عدد صفحات المعاينة',pages===pv.split(',').length,{pages,pv});
  ok(o+': اتجاه صفحات PDF صحيح',o==='landscape'?land:!land,size&&size[0]);
  await p.evaluate(()=>document.getElementById('modal').innerHTML='');await p.click('#backEditor');await p.waitForTimeout(1200);
 }
 ok('لا أخطاء JavaScript',errs.length===0,errs);
}finally{await b.close();server.close()}
console.log('\nv2.17.1 pdf orientation: '+pass+' PASS, '+fail+' FAIL');process.exit(fail?1:0)})();
