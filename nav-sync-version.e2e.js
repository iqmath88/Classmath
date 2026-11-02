// نيبور كلاس v2.16.0 — «شؤون الطلبة» و«شؤون التدريسي»، رقم الإصدار، ومزامنة المحاضرات بين جهازين (Supabase وهمي في الذاكرة).
// node nav-sync-version.e2e.js
const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const ROOT=__dirname;const TYPES={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.woff':'font/woff','.woff2':'font/woff2','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p==='/')p='/index.html';const f=path.join(ROOT,p);if(!f.startsWith(ROOT)||!fs.existsSync(f)){r.writeHead(404);return r.end()}r.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r)});
let pass=0,fail=0;const ok=(n,c,i)=>{if(c){pass++;console.log('PASS',n)}else{fail++;console.log('FAIL',n,i===undefined?'':JSON.stringify(i))}};
// خادم Supabase وهمي مشترك بين «الجهازين»
const CLOUD={rows:{},posts:0};
async function mockCloud(ctx){await ctx.route('https://sync.test/**',async route=>{const req=route.request(),u=new URL(req.url());
 if(!u.pathname.endsWith('/rest/v1/sync_data'))return route.fulfill({status:404,body:'{}'});
 if(req.method()==='POST'){const rows=JSON.parse(req.postData());rows.forEach(r=>{CLOUD.rows[r.id]=JSON.parse(JSON.stringify(r))});CLOUD.posts++;return route.fulfill({status:201,body:''})}
 const id=(u.searchParams.get('id')||'').replace(/^eq\./,'');const row=CLOUD.rows[id];const sel=u.searchParams.get('select')||'';
 const out=!row?[]:/ls:payload->lectureSync/.test(sel)?[{ls:row.payload.lectureSync||null}]:[{payload:JSON.parse(JSON.stringify(row.payload)),updated_at:row.updated_at}];
 return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(out)})})}
async function device(b,base,w,h){const ctx=await b.newContext({viewport:{width:w||1180,height:h||820}});await mockCloud(ctx);const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));p.on('dialog',d=>d.accept());
 await p.goto(base+'/index.html');await p.waitForTimeout(1400);if(await p.$('#swSkip'))await p.click('#swSkip');return p}
const goChapter=async p=>{await p.evaluate(()=>{document.getElementById('modal').innerHTML='';goToTab('lectures')});await p.waitForTimeout(400);await p.click('.openProject');await p.waitForTimeout(300);await p.click('.chapterOpen');await p.waitForTimeout(400)};
async function newLecture(p,title){await goChapter(p);await p.click(await p.$('#emptyNewLecture')?'#emptyNewLecture':'#newLectureBtn');await p.waitForTimeout(250);if(await p.$('[data-ltpl]'))await p.click('[data-ltpl="sample"]');await p.waitForTimeout(700);
 await p.evaluate(t=>{document.querySelector('.lectureInfoDetails').open=true;const e=document.getElementById('lecTitle');e.value=t;e.dispatchEvent(new Event('input'))},title);
 await p.click('#saveLecture');await p.waitForTimeout(500);await p.evaluate(()=>{document.getElementById('modal').innerHTML='';goToTab('lectures')});await p.waitForTimeout(300)}
