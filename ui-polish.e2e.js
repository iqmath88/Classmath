// نيبور كلاس v2.16.1 — القائمة الجانبية لا تغطي الشريط العلوي (التطبيق المثبّت)، تنبيه واحد في الرئيسية، صفحات «لا يوجد طلبة»، توحيد الاسم.
// node ui-polish.e2e.js
const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const ROOT=__dirname;const TYPES={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.woff':'font/woff','.woff2':'font/woff2','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p==='/')p='/index.html';const f=path.join(ROOT,p);if(!f.startsWith(ROOT)||!fs.existsSync(f)){r.writeHead(404);return r.end()}r.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r)});
let pass=0,fail=0;const ok=(n,c,i)=>{if(c){pass++;console.log('PASS',n)}else{fail++;console.log('FAIL',n,i===undefined?'':JSON.stringify(i))}};
async function boot(b,base,w,h){const p=await b.newPage({viewport:{width:w,height:h}});p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));p.on('dialog',d=>d.accept());await p.goto(base+'/index.html');await p.waitForTimeout(1400);if(await p.$('#swSkip'))await p.click('#swSkip');await p.waitForTimeout(200);return p}
const geo=p=>p.evaluate(()=>{const t=document.querySelector('header.top').getBoundingClientRect(),n=document.getElementById('tabs').getBoundingClientRect(),c=document.getElementById('content').getBoundingClientRect();return {hb:t.bottom,nt:n.top,nw:n.width,cr:c.right,nl:n.left}});
(async()=>{await new Promise(r=>server.listen(0,r));const base='http://localhost:'+server.address().port;const b=await chromium.launch();
try{
 for(const [w,h] of [[1376,1032],[1180,820],[1024,1366]]){const p=await boot(b,base,w,h);
  let g=await geo(p);ok('آيباد '+w+'×'+h+': القائمة تحت الشريط العلوي وبجانب المحتوى',g.nt>=g.hb+4&&g.cr<=g.nl+1&&g.nw<=100,g);
  // محاكاة شريط الساعة في التطبيق المثبّت (ارتفاع إضافي كبير للشريط العلوي)
  await p.addStyleTag({content:'html .top{padding-top:70px!important}'});await p.waitForTimeout(300);
  g=await geo(p);ok('آيباد '+w+'×'+h+': مع شريط علوي أطول (التطبيق المثبّت) لا تغطيه القائمة',g.nt>=g.hb+4,g);
  await p.close()}
 const p=await boot(b,base,1376,1032);
 // الرئيسية بلا أي بيانات: «ابدأ بإضافة طلبتك» وحده
 let hm=await p.evaluate(()=>({empty:!!document.getElementById('emptyAddStudent'),acct:!!document.getElementById('homeAcctNotice'),bk:!!document.getElementById('backupBanner'),stats:getComputedStyle(document.querySelector('.statRow')).display,lessons:getComputedStyle(document.querySelector('.homeLessons')).display}));
 ok('بلا طلبة: تنبيه واحد «ابدأ بإضافة طلبتك» فقط',hm.empty&&!hm.acct&&!hm.bk,hm);
 ok('بلا طلبة: لا مربعات أرقام صفرية',hm.stats==='none',hm);
 ok('بلا حصص اليوم: لا قسم «حصص اليوم» مكرر',hm.lessons==='none',hm);
 // وجود محاضرات بلا نسخة احتياطية: تنبيه النسخة وحده
 await p.evaluate(()=>{window.MasarStorage.set('masar-education-v1-lectures',[{id:'x1',title:'م',blocks:[]}]);S.settings.lastBackupAt=null;S.settings.backupSnoozeUntil=null;render()});
 hm=await p.evaluate(()=>({empty:!!document.getElementById('emptyAddStudent'),acct:!!document.getElementById('homeAcctNotice'),bk:!!document.getElementById('backupBanner')}));
 ok('مع محاضرات وبلا نسخة احتياطية: تنبيه النسخة وحده',hm.bk&&!hm.empty&&!hm.acct,hm);
 // صفحات «لا يوجد طلبة»
 for(const [t,title] of [['attendance','تسجيل الحضور'],['payments','الأقساط']]){await p.evaluate(x=>goToTab(x),t);await p.waitForTimeout(300);
  const r=await p.evaluate(()=>({card:!!document.querySelector('.noStuCard'),filters:!!document.querySelector('#content select'),reports:!!document.getElementById('moRep'),sec:!!document.querySelector('#content > .secNav'),h:document.querySelector('#content h2')?.textContent||''}));
  ok('«'+title+'» بلا طلبة: بطاقة واضحة بلا فلاتر ولا أزرار تقارير، وشريط الأقسام باقٍ',r.card&&!r.filters&&!r.reports&&r.sec&&r.h.includes(title),r)}
 await p.click('#nsAdd');await p.waitForTimeout(500);ok('زر «إضافة طالب» يفتح نموذج الطالب في قسم الطلبة',await p.evaluate(()=>S.tab==='students'&&!!document.querySelector('#modal .sheet')));
 await p.evaluate(()=>{document.getElementById('modal').innerHTML='';S.students=[{id:'s1',name:'علي حسن',grade:S.settings.grades?.[0]||'السادس إعدادي',section:'أ',gender:'ذكر',status:'مستمر'}];save.students();goToTab('attendance')});await p.waitForTimeout(400);
 ok('مع وجود طلبة: صفحة الحضور العادية',await p.evaluate(()=>!!document.getElementById('aDate')&&!document.querySelector('.noStuCard')));
 await p.evaluate(()=>goToTab('home'));await p.waitForTimeout(300);
 ok('مع وجود طلبة: مربعات الأرقام ظاهرة',await p.evaluate(()=>getComputedStyle(document.querySelector('.statRow')).display!=='none'));
 // الاسم موحّد
 await p.evaluate(()=>goToTab('settings'));await p.waitForTimeout(400);
 ok('أسفل الإعدادات: «نيبور كلاس» لا «مسار»',await p.evaluate(()=>{const t=document.getElementById('content').innerText;return t.includes('نيبور كلاس')&&!/(^|\n)\s*مسار\s*(\n|$)/.test(t)}));
 ok('لا أخطاء JavaScript',p.errs.length===0,p.errs);
}finally{await b.close();server.close()}
console.log('\nv2.16.1 ui polish: '+pass+' PASS, '+fail+' FAIL');process.exit(fail?1:0)})();