const titles=p=>p.evaluate(()=>window.MasarStorage.get('masar-education-v1-lectures',[]).map(l=>l.title).sort());
const enableSync=p=>p.evaluate(()=>{S.settings.sync={url:'https://sync.test',key:'anon',code:'room-1'};saveKey('settings',S.settings)});
(async()=>{await new Promise(r=>server.listen(0,r));const base='http://localhost:'+server.address().port;const b=await chromium.launch();
try{
 // ---------- التنقل ----------
 const p=await device(b,base);
 const top=await p.evaluate(()=>[...document.querySelectorAll('#tabs .tab')].filter(x=>getComputedStyle(x).display!=='none').map(x=>x.dataset.tab||('g:'+x.dataset.group)));
 ok('أربعة أزرار فقط: الرئيسية، شؤون الطلبة، شؤون التدريسي، الإعدادات',top.join(',')==='home,g:students,g:teaching,settings',top);
 ok('أسماء المجموعتين',await p.evaluate(()=>[...document.querySelectorAll('#tabs .tab[data-group] .tlabel')].map(x=>x.textContent).join('|')==='شؤون الطلبة|شؤون التدريسي'));
 ok('الرئيسية بلا شريط أقسام',!(await p.$('#content > .secNav')));
 await p.click('#tabs [data-group="students"]');await p.waitForTimeout(400);
 const sn=await p.evaluate(()=>({tab:S.tab,secs:[...document.querySelectorAll('#content > .secNav [data-sec]')].map(x=>x.dataset.sec),on:document.querySelector('#content > .secNav .on')?.dataset.sec,top:document.querySelector('#tabs .tab.on')?.dataset.group}));
 ok('«شؤون الطلبة» تفتح الحضور وشريط: الحضور، التقييم، الطلبة، الأقساط',sn.tab==='attendance'&&sn.secs.join(',')==='attendance,evaluation,students,payments'&&sn.on==='attendance'&&sn.top==='students',sn);
 await p.click('#content > .secNav [data-sec="evaluation"]');await p.waitForTimeout(400);
 ok('التنقل داخل المجموعة من الشريط',await p.evaluate(()=>S.tab==='evaluation'&&document.querySelector('#content > .secNav .on')?.dataset.sec==='evaluation'));
 await p.click('#evStats');await p.waitForTimeout(500);
 ok('الإحصاءات (صفحة فرعية من التقييم): المجموعة والقسم مضاءان',await p.evaluate(()=>S.tab==='stats'&&document.querySelector('#tabs .tab.on')?.dataset.group==='students'&&document.querySelector('#content > .secNav .on')?.dataset.sec==='evaluation'));
 await p.evaluate(()=>goToTab('attendance'));await p.waitForTimeout(300);
 await p.evaluate(()=>{const s=document.querySelector('#content select');if(s){s.selectedIndex=Math.min(1,s.options.length-1);s.dispatchEvent(new Event('change'))}});await p.waitForTimeout(400);
 ok('الشريط يبقى بعد إعادة رسم القسم من داخله (تغيير الصف)',!!(await p.$('#content > .secNav')));
 await p.click('#tabs [data-group="teaching"]');await p.waitForTimeout(500);
 ok('«شؤون التدريسي» تفتح المحاضرات وشريط: المحاضرات، التدريس',await p.evaluate(()=>S.tab==='lectures'&&[...document.querySelectorAll('#content > .secNav [data-sec]')].map(x=>x.dataset.sec).join(',')==='lectures,teaching'));
 await p.click('#content > .secNav [data-sec="teaching"]');await p.waitForTimeout(400);
 await p.click('#tabs [data-group="students"]');await p.waitForTimeout(300);await p.click('#tabs [data-group="teaching"]');await p.waitForTimeout(400);
 ok('كل مجموعة تتذكر آخر قسم فُتح فيها',await p.evaluate(()=>S.tab==='teaching'));
 await p.evaluate(()=>goToTab('lectures'));await p.waitForTimeout(300);await p.click('.openProject');await p.waitForTimeout(300);await p.click('.chapterOpen');await p.waitForTimeout(300);
 await p.click(await p.$('#emptyNewLecture')?'#emptyNewLecture':'#newLectureBtn');await p.waitForTimeout(250);if(await p.$('[data-ltpl]'))await p.click('[data-ltpl="sample"]');await p.waitForTimeout(800);
 ok('لا شريط أقسام داخل المحرر',!(await p.$('#content > .secNav'))&&!!(await p.$('.lectureEditor')));
 await p.click('#previewLecture');await p.waitForTimeout(1200);ok('ولا داخل المعاينة',!(await p.$('#content > .secNav')));
 // ---------- رقم الإصدار ----------
 const ver=await p.evaluate(()=>({btn:document.getElementById('verBtn')?.textContent,meta:document.querySelector('meta[name="application-version"]').content,vis:!!document.getElementById('verBtn')?.offsetParent}));
 ok('رقم الإصدار ظاهر في الشريط العلوي',ver.vis&&ver.btn==='v'+ver.meta,ver);
 await p.evaluate(()=>{document.getElementById('modal').innerHTML='';goToTab('home')});await p.waitForTimeout(300);
 await p.click('#verBtn');await p.waitForTimeout(300);
 ok('نافذة «عن التطبيق»: الإصدار الحالي وما الجديد',await p.evaluate(v=>{const s=document.querySelector('.aboutSheet');return !!s&&s.innerText.includes('v'+v)&&!!s.querySelector('.aboutNotes section.cur li')},ver.meta));
 ok('زر «التحقق من وجود تحديث»',!!(await p.$('#abUpd')));
 await p.click('#abOk');
 ok('لا أخطاء (التنقل)',p.errs.length===0,p.errs);
 // الهاتف
 const q=await device(b,base,390,844);
 const qt=await q.evaluate(()=>({vis:[...document.querySelectorAll('#tabs .tab')].filter(x=>getComputedStyle(x).display!=='none').length,more:!!document.getElementById('tabMoreBtn'),ver:!!document.getElementById('verBtn')?.offsetParent}));
 ok('الهاتف: أربعة أزرار بلا «المزيد» ورقم الإصدار ظاهر',qt.vis===4&&!qt.more&&qt.ver,qt);
 await q.click('#tabs [data-group="students"]');await q.waitForTimeout(400);
 ok('الهاتف: شريط الأقسام بلا تمرير أفقي للصفحة',await q.evaluate(()=>!!document.querySelector('#content > .secNav')&&document.documentElement.scrollWidth<=innerWidth+1));
 await q.context().close();await p.context().close();
 // ---------- مزامنة المحاضرات بين جهازين ----------
 const A=await device(b,base),B=await device(b,base);
 await enableSync(A);await newLecture(A,'محاضرة من الآيباد');await A.waitForTimeout(3500);
 const cloud1=CLOUD.rows['room-1'];
 ok('حفظ محاضرة يرفعها إلى السحابة تلقائيًا',!!cloud1&&JSON.stringify(cloud1.payload.lectureSync||{}).includes('محاضرة من الآيباد'),cloud1&&Object.keys(cloud1.payload));
 ok('الرأس والتذييل والفصول ضمن المزامنة',!!cloud1&&Array.isArray(cloud1.payload.lectureSync.data['masar-education-v1-projects']));
 await enableSync(B);const before=await titles(B);await B.evaluate(()=>syncPull(true));await B.waitForTimeout(600);
 const tb=await titles(B);ok('الجهاز الثاني يستلم المحاضرة',tb.includes('محاضرة من الآيباد'),[before,tb]);
 await newLecture(B,'محاضرة من الهاتف');await B.waitForTimeout(3500);
 ok('رفع الجهاز الثاني لا يمحو محاضرات الأول',(()=>{const L=CLOUD.rows['room-1'].payload.lectureSync.data['masar-education-v1-lectures'].map(x=>x.title);return L.includes('محاضرة من الآيباد')&&L.includes('محاضرة من الهاتف')})());
 await A.evaluate(()=>syncPull(true));await A.waitForTimeout(600);
 const ta=await titles(A);ok('الجهاز الأول يستلم محاضرة الثاني ويحتفظ بمحاضرته',ta.includes('محاضرة من الهاتف')&&ta.includes('محاضرة من الآيباد'),ta);
 // تعديل متزامن: الأحدث يفوز لكل محاضرة على حدة
 await A.evaluate(()=>{const L=window.MasarStorage.get('masar-education-v1-lectures',[]);return L.length});
 await goChapter(A);const idA=await A.evaluate(()=>window.MasarStorage.get('masar-education-v1-lectures',[]).find(l=>l.title==='محاضرة من الآيباد').id);
 await A.click('.openLecture[data-id="'+idA+'"]');await A.waitForTimeout(800);
 await A.evaluate(()=>{const e=document.getElementById('lecTitle');document.querySelector('.lectureInfoDetails').open=true;e.value='محاضرة من الآيباد (معدلة)';e.dispatchEvent(new Event('input'))});
 await A.click('#saveLecture');await A.waitForTimeout(3500);
 await B.evaluate(()=>syncPull(true));await B.waitForTimeout(600);
 ok('التعديل على جهاز يصل إلى الآخر (الأحدث يفوز)',(await titles(B)).includes('محاضرة من الآيباد (معدلة)')&&!(await titles(B)).includes('محاضرة من الآيباد'),await titles(B));
 // الحذف لا يعود من جهاز آخر
 await goChapter(B);const idB=await B.evaluate(()=>window.MasarStorage.get('masar-education-v1-lectures',[]).find(l=>l.title==='محاضرة من الهاتف').id);
 await B.click('[data-del="'+idB+'"]');await B.waitForTimeout(3500);
 await A.evaluate(()=>syncPull(true));await A.waitForTimeout(600);
 ok('حذف محاضرة على جهاز يحذفها من الآخر',!(await titles(A)).includes('محاضرة من الهاتف'),await titles(A));
 await A.evaluate(()=>scheduleSync());await A.waitForTimeout(3500);await B.evaluate(()=>syncPull(true));await B.waitForTimeout(600);
 ok('المحذوفة لا تعود عند رفع الجهاز الآخر',!(await titles(B)).includes('محاضرة من الهاتف'),await titles(B));
 // المحرر المفتوح لا يُغلق بسبب مزامنة في الخلفية
 await goChapter(A);await A.click('.openLecture[data-id="'+idA+'"]');await A.waitForTimeout(800);
 await newLecture(B,'ثالثة');await B.waitForTimeout(3500);
 await A.evaluate(()=>syncPull(true));await A.waitForTimeout(700);
 ok('مزامنة أثناء التحرير لا تُغلق المحرر وتستلم الجديد',!!(await A.$('.lectureEditor'))&&(await titles(A)).includes('ثالثة'));
 ok('لا أخطاء (المزامنة)',A.errs.length===0&&B.errs.length===0,[A.errs,B.errs]);
}finally{await b.close();server.close()}
console.log('\nv2.16.0 nav/sync/version: '+pass+' PASS, '+fail+' FAIL');process.exit(fail?1:0)})();
