/* ============ أدوات ============ */
let toastT;
function toast(m){const b=document.getElementById("toastBox");b.innerHTML='<div class="toast">'+esc(m)+'</div>';clearTimeout(toastT);toastT=setTimeout(()=>b.innerHTML="",1800)}
function el(id){return document.getElementById(id)}

/* ============ التنقل ============ */
// v2.14.0: ترتيب الأقسام حسب الاستخدام اليومي — في الصف (الحضور، التقييم، الطلبة) ثم التحضير (المحاضرات، التدريس) ثم الإدارة
const TABS=[["home","الرئيسية","home"],["attendance","الحضور","check"],["evaluation","التقييم","percent"],["students","الطلبة","users"],["lectures","المحاضرات","book"],["teaching","التدريس","pen"],["payments","الأقساط","wallet"],["settings","الإعدادات","settings"]];
const TAB_GROUP_START={lectures:1,payments:1};
const PHONE_MAIN=["home","attendance","evaluation","lectures"];
const TAB_PARENT={stats:"evaluation",homework:"evaluation",grades:"evaluation"};
// v2.16.0: أربعة أزرار فقط — الرئيسية، شؤون الطلبة، شؤون التدريسي، الإعدادات — وداخل كل مجموعة شريط أقسام
const NAV_GROUPS={
  students:{label:"شؤون الطلبة",icon:"users",tabs:["attendance","evaluation","students","payments"]},
  teaching:{label:"شؤون التدريسي",icon:"book",tabs:["lectures","teaching"]}
};
const TOP_NAV=["home","g:students","g:teaching","settings"];
function tabLabel(k){return (TABS.find(t=>t[0]===k)||[,k])[1]}
function tabIcon(k){return (TABS.find(t=>t[0]===k)||[,,"home"])[2]}
function groupOf(tab){const t=TAB_PARENT[tab]||tab;for(const g in NAV_GROUPS)if(NAV_GROUPS[g].tabs.includes(t))return g;return null}
function groupLast(g){let t=null;try{t=localStorage.getItem("nibor-sec-"+g)}catch(_){}return NAV_GROUPS[g].tabs.includes(t)?t:NAV_GROUPS[g].tabs[0]}
function openGroup(g){if(groupOf(S.tab)===g)return;goToTab(groupLast(g))}
function secNavHTML(){
  const g=groupOf(S.tab);if(!g)return "";const cur=TAB_PARENT[S.tab]||S.tab;const G=NAV_GROUPS[g];
  return '<nav class="secNav" role="tablist" aria-label="'+G.label+'" data-group="'+g+'"><span class="secNavHead">'+G.label+'</span>'+G.tabs.map(k=>'<button type="button" role="tab" class="secTab'+(cur===k?" on":"")+'" aria-selected="'+(cur===k)+'" data-sec="'+k+'">'+(window.ICON?ICON(tabIcon(k)):"")+'<span>'+tabLabel(k)+'</span></button>').join("")+'</nav>';
}
function injectSecNav(){
  const g=groupOf(S.tab);const c=el("content");if(!g||!c||document.body.classList.contains("inLectureEditor")||c.querySelector(":scope > .previewShell, :scope > .lectureEditor, :scope > .loading"))return;
  try{localStorage.setItem("nibor-sec-"+g,TAB_PARENT[S.tab]||S.tab)}catch(_){}
  if(c.querySelector(":scope > .secNav"))return;
  c.insertAdjacentHTML("afterbegin",secNavHTML());
  c.querySelectorAll(":scope > .secNav [data-sec]").forEach(b=>b.onclick=()=>{if((TAB_PARENT[S.tab]||S.tab)!==b.dataset.sec)goToTab(b.dataset.sec)});
}
// الأقسام تعيد رسم نفسها مباشرة في مواضع كثيرة؛ هذا يعيد شريط الأقسام كلما اختفى
if(!window.__secNavObs){window.__secNavObs=true;const c=document.getElementById("content");if(c)new MutationObserver(()=>{if(!c.querySelector(":scope > .secNav"))injectSecNav()}).observe(c,{childList:true})}
/* v2.16.1: صفحة واضحة حين لا يوجد طلبة أصلًا (بدل الفلاتر وأزرار التقارير الفارغة) */
function hasActiveStudents(){return VIS().some(s=>(s.status||"مستمر")==="مستمر")}
function noStudentsPage(title,note){
  el("content").innerHTML='<h2 class="h">'+title+'</h2><div class="emptyCard noStuCard"><span class="emptyIc">'+ICON('userPlus')+'</span><div><b>لا يوجد طلبة بعد</b><p>'+note+'</p></div><div class="noStuActs"><button class="btn" id="nsAdd">إضافة طالب</button><button class="btn ghost" id="nsGo">الذهاب إلى الطلبة</button></div></div>';
  el("nsAdd").onclick=()=>{goToTab("students");openForm(null)};el("nsGo").onclick=()=>goToTab("students");
}
/* v2.16.1: القائمة الجانبية تبدأ تحت الشريط العلوي مهما كان ارتفاعه (شريط الساعة في التطبيق المثبّت يزيده) */
(function(){const set=()=>{const t=document.querySelector("header.top");if(!t)return;document.documentElement.style.setProperty("--hdr-h",Math.max(0,Math.round(t.getBoundingClientRect().height))+"px")};
  window.addEventListener("resize",set);window.addEventListener("orientationchange",()=>setTimeout(set,350));
  const t=document.querySelector("header.top");if(t&&window.ResizeObserver)new ResizeObserver(set).observe(t,{box:"border-box"});set();setTimeout(set,1200)})();
/* v2.16.0: رقم الإصدار ظاهر في الشريط العلوي، ونافذة «عن التطبيق» بما الجديد */
const RELEASE_NOTES=[
  ["2.18.1",["النموذج الوزاري برأس رسمي واحد (أُزيل الرأس الزخرفي المكرر)، وبنمط الورقة الوزارية: «س1 : A- …» بالأسود والأبيض في صفحة واحدة"]],
  ["2.18.0",["قوالب المحاضرة: شرح درس، حل تمارين، مراجعة فصل، ورقة عمل — و«حفظ كقالب» لقوالبك","قالب الملزمة: فصل جاهز بمحاضراته ومراجعته","قوالب الامتحان: النموذج الوزاري (أجب عن خمسة، فروع A/B/C، رأس اللجنة الدائمة)، نصف السنة، شهري، يومي","ورقة الامتحان تعرض الصف والمادة والوقت واسم الطالب (كانت تُهمل)"]],
  ["2.17.1",["إصلاح PDF الأفقي: كان يُقطَّع ويزيد عدد صفحاته عن المعاينة","بنك الأسئلة: بحث نصي، وعرض نص السؤال لا رموز HTML، ومنع التكرار، وحفظ الفروع والحل النموذجي مع السؤال","حماية المحاضرة المفتوحة في نافذتين، وحماية الحفظ عند إغلاق التطبيق فجأة","استعادة نسخة احتياطية قديمة لم تعد تُلغى بصمت عند المزامنة"]],
  ["2.17.0",["مؤشر حفظ في الشريط العلوي: «جارِ الحفظ» / «تم الحفظ» / «فشل الحفظ» بعد الكتابة الدائمة فعلًا","تعارض المزامنة: حين تُعدَّل المحاضرة نفسها على جهازين تُحفظ النسختان مع إشعار، ولا يعتمد ذلك على ساعة الجهاز","إعادة محاولة الرفع تلقائيًا بعد انقطاع الإنترنت","تبويبان مفتوحان لا يكتب أحدهما فوق الآخر","مسودة الامتحان تُحفظ فورًا عند الإغلاق"]],
  ["2.16.2",["فتح أسرع: الملفات تُقرأ من الجهاز، وعلى الإنترنت البطيء يفتح التطبيق من النسخة المخزّنة خلال ثانيتين ونصف"]],
  ["2.16.1",["القائمة الجانبية لا تغطي الشريط العلوي على الآيباد، وصارت أضيق ليتسع المحتوى","شريط علوي أقصر وتنبيه واحد فقط في الرئيسية","صفحة واضحة «لا يوجد طلبة بعد» في الحضور والأقساط"]],
  ["2.16.0",["قائمتان بدل ثمانية أقسام: «شؤون الطلبة» و«شؤون التدريسي»","مزامنة المحاضرات والملازم سحابيًا بين الأجهزة","رقم الإصدار ظاهر في التطبيق"]],
  ["2.15.0",["نسخة الطالب (بلا حلول) ونسخة الأستاذ (مع الحلول) للمحاضرة والملزمة"]],
  ["2.14.0",["فحص شامل للتطبيق وإعادة ترتيب القوائم"]],
  ["2.13.1",["حماية العمل من الإغلاق المفاجئ أثناء التحرير"]]
];
function renderVersionBadge(){
  if(el("verBtn"))return;const host=document.querySelector(".top .appMiniName")||document.querySelector(".top .school");if(!host)return;
  host.insertAdjacentHTML("beforeend",'<button type="button" id="verBtn" class="appVer" title="عن التطبيق وما الجديد">v'+APP_VER+'</button>');
  host.insertAdjacentHTML("beforeend",'<span id="saveState" class="saveState" role="status" aria-live="polite" hidden></span>');initSaveState();
  el("verBtn").onclick=openAboutSheet;
  let seen=null;try{seen=localStorage.getItem("nibor-seen-ver");localStorage.setItem("nibor-seen-ver",APP_VER)}catch(_){}
  if(seen&&seen!==APP_VER)setTimeout(()=>toast("تم التحديث إلى الإصدار v"+APP_VER+" — اضغط رقم الإصدار لمعرفة الجديد"),1200);
}
/* v2.17.0: مؤشر حالة الحفظ — «جارِ الحفظ» / «تم الحفظ» / «فشل الحفظ»، مبني على اكتمال الكتابة الدائمة فعلًا */
function initSaveState(){
  if(window.__saveStateInit)return;window.__saveStateInit=true;
  let showT=0,hideT=0,failed=false;const box=()=>el("saveState");
  const set=(cls,txt)=>{const b=box();if(!b)return;b.hidden=false;b.className="saveState "+cls;b.textContent=txt};
  window.addEventListener("masar:storage-pending",()=>{if(failed)return;clearTimeout(hideT);clearTimeout(showT);showT=setTimeout(()=>set("busy","جارِ الحفظ…"),400)});
  window.addEventListener("masar:storage-saved",e=>{clearTimeout(showT);const b=box();if(e.detail&&e.detail.pending)return;
    const wasVisible=b&&!b.hidden;if(failed||wasVisible){failed=false;set("ok","تم الحفظ ✓");clearTimeout(hideT);hideT=setTimeout(()=>{const x=box();if(x)x.hidden=true},1800)}});
  window.addEventListener("masar:storage-error",e=>{failed=true;clearTimeout(showT);clearTimeout(hideT);const q=e.detail&&/quota|QuotaExceeded/i.test(String(e.detail.name||e.detail.message||e.detail));
    set("bad",q?"⚠️ فشل الحفظ: المساحة ممتلئة":"⚠️ فشل الحفظ — إعادة المحاولة…");
    const b=box();if(b)b.onclick=()=>{toast(q?"مساحة التخزين ممتلئة — احفظ نسخة احتياطية واحذف صورًا كبيرة":"ستُعاد المحاولة تلقائيًا. لا تغلق التطبيق، واحفظ نسخة احتياطية إن تكرر");try{window.MasarDB&&window.MasarDB.flush()}catch(_){}}});
  // تنبيه قبل إغلاق الصفحة إن بقيت كتابات معلقة
  window.addEventListener("beforeunload",e=>{try{if(window.MasarDB&&window.MasarDB.pendingCount>0){window.MasarDB.flush();e.preventDefault();e.returnValue=""}}catch(_){}});
}
function openAboutSheet(){
  el("modal").innerHTML='<div class="overlay"><div class="sheet aboutSheet"><div class="sheetHead"><h3>نيبور كلاس</h3><button class="x" id="abX">✕</button></div>'+
    '<div class="aboutVer"><img src="icon-192.png" alt="" width="56" height="56"><div><b>الإصدار v'+APP_VER+'</b><small>منصة المعلم للمحاضرات والطلبة والاختبارات</small></div></div>'+
    '<div class="aboutNotes">'+RELEASE_NOTES.map(([v,items],i)=>'<section class="'+(v===APP_VER?"cur":"")+'"><h4>v'+v+(v===APP_VER?' <em>الحالي</em>':'')+'</h4><ul>'+items.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul></section>').join("")+'</div>'+
    '<div class="actions"><button class="btn ghost" id="abUpd">التحقق من وجود تحديث</button><button class="btn" id="abOk">تم</button></div></div></div>';
  el("abX").onclick=closeModal;el("abOk").onclick=closeModal;
  el("abUpd").onclick=async()=>{try{const r=navigator.serviceWorker&&await navigator.serviceWorker.getRegistration();if(r){await r.update();toast(r.waiting||r.installing?"يوجد تحديث جديد — سيُطبَّق عند إعادة الفتح":"لديك أحدث إصدار ✓")}else toast("لديك الإصدار v"+APP_VER)}catch(_){toast("تعذر التحقق — تأكد من الاتصال")}};
}
// قوائم «طباعة ▾» و«إرسال ▾»: تُغلق بعد الاختيار أو بالضغط خارجها
if(!window.__actMenus){window.__actMenus=true;document.addEventListener("click",e=>{document.querySelectorAll("details.actMenu[open]").forEach(d=>{if(!d.contains(e.target)||e.target.closest(".actMenuList button"))setTimeout(()=>d.removeAttribute("open"),0)})})}
function renderTabs(){
  const cur=TAB_PARENT[S.tab]||S.tab;const g=groupOf(S.tab);
  el("tabs").innerHTML=TOP_NAV.map(k=>{
    if(k.startsWith("g:")){const id=k.slice(2),G=NAV_GROUPS[id];return '<button class="tab tabGroup'+(g===id?" on":"")+'" data-group="'+id+'" aria-label="'+G.label+'"><span class="ticon">'+(window.ICON?ICON(G.icon):"")+'</span><span class="tlabel">'+G.label+'</span></button>'}
    return '<button class="tab'+(cur===k?" on":"")+'" data-tab="'+k+'" aria-label="'+tabLabel(k)+'"><span class="ticon">'+(window.ICON?ICON(tabIcon(k)):"")+'</span><span class="tlabel">'+tabLabel(k)+'</span></button>'}).join("");
  el("tabs").querySelectorAll(".tab[data-tab]").forEach(b=>b.onclick=()=>{goToTab(b.dataset.tab)});
  el("tabs").querySelectorAll(".tab[data-group]").forEach(b=>b.onclick=()=>openGroup(b.dataset.group));
  renderVersionBadge();
}
// على الهاتف: أربعة أقسام رئيسية + «المزيد» (الطلبة، التدريس، الأقساط، الإعدادات)
function openMoreTabs(){
  const items=TABS.filter(t=>!PHONE_MAIN.includes(t[0]));
  el("modal").innerHTML='<div class="overlay"><div class="sheet moreSheet"><div class="sheetHead"><h3>المزيد</h3><button class="x" id="moreX">✕</button></div><div class="moreGrid">'+
    items.map(([k,l,i])=>'<button class="moreItem'+(S.tab===k?" on":"")+'" data-more-tab="'+k+'"><span class="ticon">'+(window.ICON?ICON(i):i)+'</span><span>'+l+'</span></button>').join("")+'</div></div></div>';
  el("moreX").onclick=closeModal;
  el("modal").querySelectorAll("[data-more-tab]").forEach(b=>b.onclick=()=>{const t=b.dataset.moreTab;closeModal();setTimeout(()=>goToTab(t),30)});
}
// v2.14.0: الصف الافتراضي في الحضور والتقييم والواجبات والخطة/الأقساط: صف حصة اليوم، أو الصف الأكثر طلبة — لا «الأول متوسط» الفارغ
function classCount(g,s){return VIS().filter(x=>x.grade===g&&x.section===s&&(x.status||"مستمر")==="مستمر").length}
function bestClass(){
  const now=new Date().getDay();
  const today=TT_VIS().filter(x=>x.day===now).sort((a,b)=>(parseInt(a.period)||0)-(parseInt(b.period)||0));
  for(const l of today){if(classCount(l.grade,l.section))return [l.grade,l.section]}
  const m=new Map();VIS().forEach(x=>{if((x.status||"مستمر")!=="مستمر")return;const k=x.grade+"|"+x.section;m.set(k,(m.get(k)||0)+1)});
  let best=null,n=0;m.forEach((c,k)=>{if(c>n){n=c;best=k}});return best?best.split("|"):null;
}
function fixFilterState(){
  const effInst=S.curInst||INSTS()[0];
  const grades=gradesFor(effInst);
  const sections=secList(effInst);
  if(!grades.includes(S.aGrade))S.aGrade=grades[0];
  if(!sections.includes(S.aSection))S.aSection=sections[0];
  if(!grades.includes(S.gGrade))S.gGrade=grades[0];
  if(!sections.includes(S.gSection))S.gSection=sections[0];
  if(!grades.includes(S.hGrade))S.hGrade=grades[0];
  if(!sections.includes(S.hSection))S.hSection=sections[0];
  if(!grades.includes(S.pGrade))S.pGrade=grades[0];
  if(!sections.includes(S.pSection))S.pSection=sections[0];
  if(S.fg&&!grades.includes(S.fg))S.fg="";
  if(S.fs&&!sections.includes(S.fs))S.fs="";
  let bc;const pick=()=>{if(bc===undefined)bc=bestClass();return bc&&grades.includes(bc[0])&&sections.includes(bc[1])?bc:null};
  [["aGrade","aSection"],["gGrade","gSection"],["hGrade","hSection"],["pGrade","pSection"]].forEach(([G,Sc])=>{if(!classCount(S[G],S[Sc])){const b=pick();if(b){S[G]=b[0];S[Sc]=b[1]}}});
}
function render(){
  if(S.tab!=="lectures")document.body.classList.remove("editorFocus","inLectureEditor","pvActive");
  fixFilterState();
  renderTabs();
  el("fabBox").innerHTML="";
  if(S.tab==="home")renderHome();
  else if(S.tab==="lectures")renderLectures();
  else if(S.tab==="students")renderStudents();
  else if(S.tab==="attendance")renderAttendance();
  else if(S.tab==="payments")renderPayments();
  else if(S.tab==="evaluation")renderEvaluation();
  else if(S.tab==="teaching")renderTeaching();
  else if(S.tab==="homework")renderHomework();
  else if(S.tab==="grades")renderGrades();
  else if(S.tab==="stats")renderStatsPage();
  else if(S.tab==="settings")renderSettings();
  else renderHome();
  injectSecNav();
}

/* ============ الرئيسية ============ */
/* v2.9.4: حماية البيانات — تذكير النسخ الاحتياطي يشمل المحاضرات والامتحانات، وتنبيه تثبيت التطبيق على iPad/iPhone */
const BACKUP_REMIND_DAYS=7,BACKUP_SNOOZE_DAYS=3;
function lectureCount(){try{const a=window.MasarStorage?window.MasarStorage.get("masar-education-v1-lectures",[]):[];return Array.isArray(a)?a.length:0}catch(_){return 0}}
function hasUserData(){return (S.students||[]).length>0||lectureCount()>0||(S.exams||[]).length>0}
function daysSinceBackup(){const at=S.settings.lastBackupAt||S.settings.lastBackup;if(!at)return null;const t=new Date(at).getTime();if(!isFinite(t))return null;return Math.max(0,Math.floor((Date.now()-t)/86400000))}
function isAppleTouch(){try{const ua=navigator.userAgent||"";return /iPad|iPhone|iPod/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1)}catch(_){return false}}
function localPref(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(_){return null}}
function backupDue(){if(!hasUserData())return false;const d=daysSinceBackup();if(d!==null&&d<BACKUP_REMIND_DAYS)return false;const sn=S.settings.backupSnoozeUntil;return !(sn&&Date.now()<new Date(sn).getTime())}
function installHintDue(){return isAppleTouch()&&!isStandaloneApp()&&hasUserData()&&localPref("nibor-install-hint")!=="done"}
function backupBanner(){
  const out=[];
  const inst=installHintDue();
  if(backupDue()&&!inst){const d=daysSinceBackup();
    out.push('<div class="safeBanner" id="backupBanner"><span class="sbIc">'+ICON("alert")+'</span><div class="sbText"><b>'+(d===null?"لم تحفظ نسخة احتياطية بعد":"مرّ "+d+" "+(d>=3&&d<=10?"أيام":"يومًا")+" على آخر نسخة احتياطية")+'</b><small>طلبتك ومحاضراتك محفوظة على هذا الجهاز فقط. احفظ نسخة في «الملفات» أو iCloud حتى لا تضيع إذا ضاع الجهاز أو مُسحت بيانات المتصفح.</small></div><div class="sbActs"><button class="btn" id="bkNow">'+ICON("clipboard")+'<span>نسخة احتياطية الآن</span></button><button class="btn ghost" id="bkLater">لاحقًا</button></div></div>');}
  if(inst)out.push('<div class="safeBanner info" id="installBanner"><span class="sbIc">'+ICON("pin")+'</span><div class="sbText"><b>ثبّت نيبور كلاس على الشاشة الرئيسية</b><small>سفاري قد يحذف بيانات المواقع التي لا تُفتح لعدة أيام، والتطبيق المثبّت محمي من ذلك. انتبه: التطبيق المثبّت يبدأ فارغًا، فاحفظ نسخة احتياطية أولًا، ثم من زر المشاركة اختر «إضافة إلى الشاشة الرئيسية»، وافتح التطبيق الجديد واستورد النسخة من الإعدادات.</small></div><div class="sbActs"><button class="btn" id="instBackup">'+ICON("clipboard")+'<span>احفظ نسخة أولًا</span></button><button class="btn ghost" id="instDone">فهمت</button></div></div>');
  return out.join("");
}
function bindBackupBanner(){
  el("bkNow")&&(el("bkNow").onclick=()=>openBackupSheet());
  el("bkLater")&&(el("bkLater").onclick=()=>{S.settings.backupSnoozeUntil=new Date(Date.now()+BACKUP_SNOOZE_DAYS*86400000).toISOString();save.settings();el("backupBanner")?.remove();toast("سنذكّرك بعد "+BACKUP_SNOOZE_DAYS+" أيام")});
  el("instBackup")&&(el("instBackup").onclick=()=>openBackupSheet());
  el("instDone")&&(el("instDone").onclick=()=>{localPref("nibor-install-hint","done");el("installBanner")?.remove()});
}
/* v2.8.12: حصص المؤسسة الحالية فقط (أو كل المؤسسات إذا لم تُختر واحدة) */
function TT_VIS(){const def=INSTS()[0];return S.curInst?S.timetable.filter(t=>(t.inst||def)===S.curInst):S.timetable}
/* v2.8.14: عدّ عربي سليم للحصص */
function lessonsCountAr(n){if(n===0)return 'لا حصص اليوم';if(n===1)return 'لديك اليوم <b>1</b> حصة';if(n===2)return 'لديك اليوم <b>حصتان</b>';if(n<=10)return 'لديك اليوم <b>'+n+'</b> حصص';return 'لديك اليوم <b>'+n+'</b> حصة'}
function briefLines(){
  const today=new Date().getDay();
  const lessonsToday=TT_VIS().filter(t=>t.day===today).length;
  const pendingStudents=new Set();
  hwFollowups().forEach(hw=>hw._pending.forEach(s=>pendingStudents.add(s.id)));
  const active=VIS().filter(s=>s.status==="مستمر");
  const lastVals=active.map(s=>lastVal((S.grades[s.id]||{})[MYSUB()]||{},s.grade)).filter(v=>v!==null);
  const avgAll=lastVals.length?Math.round(lastVals.reduce((a,b)=>a+b,0)/lastVals.length):null;
  const improved=active.map(s=>({s,t:trendOf((S.grades[s.id]||{})[MYSUB()]||{},s.grade)})).filter(x=>x.t!==null&&x.t>0).sort((a,b)=>b.t-a.t)[0];
  const lines=lessonsToday?[lessonsCountAr(lessonsToday)+'.']:[];
  if(pendingStudents.size>0)lines.push('<b>'+pendingStudents.size+'</b> طالب لم يسلّموا واجبات مستحقة.');
  if(avgAll!==null)lines.push('متوسط آخر الدرجات المرصودة: <b>'+avgAll+'</b>.');
  if(improved)lines.push('الأكثر تحسنًا: <b>'+esc(improved.s.name)+'</b> (+'+improved.t+').');
  return lines;
}
function morningBriefHTML(){const l=briefLines();return l.length?'<ul class="briefList">'+l.map(x=>'<li>'+x+'</li>').join("")+'</ul>':''}
/* v2.8.14: بطاقة «الآن» — الحصة الحالية/التالية حسب أوقات الحصص */
function toMin(hm){const m=String(hm||'').match(/^(\d{1,2}):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):null}
function nowStatus(lessons){
  lessons=lessons.slice().sort((a,b)=>((a.shift||"صباحي")===(b.shift||"صباحي")?a.period-b.period:((a.shift||"صباحي")==="صباحي"?-1:1)));
  if(!lessons.length)return {title:'لا حصص اليوم',sub:'يوم هادئ — راجع الواجبات أو حضّر محاضرتك القادمة.'};
  const now=new Date(),cur=now.getHours()*60+now.getMinutes();
  const withT=lessons.map(t=>{const pt=periodTime(t.period,t.shift||"صباحي")||{};return {t,s:toMin(pt.start),e:toMin(pt.end),pt}});
  const timed=withT.filter(x=>x.s!=null&&x.e!=null);
  const who=x=>esc(x.t.grade)+' — '+esc(secTerm(x.t.inst||S.curInst))+' '+esc(x.t.section);
  if(timed.length){
    const c=timed.find(x=>x.s<=cur&&cur<x.e);if(c)return {title:'الآن: الحصة '+c.t.period,sub:who(c)+' · حتى '+esc(c.pt.end),live:true};
    const n=timed.filter(x=>x.s>cur).sort((a,b)=>a.s-b.s)[0];if(n)return {title:'التالية: الحصة '+n.t.period,sub:who(n)+' · تبدأ '+esc(n.pt.start)};
    if(timed.length===lessons.length)return {title:'انتهت حصص اليوم',sub:lessons.length+' '+(lessons.length===1?'حصة':lessons.length===2?'حصتان':'حصص')+' اليوم — لا تنسَ تسجيل الحضور إن لم تسجّله.'};
  }
  const f=withT[0];return {title:lessons.length===1?'حصة واحدة اليوم':(lessons.length===2?'حصتان اليوم':lessons.length+' حصص اليوم'),sub:'أولها الحصة '+f.t.period+': '+who(f)};
}
function nowCardHTML(lessons){
  const h=new Date().getHours();const greeting=h<12?"صباح الخير":"مساء الخير";
  const name=esc((S.settings.teacher||"").split(" ")[0]||"");const st=nowStatus(lessons);
  const d=new Date();const clock=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  let dateStr=DAYS[d.getDay()];try{dateStr+=' · '+d.toLocaleDateString('ar-IQ-u-nu-latn',{day:'numeric',month:'long'})}catch(_){}
  return '<section class="nowCard'+(st.live?' isLive':'')+'">'+
    '<div class="nowMain"><span class="nowEyebrow">✦ '+greeting+(name?' يا أستاذ '+name:' يا أستاذ')+'</span>'+
      '<h2 class="nowTitle">'+(st.live?'<span class="liveDot"></span>':'')+st.title+'</h2><p class="nowSub">'+st.sub+'</p>'+morningBriefHTML()+'</div>'+
    '<div class="nowSide"><div class="nowClock">'+clock+'</div><div class="nowDate">'+dateStr+'</div>'+
      '<div class="nowActions"><button class="btn" id="nowAtt">'+ICON('check')+'<span>تسجيل الحضور</span></button><button class="btn ghost" id="ttBtn">'+ICON('calendar')+'<span>جدول الحصص</span></button></div></div>'+
  '</section>';
}
function secH(icon,title,extra){return '<h3 class="h2 secH"><span class="secIc">'+ICON(icon)+'</span><span>'+title+'</span>'+(extra||'')+'</h3>'}
function qaCard(id,icon,title,sub){return '<button class="qaCard" id="'+id+'"><span class="qaTile">'+ICON(icon)+'</span><span class="qaText"><b>'+title+'</b><small>'+sub+'</small></span><span class="qaArrow">'+ICON('chevron')+'</span></button>'}
function statTile(icon,num,label,cls){return '<div class="stat'+(cls?' '+cls:'')+'"><span class="statIc">'+ICON(icon)+'</span><div><div class="statNum">'+num+'</div><div class="statLbl">'+label+'</div></div></div>'}
function renderHome(){
  const t=S.attendance[todayStr()]||{};
  const vals=Object.values(t);
  const present=vals.filter(v=>v==="حاضر").length, absent=vals.filter(v=>v==="غائب").length;
  const male=VIS().filter(s=>s.gender==="ذكر").length;
  const myGrades=gradesFor(S.curInst||INSTS()[0]);
  const max=Math.max(1,...myGrades.map(g=>VIS().filter(s=>s.grade===g).length));
  const todayLessons=TT_VIS().filter(x=>x.day===new Date().getDay());
  const attTakenToday=todayLessons.some(les=>{
    const list=VIS().filter(s=>s.grade===les.grade&&s.section===les.section);
    return list.some(s=>t[s.id]!==undefined);
  });
  // v2.16.1: تنبيه واحد فقط في كل مرة — النسخة الاحتياطية أولًا، ثم «ابدأ بإضافة طلبتك»، ثم تسجيل الدخول
  const bb=backupBanner(),noStu=VIS().length===0,showEmpty=noStu&&!bb,showAcct=!bb&&!noStu&&!(S.settings.sync&&S.settings.sync.userId);
  el("content").innerHTML=
    (canSave?"":'<div class="notice">⚠️ المتصفح مانع التخزين المحلي — البيانات ما تنحفظ تلقائياً. استخدم زر «نسخة احتياطية» قبل ما تسكّر، وزر «استيراد» حتى ترجّعها.</div>')+
    bb+
    nowCardHTML(todayLessons)+
    (todayLessons.length>0&&!attTakenToday?'<div class="notice warnNotice">'+ICON('clipboard')+' عندك حصص اليوم ولم تسجّل الحضور بعد — اضغط أي حصة أدناه لتسجيله.</div>':"")+
    '<div class="homeLessons"'+(todayLessons.length?'':' hidden')+'>'+secH('calendar','حصص اليوم — '+DAYS[new Date().getDay()])+
    '<div id="lessonsBox"></div></div>'+
    (showEmpty?'<div class="emptyCard"><span class="emptyIc">'+ICON('userPlus')+'</span><div><b>ابدأ بإضافة طلبتك</b><p>أضف أول طالب لتظهر هنا الإحصاءات وإنذارات الغياب والمتفوقون.</p></div><button class="btn" id="emptyAddStudent">إضافة طالب</button></div>':"")+
    '<div class="homeInsights"'+(VIS().length===0?' hidden':'')+'>'+
    secH('alert','إنذارات الغياب',' <span class="secExtra">الحد: <input id="absLim" class="limIn" inputmode="numeric" value="'+(S.settings.absLimit||5)+'"> أيام</span>')+
    '<div id="alertBox"></div>'+
    secH('trendDown','طلبة معرّضون للرسوب (دون 50)')+
    '<div id="riskBox"></div>'+
    '</div>'+
    secH('bolt','إجراءات سريعة')+
    '<div class="qaGrid quickActions">'+
      qaCard('qaAtt','check','تسجيل الحضور','حضور حصة اليوم بنقرة')+
      qaCard('qaAddStudent','userPlus','إضافة طالب','طالب جديد لأي شعبة')+
      qaCard('qaExam','exam','امتحان جديد','أنشئ واطبع امتحانًا')+
      qaCard('qaLecture','book','محاضرة جديدة','افتح المحاضرات وابدأ التأليف')+
    '</div>'+
    '<div class="statRow"'+(noStu?' hidden':'')+'>'+
      statTile('users',VIS().length,'إجمالي الطلبة','main')+
      statTile('user',male,'ذكور')+
      statTile('user',(VIS().length-male),'إناث')+
      statTile('check',present,'حاضر اليوم','ok')+
      statTile('alert',absent,'غائب اليوم','bad')+
    '</div>'+
    '<div class="homeInsights"'+(VIS().length===0?' hidden':'')+'>'+
    secH('star','الطلبة المتفوقون (90 فأكثر)')+
    '<div id="topBox"></div>'+
    secH('chart','الطلبة حسب الصف')+
    '<div class="bars">'+myGrades.map(g=>{
      const n=VIS().filter(s=>s.grade===g).length;
      return '<div class="barRow"><span>'+esc(g)+'</span><div class="barTrack"><div class="barFill" style="width:'+(n/max*100)+'%"></div></div><span class="barNum">'+n+'</span></div>';
    }).join("")+'</div>'+
    '</div>'+
    '<div id="hwFollowBox"></div>'+
    (showAcct?'<div class="notice" id="homeAcctNotice" style="cursor:pointer">'+ICON('user')+' لم تسجّل الدخول بحساب بعد — اضغط هنا لتسجيل الدخول أو إنشاء حسابك (معلم/طالب/ولي أمر)</div>':"");
  bindBackupBanner();
  el("absLim").onchange=e=>{
    const v=Math.max(1,parseInt(e.target.value)||5);
    e.target.value=v;S.settings.absLimit=v;save.settings();renderAlerts();
  };
  el("ttBtn").onclick=openTimetable;
  el("qaAtt").onclick=()=>goToTab("attendance");
  el("qaAddStudent").onclick=()=>{goToTab("students");openForm(null)};
  el("qaExam").onclick=()=>openExamBuilder();
  if(el("qaLecture"))el("qaLecture").onclick=()=>goToTab("lectures");
  el("nowAtt").onclick=()=>goToTab("attendance");
  if(el("emptyAddStudent"))el("emptyAddStudent").onclick=()=>{goToTab("students");openForm(null)};
  const homeAcctNotice=el("homeAcctNotice");
  if(homeAcctNotice)homeAcctNotice.onclick=openSyncSheet;
  renderLessons();
  renderAlerts();
  renderTopBox();
  renderRiskBox();
  renderHwFollow();
}
function renderTopBox(){
  const list=VIS().filter(s=>s.status==="مستمر").map(s=>{
    const rec=(S.grades[s.id]||{})[MYSUB()]||{};
    return {s,last:lastVal(rec,s.grade)};
  }).filter(x=>x.last!==null&&x.last>=90).sort((a,b)=>b.last-a.last);
  el("topBox").innerHTML=list.length===0?
    '<p class="empty">ما فيه طلبة وصلوا 90 بعد — تشجيعهم شوي 💪</p>':
    '<ul class="slist">'+list.map(({s,last})=>
      '<li class="srow" data-id="'+s.id+'">'+
        '<div class="sinfo"><div class="sname">'+esc(s.name)+'</div>'+
        '<div class="smeta">'+s.grade+' — '+secTerm(instOf(s))+' '+s.section+'</div></div>'+
        '<span class="chip ok">آخر درجة: '+fmt(last)+'</span></li>').join("")+'</ul>';
  el("topBox").querySelectorAll(".srow").forEach(r=>r.onclick=()=>openDetail(r.dataset.id));
}
function renderRiskBox(){
  const list=VIS().filter(s=>s.status==="مستمر").map(s=>{
    const rec=(S.grades[s.id]||{})[MYSUB()]||{};
    return {s,last:lastVal(rec,s.grade)};
  }).filter(x=>x.last!==null&&x.last<50).sort((a,b)=>a.last-b.last);
  el("riskBox").innerHTML=list.length===0?
    '<p class="empty">لا يوجد طلبة دون درجة النجاح حالياً 👍</p>':
    '<ul class="slist">'+list.map(({s,last})=>
      '<li class="srow alertRow" data-id="'+s.id+'">'+
        '<div class="sinfo"><div class="sname">'+esc(s.name)+'</div>'+
        '<div class="smeta">'+s.grade+' — '+secTerm(instOf(s))+' '+s.section+'</div></div>'+
        '<span class="chip bad">آخر درجة: '+fmt(last)+'</span></li>').join("")+'</ul>';
  el("riskBox").querySelectorAll(".srow").forEach(r=>r.onclick=()=>openDetail(r.dataset.id));
}
function renderSettings(){
  el("content").innerHTML=
    '<h2 class="h">'+ICON('settings','hIc')+' الإعدادات</h2>'+'<p class="appVersionLine">نيبور كلاس · الإصدار v'+APP_VER+'</p>'+

    '<nav class="setIndex" aria-label="أقسام الإعدادات">'+[['basic','الأساسية'],['account','الحساب والأمان'],['data','البيانات والنسخ'],['look','المظهر والطباعة'],['help','المساعدة']].map(([k,l])=>'<button type="button" data-sg="'+k+'">'+l+'</button>').join('')+'</nav>'+
    '<section class="setGroup" id="sg-basic"><h3 class="setGroupHead">👤 الأساسية</h3>'+
    '<div class="filters"><input id="setTeacher" placeholder="اسم المدرس" value="'+esc(S.settings.teacher||"")+'"><input id="setSubject" placeholder="المادة التي تدرّسها" value="'+esc(S.settings.subject||"")+'"></div>'+

    '<div class="filters" style="grid-template-columns:1fr"><input id="setAcadYear" placeholder="السنة الدراسية (تلقائي: '+academicYearStr()+')" value="'+esc(S.settings.acadYear||"")+'"></div>'+
    '<button class="btn ghost full" id="instBtn" style="margin-top:0">🏫 إدارة مؤسساتي — إضافة مدرسة أو معهد</button>'+
    '<button class="btn ghost full" id="gwBtn" style="margin-top:0">⚖️ تقسيم الدرجات — خصّصه حسب نظام مادتك</button>'+

    '</section>'+
    '<section class="setGroup" id="sg-account"><h3 class="setGroupHead">🔒 الحساب والأمان</h3>'+
    '<h3 class="h2 setSub">👤 حسابي</h3>'+
    '<button class="btn full" id="acctBtn" style="margin-top:0">'+(S.settings.sync&&S.settings.sync.userId?"👤 حسابي — "+(ROLE_LABEL[S.settings.accountRole]||"معلم")+" ("+esc(S.settings.sync.email||"")+")":"👤 تسجيل الدخول / إنشاء حساب")+'</button>'+

    '<h3 class="h2 setSub">🔒 الهوية والأمان</h3>'+
    '<button class="btn ghost full" id="sigBtn" style="margin-top:0">'+(S.settings.signature?"✍️ تعديل التوقيع الحي":"✍️ إضافة توقيع حي للتقارير")+'</button>'+
    '<button class="btn ghost full" id="ctBtn" style="margin-top:0">📇 بطاقة التواصل — هاتفي وحساباتي بالتقارير</button>'+
    '<button class="btn ghost full" id="pinBtn" style="margin-top:0">'+((S.settings.pinHash||S.settings.pin)?"🔒 تغيير أو إزالة رمز القفل":"🔓 تفعيل رمز قفل التطبيق")+'</button>'+

    '</section>'+
    '<section class="setGroup" id="sg-data"><h3 class="setGroupHead">☁️ البيانات والنسخ الاحتياطي</h3>'+
    '<div class="dataSafety" id="dataSafety"><div class="dsRow">جارِ فحص حالة التخزين…</div></div>'+
    '<button class="btn ghost full" id="snapBtn" style="margin-top:0">'+ICON('clock')+' اللقطات الاحتياطية التلقائية — استعادة أو تنزيل</button>'+
    (featureOn("archive")?'<button class="btn ghost full" id="arcBtn" style="margin-top:0">📦 أرشيف السنوات — طي السنة وبدء جديدة</button>':'')+
    '<button class="btn ghost full" id="syncBtn" style="margin-top:0">'+(syncOn()?"☁️ المزامنة التلقائية مفعّلة ✓":"☁️ تفعيل المزامنة التلقائية بين الأجهزة")+'</button>'+
    '<div class="actions"><button class="btn ghost" id="bkShare">📤 مزامنة لجهاز آخر</button><button class="btn" id="bkExp">'+ICON('clipboard')+' حفظ نسخة احتياطية</button><button class="btn ghost" id="bkImp">⬆ استيراد نسخة</button></div>'+

    '</section>'+
    '<section class="setGroup" id="sg-look"><h3 class="setGroupHead">🎨 المظهر والطباعة</h3>'+
    '<h3 class="h2 setSub">🎨 مظهر التطبيق</h3>'+
    '<label style="font-size:11.5px;margin-bottom:10px">نوع خط واجهة التطبيق (كل الشاشات، مو الطباعة)<select id="setAppFont">'+PRINT_FONT_OPTIONS.map(f=>'<option value="'+f.id+'"'+((S.settings.appFont||"tajawal")===f.id?" selected":"")+'>'+f.label+'</option>').join("")+'</select></label>'+

    '<h3 class="h2 setSub">🎨 هوية مخرجات PDF</h3>'+
    '<p class="empty" style="padding:2px 4px 7px;font-size:11px">خصص محتوى الرأس والتذييل لجميع التقارير. الحقول الفارغة تستخدم بيانات التقرير تلقائياً.</p>'+
    '<div class="filters">'+
      '<label style="font-size:11.5px">نمط الرأس<select id="setPrintHeaderStyle"><option value="premium"'+(((S.settings.printDesign||{}).headerStyle||"premium")==="premium"?" selected":"")+'>فاخر</option><option value="professional"'+(((S.settings.printDesign||{}).headerStyle||"premium")==="professional"?" selected":"")+'>رسمي</option><option value="minimal"'+(((S.settings.printDesign||{}).headerStyle||"premium")==="minimal"?" selected":"")+'>مختصر</option></select></label>'+
      '<label style="font-size:11.5px">قوة الزخرفة<select id="setPrintOrnament"><option value="strong"'+(((S.settings.printDesign||{}).ornament||"strong")==="strong"?" selected":"")+'>واضحة</option><option value="medium"'+(((S.settings.printDesign||{}).ornament||"strong")==="medium"?" selected":"")+'>متوسطة</option><option value="soft"'+(((S.settings.printDesign||{}).ornament||"strong")==="soft"?" selected":"")+'>هادئة</option></select></label>'+
    '</div>'+
    '<div class="filters"><input id="setPrintHeaderTitle" placeholder="عنوان ثابت للرأس — اتركه فارغاً لاستخدام عنوان التقرير" value="'+esc((S.settings.printDesign||{}).headerTitle||"")+'"><input id="setPrintHeaderSubtitle" placeholder="السطر الفرعي — مثال: العام الدراسي 2026-2027" value="'+esc((S.settings.printDesign||{}).headerSubtitle||"")+'"></div>'+
    '<div class="filters"><input id="setPrintHeaderRight" placeholder="نص جهة الشعار — فارغ: اسم المؤسسة" value="'+esc((S.settings.printDesign||{}).headerRight||"")+'"><input id="setPrintHeaderNote" placeholder="سطر إضافي اختياري في الرأس" value="'+esc((S.settings.printDesign||{}).headerNote||"")+'"></div>'+
    '<div class="filters"><label style="font-size:11.5px">اللون الأساسي<input type="color" id="setPrintPrimary" value="'+esc((S.settings.printDesign||{}).primaryColor||"#075968")+'"></label><label style="font-size:11.5px">اللون الذهبي<input type="color" id="setPrintAccent" value="'+esc((S.settings.printDesign||{}).accentColor||"#D4AF37")+'"></label></div>'+
    '<div class="filters"><input id="setPrintFooterRight" placeholder="يمين التذييل — فارغ: اسم المدرس" value="'+esc((S.settings.printDesign||{}).footerRight||"")+'"><input id="setPrintFooterCenter" placeholder="وسط التذييل — عبارة أو شعار مختصر" value="'+esc((S.settings.printDesign||{}).footerCenter||"بالعلم نرتقي")+'"></div>'+
    '<div class="filters"><input id="setPrintFooterLeft" placeholder="يسار التذييل — فارغ: اسم المؤسسة" value="'+esc((S.settings.printDesign||{}).footerLeft||"")+'"><label style="font-size:11.5px;display:flex;align-items:center;gap:8px"><input type="checkbox" id="setPrintPageNum" style="width:auto"'+((S.settings.printDesign||{}).showPageNumber===false?"":" checked")+'>إظهار رقم الصفحة</label></div>'+
    '<div class="filters" style="grid-template-columns:1fr"><label style="font-size:11.5px;display:flex;align-items:center;gap:8px"><input type="checkbox" id="setPrintFillPage" style="width:auto"'+((S.settings.printDesign||{}).fillExamPage===false?"":" checked")+'>توزيع الأسئلة لملء الصفحة تلقائياً عند توفر مساحة كافية</label></div>'+
    '<div class="actions"><button class="btn ghost" id="printDesignReset">↩️ استعادة الافتراضي</button><button class="btn" id="printDesignSave">💾 حفظ هوية PDF</button></div>'+

    '<h3 class="h2 setSub">🖨️ تخصيص خط الطباعة</h3>'+
    '<p class="empty" style="padding:2px 4px 6px;font-size:11px">يتحكم بنوع وحجم الخط بترويسة وتذييل أوراق الأسئلة المطبوعة. حجم منتصف الرأس أكبر افتراضيًا من الأطراف.</p>'+
    '<label style="font-size:11.5px;margin-bottom:8px">نوع الخط<select id="setFontFamily">'+PRINT_FONT_OPTIONS.map(f=>'<option value="'+f.id+'"'+((S.settings.printFont?.family||"tajawal")===f.id?" selected":"")+'>'+f.label+'</option>').join("")+'</select></label>'+
    '<div class="filters">'+
      '<label style="font-size:11.5px">حجم خط منتصف الرأس (العنوان)<input type="number" id="setFontHeadCenter" min="12" max="34" value="'+(S.settings.printFont?.headerCenter||19)+'"></label>'+
      '<label style="font-size:11.5px">حجم خط أطراف الرأس (المدرسة/الصف)<input type="number" id="setFontHeadSide" min="8" max="20" value="'+(S.settings.printFont?.headerSide||11)+'"></label>'+
    '</div>'+
    '<div class="filters" style="grid-template-columns:1fr">'+
      '<label style="font-size:11.5px">حجم خط شريط التذييل السفلي<input type="number" id="setFontFooter" min="7" max="16" value="'+(S.settings.printFont?.footer||9.5)+'"></label>'+
    '</div>'+
    '<button class="btn ghost full" id="fontResetBtn" style="margin-top:0">↩️ إرجاع أحجام الخط الافتراضية</button>'+
    '<div class="filters" style="grid-template-columns:1fr;margin-top:10px">'+
      '<label style="font-size:11.5px">هامش أمان الطباعة (مم) — زوّده لو تطلع صفحة ثانية زايدة عندك<input type="number" id="setPrintSafety" min="0" max="100" step="1" value="'+(Number(S.settings.printSafetyMM)||6)+'"></label>'+
    '</div>'+

    '</section>'+
    '<section class="setGroup" id="sg-help"><h3 class="setGroupHead">❔ المساعدة والتخصيص</h3>'+
    '<button class="btn ghost full" id="tourBtn" style="margin-top:0">🎓 جولة تعريفية بالتطبيق</button>'+
    '<button class="btn ghost full" id="wizardBtn" style="margin-top:0">🧭 إعادة تشغيل مساعد الإعداد</button>'+
    '<button class="btn ghost full" id="pluginsBtn" style="margin-top:0">🧩 تخصيص الميزات الظاهرة</button>'+
    '<p class="empty setNote">الإحصاءات ولوحة الشرف والامتحانات الإلكترونية صارت في «التقييم»، وورقة الأسئلة وبنك الأسئلة ورسم الدوال والتقويم في «التدريس».</p>'+
    '</section>'+
    '<div style="text-align:center;padding:22px 10px 8px;color:#94A3B8;font-size:11.5px;line-height:1.8">'+
      '<b style="display:block;font-size:13px;color:var(--green2)">نيبور كلاس</b>'+
      'تطوير الأستاذ فائز جواد الحمداني<br>جميع الحقوق محفوظة © '+new Date().getFullYear()+
    '</div>';
  el("content").querySelectorAll("[data-sg]").forEach(b=>b.onclick=()=>{const g=el("sg-"+b.dataset.sg);if(g)g.scrollIntoView({behavior:"smooth",block:"start"})});
  el("setAppFont").onchange=e=>{
    S.settings.appFont=e.target.value;save.settings();applyAppFont();toast("تم تغيير خط التطبيق ✓");
  };
  el("setTeacher").onchange=e=>{S.settings.teacher=e.target.value.trim();save.settings()};
  el("setAcadYear").onchange=e=>{S.settings.acadYear=e.target.value.trim();save.settings();el("yearLbl").textContent=academicYearStr();toast("تم تحديث السنة الدراسية")};
  el("setSubject").onchange=e=>{S.settings.subject=e.target.value.trim();save.settings();if(S.settings.subject)toast("تم تغيير المادة إلى "+S.settings.subject)};
  const savePrintDesign=()=>{
    S.settings.printDesign={
      headerStyle:el("setPrintHeaderStyle").value,
      ornament:el("setPrintOrnament").value,
      headerTitle:el("setPrintHeaderTitle").value.trim(),
      headerSubtitle:el("setPrintHeaderSubtitle").value.trim(),
      headerRight:el("setPrintHeaderRight").value.trim(),
      headerNote:el("setPrintHeaderNote").value.trim(),
      primaryColor:el("setPrintPrimary").value,
      accentColor:el("setPrintAccent").value,
      footerRight:el("setPrintFooterRight").value.trim(),
      footerCenter:el("setPrintFooterCenter").value.trim(),
      footerLeft:el("setPrintFooterLeft").value.trim(),
      showPageNumber:el("setPrintPageNum").checked,
      fillExamPage:el("setPrintFillPage").checked
    };
    save.settings();toast("تم حفظ تخصيص الرأس والتذييل ✓");
  };
  el("printDesignSave").onclick=savePrintDesign;
  el("printDesignReset").onclick=()=>{delete S.settings.printDesign;save.settings();toast("تمت استعادة هوية الطباعة الافتراضية");renderSettings()};
  const savePrintFont=()=>{
    S.settings.printFont={
      family:el("setFontFamily").value,
      headerCenter:Number(el("setFontHeadCenter").value)||19,
      headerSide:Number(el("setFontHeadSide").value)||11,
      footer:Number(el("setFontFooter").value)||9.5
    };
    save.settings();
    toast("تم حفظ تخصيص خط الطباعة");
  };
  el("setFontFamily").onchange=savePrintFont;
  el("setFontHeadCenter").onchange=savePrintFont;
  el("setFontHeadSide").onchange=savePrintFont;
  el("setFontFooter").onchange=savePrintFont;
  const savePrintSafety=e=>{
    S.settings.printSafetyMM=Number(e.target.value)||6;
    save.settings();
    toast("تم حفظ هامش أمان الطباعة: "+S.settings.printSafetyMM+"مم");
  };
  el("setPrintSafety").oninput=savePrintSafety;
  el("setPrintSafety").onchange=savePrintSafety;
  el("fontResetBtn").onclick=()=>{
    delete S.settings.printFont;
    save.settings();
    toast("تم إرجاع أحجام الخط الافتراضية");
    renderSettings();
  };
  el("instBtn").onclick=openInstSheet;
  el("gwBtn").onclick=openGradeWeightsSheet;
  if(el("examsBtn"))el("examsBtn").onclick=openExamsSheet;
  if(el("statsBtn"))el("statsBtn").onclick=()=>{goToTab("stats")};
  if(el("honorBtn"))el("honorBtn").onclick=openHonorBoard;
  if(el("plotBtn"))el("plotBtn").onclick=openFunctionPlotter;
  if(el("calBtn"))el("calBtn").onclick=openCalendar;
  if(el("examBuilderBtn"))el("examBuilderBtn").onclick=openExamBuilder;
  if(el("qbankBtn"))el("qbankBtn").onclick=()=>openQuestionBank(false);
  el("sigBtn").onclick=openSignatureSheet;
  el("ctBtn").onclick=openContactSheet;
  el("pinBtn").onclick=openPinSheet;
  if(el("arcBtn"))el("arcBtn").onclick=openArchive;
  el("syncBtn").onclick=openSyncSheet;
  el("acctBtn").onclick=openSyncSheet;
  el("tourBtn").onclick=openOnboarding;
  el("wizardBtn").onclick=openSetupWizard;
  el("pluginsBtn").onclick=openPluginsSheet;
  el("bkExp").onclick=()=>openBackupSheet();
  el("snapBtn").onclick=openSnapshotsSheet;
  renderDataSafety();
  el("bkImp").onclick=()=>el("importFile").click();
  el("bkShare").onclick=shareBackup;
}
function hwFollowups(){
  const today=todayStr();
  const weekAgo=new Date(Date.now()-7*86400000).toISOString().slice(0,10);
  return S.homework.filter(h=>{
    if(h.notified)return false;
    if(h.date>=today||h.date<weekAgo)return false;
    const pending=hwClassStudents(h).filter(s=>!(h.done&&h.done[s.id])&&(!S.curInst||instOf(s)===S.curInst));
    h._pending=pending;
    return pending.length>0;
  });
}
function renderHwFollow(){
  const list=hwFollowups();
  el("hwFollowBox").innerHTML=list.length===0?"":
    '<h3 class="h2">📋 واجبات تحتاج متابعة</h3><ul class="slist">'+list.map(h=>
      '<li class="srow noClick"><div class="sinfo"><div class="sname">'+esc(h.title)+'</div>'+
      '<div class="smeta">'+h.grade+' / '+h.section+' — بتاريخ '+h.date+'</div></div>'+
      '<span class="chip warn">'+h._pending.length+' لم يسلّموا</span>'+
      '<button class="wa" data-hf="'+h.id+'">⏰ إبلاغ</button></li>').join("")+'</ul>';
  el("hwFollowBox").querySelectorAll("[data-hf]").forEach(b=>b.onclick=()=>{
    const h=S.homework.find(x=>x.id===b.dataset.hf);if(!h)return;
    const targets=h._pending.map(s=>({s,cardOpts:{badge:"⏰ تذكير بواجب",chip:"تذكير واجب",tone:"warn",filePrefix:"تذكير_واجب",bodyText:hwRemindMsg(h,s)}}));
    openBulkSender("⏰ تذكير غير المسلّمين: "+h.title,targets,(n)=>{
      if(n>0){h.notified=todayStr();save.homework()}
      render();
    });
  });
}
/* ============ بطاقة ما قبل الحصة ============ */
function lastExamVal(rec){
  rec=rec||{};const out=[];
  const pushM=(f,lbl)=>{
    const m=rec[f];
    if(m&&typeof m==="object"){
      (m.d||[]).forEach((v,i)=>{const n=num(v);if(n!==null)out.push({v:n,l:examName(f,i)+" ("+lbl+")"})});
      const w=num(m.w);if(w!==null)out.push({v:w,l:"تحريري "+lbl});
    }else{const n=num(m);if(n!==null)out.push({v:n,l:lbl})}
  };
  pushM("m1","شهر1 ف1");pushM("m2","شهر2 ف1");
  const mid=num(rec.mid);if(mid!==null)out.push({v:mid,l:"نصف السنة"});
  pushM("m3","شهر1 ف2");pushM("m4","شهر2 ف2");
  const fin=num(rec.fin);if(fin!==null)out.push({v:fin,l:"النهائي"});
  return out.length?out[out.length-1]:null;
}
function preClassHTML(grade,section,inst){
  const list=S.students.filter(s=>s.grade===grade&&s.section===section&&s.status==="مستمر"&&(!inst||instOf(s)===inst));
  if(!list.length)return '<p class="empty" style="padding:6px">لا يوجد طلبة مستمرون بهذا الصف.</p>';
  const ids=new Set(list.map(s=>s.id)),today=todayStr();
  // غائبو آخر يوم دوام مسجّل
  const dates=Object.keys(S.attendance).filter(d=>d<today&&Object.keys(S.attendance[d]).some(id=>ids.has(id))).sort();
  const lastD=dates.length?dates[dates.length-1]:null;
  const absents=lastD?list.filter(s=>S.attendance[lastD][s.id]==="غائب"):[];
  // آخر واجب للصف
  const hws=S.homework.filter(h=>h.grade===grade&&h.section===section&&h.date<=today).sort((a,b)=>a.date<b.date?1:-1);
  const hw=hws[0];
  const pend=hw?list.filter(s=>!(hw.done&&hw.done[s.id])):[];
  // متوسط آخر تقييم مرصود
  const vals=list.map(s=>lastExamVal((S.grades[s.id]||{})[MYSUB()])).filter(x=>x!==null);
  const avg=vals.length?vals.reduce((a,b)=>a+b.v,0)/vals.length:null;
  const chips=arr=>arr.map(s=>'<span class="preChip">'+esc(s.name.split(" ").slice(0,2).join(" "))+'</span>').join("");
  return ''+
    '<div class="preH">🚶 غائبو آخر دوام'+(lastD?' <span class="preD">('+lastD+')</span>':'')+'</div>'+
    (lastD?(absents.length?'<div class="preChips">'+chips(absents)+'</div>':'<div class="preOk">لا غيابات — حضور كامل ✓</div>'):'<div class="preOk">لا يوجد تحضير سابق مسجّل</div>')+
    '<div class="preH">📋 لم يسلّموا آخر واجب'+(hw?' <span class="preD">«'+esc(hw.title)+'»</span>':'')+'</div>'+
    (hw?(pend.length?'<div class="preChips">'+chips(pend)+'</div>':'<div class="preOk">الجميع سلّموا ✓</div>'):'<div class="preOk">لا توجد واجبات مسجّلة لهذا الصف</div>')+
    '<div class="preH">📈 متوسط آخر تقييم مرصود</div>'+
    (avg!==null?'<div class="preAvg"><b>'+fmt(avg)+'</b> من 100 — لدى '+vals.length+' من '+list.length+' طالب'+(avg>=50?'':' ⚠️')+'</div>':'<div class="preOk">لا توجد درجات مرصودة بعد</div>');
}
function renderLessons(){
  const today=new Date().getDay();
  const lessons=TT_VIS().filter(t=>t.day===today).sort((a,b)=>((a.shift||"صباحي")===(b.shift||"صباحي")?a.period-b.period:((a.shift||"صباحي")==="صباحي"?-1:1)));
  el("lessonsBox").innerHTML=lessons.length===0?
    '<p class="empty">لا توجد حصص اليوم'+(S.timetable.length===0?' — أضف جدولك من زر «جدول الحصص» أعلاه':'')+'.</p>':
    lessons.map((t,i)=>
      '<div class="lessonCard" data-goatt="'+i+'">'+
        '<div class="lessonNum">'+t.period+'</div>'+
        '<div class="lessonInfo"><div class="lessonTitle"><span class="shiftIc" title="'+(t.shift==="مسائي"?"مسائي":"صباحي")+'">'+ICON(t.shift==="مسائي"?"moon":"sun")+'</span> '+esc(t.grade)+' — '+esc(secTerm(t.inst||S.curInst))+' '+esc(t.section)+'</div>'+(periodTimeStr(t.period,t.shift||"صباحي")?'<div class="lessonMeta">⏰ '+esc(periodTimeStr(t.period,t.shift||"صباحي"))+'</div>':'')+
        (INSTS().length>1&&t.inst?'<div class="lessonMeta">🏫 '+esc(t.inst)+'</div>':'')+'</div>'+
        '<div class="attBtns">'+
          '<button class="att" data-pre="'+i+'" title="بطاقة ما قبل الحصة" aria-label="بطاقة ما قبل الحصة">'+ICON('pin')+'</button>'+
          '<button class="att" data-go="grades|'+esc(t.grade)+'|'+esc(t.section)+'" title="الدرجات" aria-label="الدرجات">'+ICON('percent')+'</button>'+
          '<button class="att" data-go="homework|'+esc(t.grade)+'|'+esc(t.section)+'" title="الواجبات" aria-label="الواجبات">'+ICON('clipboard')+'</button>'+
        '</div>'+
      '</div><div class="preBox" id="preBox'+i+'" style="display:none"></div>').join("");
  el("lessonsBox").querySelectorAll("[data-pre]").forEach(b=>b.onclick=e=>{
    e.stopPropagation();
    const i=Number(b.dataset.pre),t=lessons[i],box=el("preBox"+i);
    if(box.style.display==="none"){
      box.innerHTML='<div class="preTitle">🎴 بطاقة ما قبل الحصة — '+esc(t.grade)+' / '+esc(t.section)+'</div>'+preClassHTML(t.grade,t.section,t.inst||S.curInst);
      box.style.display="block";
    }else box.style.display="none";
  });
  el("lessonsBox").querySelectorAll("[data-go]").forEach(b=>b.onclick=e=>{
    e.stopPropagation();
    const p=b.dataset.go.split("|");
    if(p[0]==="grades"){S.gGrade=p[1];S.gSection=p[2];S.evalSub="grades"}
    else{S.hGrade=p[1];S.hSection=p[2];S.evalSub="homework"}
    goToTab("evaluation");
  });
  el("lessonsBox").querySelectorAll("[data-goatt]").forEach(card=>card.onclick=()=>{
    const t=lessons[Number(card.dataset.goatt)];
    S.aGrade=t.grade;S.aSection=t.section;S.aDate=todayStr();
    if(INSTS().length>1&&t.inst&&S.curInst!==t.inst){S.curInst=t.inst;updateHeader();}
    goToTab("attendance");
  });
}
/* ============ أوقات الحصص ============ */
function periodTime(period,shift){
  const key=shift==="مسائي"?"evening":"morning";
  const t=(S.settings.periodTimes||{})[key]||{};
  return t[period]||null;
}
function periodTimeStr(period,shift){
  const t=periodTime(period,shift);
  return (t&&t.start&&t.end)?(t.start+" - "+t.end):"";
}
function hasPeriodTimes(){
  const pt=S.settings.periodTimes;
  if(!pt)return false;
  return Object.values(pt).some(shiftObj=>Object.values(shiftObj||{}).some(t=>t&&t.start&&t.end));
}
function openGradeWeightsSheet(){
  let curGrade=""; // "" = الإعداد الافتراضي لكل المراحل
  const draw=()=>{
    const overrides=S.settings.gradeConfigByGrade||{};
    const hasOverride=curGrade&&!!overrides[curGrade];
    const gw=gradeWeights(curGrade||undefined);
    const lw=languageWeights(curGrade||undefined);
    const mode=gradeMode(curGrade||undefined);
    el("modal").innerHTML=
    '<div class="overlay"><div class="sheet">'+
      '<div class="sheetHead"><h3>⚖️ تقسيم الدرجات</h3><button class="x" id="gwX">✕</button></div>'+
      '<div class="form">'+
        '<p class="empty" style="padding:6px;font-size:11.5px">خصّص كيف تُحسب الدرجات — الإعداد الافتراضي يطبَّق على كل المراحل، وتقدر تسوي استثناء خاص لمرحلة معينة إذا نظامها مختلف (مثل الصف المنتهي).</p>'+
        '<label>الإعداد لمرحلة<select id="gwGrade"><option value="">🌐 الإعداد الافتراضي (كل المراحل)</option>'+
          GRADES.map(g=>'<option value="'+esc(g)+'"'+(curGrade===g?" selected":"")+'>'+(overrides[g]?"⭐ ":"")+esc(g)+'</option>').join("")+
        '</select></label>'+
        (curGrade?'<p class="empty" style="padding:4px 6px;font-size:11px">'+(hasOverride?'✓ هذه المرحلة عندها استثناء خاص بها الآن.':'لسا تستخدم الإعداد الافتراضي — عدّل أي قيمة بالأسفل حتى ينشأ استثناء خاص بهذه المرحلة.')+'</p>':'')+
        '<label>نظام درجة الشهر<select id="gwMode">'+
          '<option value="standard"'+(mode==="standard"?" selected":"")+'>📐 قياسي (يومي + تحريري)</option>'+
          '<option value="language"'+(mode==="language"?" selected":"")+'>🗣️ مهارات لغة (إصغاء/قراءة/محادثة/تحريري)</option>'+
        '</select></label>'+
        (mode==="language"?
          '<div class="subCard">'+
            '<div class="subHead"><span class="subName">توزيع درجة الشهر (100 درجة)</span></div>'+
            '<div class="grid2">'+
              '<label style="font-size:11px">🎧 إصغاء<input type="number" id="lwListen" min="0" max="100" value="'+lw.listen+'"></label>'+
              '<label style="font-size:11px">📖 قراءة<input type="number" id="lwRead" min="0" max="100" value="'+lw.read+'"></label>'+
              '<label style="font-size:11px">🗣️ محادثة<input type="number" id="lwSpeak" min="0" max="100" value="'+lw.speak+'"></label>'+
              '<label style="font-size:11px">✍️ تحريري<input type="number" id="lwWritten" min="0" max="100" value="'+lw.written+'"></label>'+
            '</div>'+
            '<p id="lwSumMsg" class="empty" style="padding:6px;font-size:11px"></p>'+
          '</div>':
          '<div class="subCard">'+
            '<div class="subHead"><span class="subName">درجة الشهر: اليومي مقابل التحريري</span></div>'+
            '<div style="display:flex;align-items:center;gap:10px;padding:6px 4px">'+
              '<span style="font-size:11.5px;min-width:70px">يومي <b id="gwDailyLbl">'+gw.daily+'</b>%</span>'+
              '<input type="range" id="gwDaily" min="0" max="100" step="5" value="'+gw.daily+'" style="flex:1">'+
              '<span style="font-size:11.5px;min-width:70px">تحريري <b id="gwWrittenLbl">'+gw.written+'</b>%</span>'+
            '</div>'+
          '</div>')+
        '<div class="subCard">'+
          '<div class="subHead"><span class="subName">الدرجة النهائية: السعي مقابل الامتحان النهائي</span></div>'+
          '<div style="display:flex;align-items:center;gap:10px;padding:6px 4px">'+
            '<span style="font-size:11.5px;min-width:70px">السعي <b id="gwSaayLbl">'+gw.saay+'</b>%</span>'+
            '<input type="range" id="gwSaay" min="0" max="100" step="5" value="'+gw.saay+'" style="flex:1">'+
            '<span style="font-size:11.5px;min-width:70px">النهائي <b id="gwFinalLbl">'+gw.final+'</b>%</span>'+
          '</div>'+
        '</div>'+
        '<button class="btn ghost full" id="gwReset" style="margin-top:0">↺ '+(curGrade?'حذف استثناء هذه المرحلة (رجوع للافتراضي)':'إرجاع الافتراضي لإعداداته الأصلية')+'</button>'+
      '</div>'+
      '<div class="sheetFoot"><button class="btn" id="gwClose">تم</button></div>'+
    '</div></div>';
    el("gwGrade").onchange=()=>{curGrade=el("gwGrade").value;draw()};
    const writeConfig=(patch)=>{
      if(!curGrade){
        Object.assign(S.settings,patch.top||{});
        save.settings();return;
      }
      S.settings.gradeConfigByGrade=S.settings.gradeConfigByGrade||{};
      const cur=S.settings.gradeConfigByGrade[curGrade]||{};
      S.settings.gradeConfigByGrade[curGrade]=Object.assign(cur,patch.override||{});
      save.settings();
    };
    el("gwMode").onchange=()=>{
      const v=el("gwMode").value;
      writeConfig({top:{gradeMode:v},override:{mode:v}});
      draw();
    };
    const save2=()=>{
      const daily=Number(el("gwDaily")?.value??gw.daily);
      const saay=Number(el("gwSaay").value);
      const gwObj={daily,written:100-daily,saay,final:100-saay};
      writeConfig({top:{gradeWeights:gwObj},override:{gradeWeights:gwObj}});
    };
    if(el("gwDaily"))el("gwDaily").oninput=()=>{
      el("gwDailyLbl").textContent=el("gwDaily").value;
      el("gwWrittenLbl").textContent=100-Number(el("gwDaily").value);
      save2();
    };
    el("gwSaay").oninput=()=>{
      el("gwSaayLbl").textContent=el("gwSaay").value;
      el("gwFinalLbl").textContent=100-Number(el("gwSaay").value);
      save2();
    };
    if(mode==="language"){
      const checkSum=()=>{
        const vals=["lwListen","lwRead","lwSpeak","lwWritten"].map(id=>Number(el(id).value)||0);
        const sum=vals.reduce((a,b)=>a+b,0);
        el("lwSumMsg").textContent=sum===100?"✓ المجموع 100 بالضبط":"⚠️ المجموع الحالي "+sum+" — يفضّل يكون 100";
        el("lwSumMsg").style.color=sum===100?"#1E7A4C":"#B3453F";
        const lwObj={listen:vals[0],read:vals[1],speak:vals[2],written:vals[3]};
        writeConfig({top:{languageWeights:lwObj},override:{languageWeights:lwObj}});
      };
      ["lwListen","lwRead","lwSpeak","lwWritten"].forEach(id=>el(id).oninput=checkSum);
      checkSum();
    }
    el("gwReset").onclick=()=>{
      if(curGrade){
        if(S.settings.gradeConfigByGrade)delete S.settings.gradeConfigByGrade[curGrade];
        save.settings();toast("تم حذف استثناء هذه المرحلة ✓");
      }else{
        S.settings.gradeMode="standard";
        S.settings.gradeWeights={daily:50,written:50,saay:50,final:50};
        S.settings.languageWeights={listen:10,read:10,speak:10,written:70};
        save.settings();toast("تمت الإعادة للافتراضي ✓");
      }
      draw();
    };
    el("gwX").onclick=el("gwClose").onclick=closeModal;
  };
  draw();
}
function openPeriodTimesSheet(){
  const periods=[1,2,3,4,5,6,7,8];
  const row=(shift,p)=>{
    const t=periodTime(p,shift)||{start:"",end:""};
    return '<div class="addRow" style="grid-template-columns:50px 1fr 1fr;align-items:center">'+
      '<span style="font-size:11.5px;font-weight:700;color:#64748B">ح'+p+'</span>'+
      '<input type="time" data-pt="'+shift+'|'+p+'|start" value="'+esc(t.start)+'">'+
      '<input type="time" data-pt="'+shift+'|'+p+'|end" value="'+esc(t.end)+'">'+
    '</div>';
  };
  const quickFill=(shift)=>
    '<div class="quickFillBox">'+
      '<div style="font-size:11px;font-weight:700;color:var(--green2);margin-bottom:6px">⚡ تعبئة سريعة لكل الحصص دفعة وحدة</div>'+
      '<div class="addRow" style="grid-template-columns:1fr 1fr 1fr auto">'+
        '<label style="font-size:10.5px">بداية أول حصة<input type="time" id="qf'+shift+'Start" value="08:00"></label>'+
        '<label style="font-size:10.5px">مدة الحصة (د)<input inputmode="numeric" id="qf'+shift+'Dur" value="45"></label>'+
        '<label style="font-size:10.5px">استراحة بينها (د)<input inputmode="numeric" id="qf'+shift+'Gap" value="0"></label>'+
        '<button class="btn ghost" id="qf'+shift+'Apply" style="align-self:end;font-size:11px;padding:8px 10px">تطبيق</button>'+
      '</div>'+
    '</div>';
  el("modal").innerHTML=
  '<div class="overlay"><div class="sheet">'+
    '<div class="sheetHead"><h3>⏰ أوقات الحصص</h3><button class="x" id="ptX">✕</button></div>'+
    '<div class="form">'+
      '<p class="empty" style="padding:6px;font-size:11.5px">حدّد وقت بداية ونهاية كل حصة، ليظهر تلقائياً بتقارير الحضور والغياب.</p>'+
      '<div class="subCard"><div class="subHead"><span class="subName">☀️ الفترة الصباحية</span></div>'+quickFill("صباحي")+periods.map(p=>row("صباحي",p)).join("")+'</div>'+
      '<div class="subCard"><div class="subHead"><span class="subName">🌙 الفترة المسائية</span></div>'+quickFill("مسائي")+periods.map(p=>row("مسائي",p)).join("")+'</div>'+
    '</div>'+
    '<div class="sheetFoot"><button class="btn" id="ptClose">تم</button></div>'+
  '</div></div>';
  el("modal").querySelectorAll("[data-pt]").forEach(inp=>inp.onchange=()=>{
    const[shift,p,part]=inp.dataset.pt.split("|");
    const key=shift==="مسائي"?"evening":"morning";
    S.settings.periodTimes=S.settings.periodTimes||{morning:{},evening:{}};
    S.settings.periodTimes[key][p]=S.settings.periodTimes[key][p]||{start:"",end:""};
    S.settings.periodTimes[key][p][part]=inp.value;
    save.settings();
  });
  ["صباحي","مسائي"].forEach(shift=>{
    el("qf"+shift+"Apply").onclick=()=>{
      const startVal=el("qf"+shift+"Start").value;
      const dur=parseInt(el("qf"+shift+"Dur").value)||45;
      const gap=parseInt(el("qf"+shift+"Gap").value)||0;
      if(!startVal){toast("حدّد وقت بداية أول حصة");return}
      const key=shift==="مسائي"?"evening":"morning";
      S.settings.periodTimes=S.settings.periodTimes||{morning:{},evening:{}};
      let[h,m]=startVal.split(":").map(Number);
      let cursor=h*60+m;
      periods.forEach(p=>{
        const start=cursor,end=cursor+dur;
        const fmt=mins=>String(Math.floor(mins/60)%24).padStart(2,"0")+":"+String(mins%60).padStart(2,"0");
        S.settings.periodTimes[key][p]={start:fmt(start),end:fmt(end)};
        cursor=end+gap;
      });
      save.settings();
      toast("تم تعبئة كل حصص الفترة ال"+shift+" ✓");
      openPeriodTimesSheet();
    };
  });
  el("ptX").onclick=el("ptClose").onclick=closeModal;
}
function openTimetable(){
  let day=new Date().getDay();
  const needsInstPicker=INSTS().length>1&&!S.curInst;
  const curTtInst=()=>needsInstPicker?(el("ttInst")?el("ttInst").value:INSTS()[0]):(S.curInst||INSTS()[0]);
  el("modal").innerHTML=
  '<div class="overlay"><div class="sheet">'+
    '<div class="sheetHead"><h3>جدول الحصص الأسبوعي'+(S.curInst?' — '+esc(S.curInst):'')+'</h3><button class="x" id="ttx">✕</button></div>'+
    '<div class="form">'+
      '<button class="btn ghost full" id="ptBtn" style="margin-top:0">⏰ إعداد أوقات الحصص (من - إلى)</button>'+
      (hasPeriodTimes()?'':'<p class="empty" style="padding:4px 6px;font-size:11px">💡 لسا ما حدّدت أوقات حصصك — حددها مرة وحدة لتظهر تلقائياً بتقارير الحضور والغياب.</p>')+
      '<div class="grid2"><label>اليوم<select id="ttDay">'+[6,0,1,2,3,4,5].map(d=>'<option value="'+d+'"'+(d===day?" selected":"")+'>'+DAYS[d]+'</option>').join("")+'</select></label>'+
      '<label>الفترة<select id="ttShift"><option value="صباحي">☀️ صباحي</option><option value="مسائي">🌙 مسائي</option></select></label></div>'+
      (needsInstPicker?'<label>المؤسسة<select id="ttInst">'+opts(INSTS(),INSTS()[0])+'</select></label>':'')+
      '<div class="addRow" style="grid-template-columns:70px 1fr 64px auto">'+
        '<select id="ttPeriod">'+[1,2,3,4,5,6,7,8].map(p=>'<option>'+p+'</option>').join("")+'</select>'+
        '<select id="ttGrade">'+opts(GRADES,GRADES[0])+'</select>'+
        '<select id="ttSection">'+opts(secList(curTtInst()),secList(curTtInst())[0])+'</select>'+
        '<button class="btn" id="ttAdd">+</button>'+
      '</div>'+
      '<div id="ttList" class="payList"></div>'+
    '</div>'+
    '<div class="sheetFoot"><button class="btn" id="ttClose">تم</button></div>'+
  '</div></div>';
  const refreshTtSections=()=>{
    const inst=curTtInst();
    el("ttSection").innerHTML=opts(secList(inst),secList(inst)[0]);
  };
  const renderTT=()=>{
    const d=Number(el("ttDay").value);
    const rows=(S.curInst?S.timetable.filter(t=>(t.inst||INSTS()[0])===S.curInst):S.timetable).filter(t=>t.day===d).sort((a,b)=>((a.shift||"صباحي")===(b.shift||"صباحي")?a.period-b.period:((a.shift||"صباحي")==="صباحي"?-1:1)));
    el("ttList").innerHTML=rows.length===0?'<p class="empty" style="padding:10px">لا توجد حصص بهذا اليوم.</p>':
      rows.map(t=>'<div class="behavRow"><span class="bChip p">'+(t.shift==="مسائي"?"🌙":"☀️")+' حصة '+t.period+'</span>'+
        '<div class="bd">'+esc(t.grade)+' — '+esc(secTerm(t.inst||S.curInst))+' '+esc(t.section)+(!S.curInst&&INSTS().length>1&&t.inst?' — '+esc(t.inst):'')+(periodTimeStr(t.period,t.shift||"صباحي")?' <span class="ttTime">⏰ '+esc(periodTimeStr(t.period,t.shift||"صباحي"))+'</span>':'')+'</div>'+
        '<button class="bDel" data-ttd="'+t.id+'">✕</button></div>').join("");
    el("ttList").querySelectorAll("[data-ttd]").forEach(b=>b.onclick=()=>{
      S.timetable=S.timetable.filter(x=>x.id!==b.dataset.ttd);
      save.timetable();renderTT();
    });
  };
  el("ttDay").onchange=renderTT;renderTT();
  if(el("ttInst"))el("ttInst").onchange=refreshTtSections;
  el("ttAdd").onclick=()=>{
    const d=Number(el("ttDay").value),p=Number(el("ttPeriod").value),shift=el("ttShift").value;
    const inst=curTtInst();
    if(S.timetable.some(t=>t.day===d&&t.period===p&&(t.shift||"صباحي")===shift&&(t.inst||INSTS()[0])===inst)){toast("الحصة "+p+" ("+shift+") محجوزة بهذا اليوم في "+inst);return}
    const clash=S.timetable.find(t=>t.day===d&&t.period===p&&(t.shift||"صباحي")===shift&&(t.inst||INSTS()[0])!==inst);
    if(clash&&!confirm("⚠️ لديك في نفس الوقت (الحصة "+p+" "+shift+" يوم "+DAYS[d]+") حصة في «"+(clash.inst||INSTS()[0])+"»: "+clash.grade+" / "+clash.section+".\nهل تريد الإضافة رغم التعارض؟"))return;
    S.timetable.push({id:uid(),day:d,period:p,shift,inst,grade:el("ttGrade").value,section:el("ttSection").value});
    save.timetable();renderTT();
  };
  el("ptBtn").onclick=openPeriodTimesSheet;
  el("ttx").onclick=el("ttClose").onclick=()=>{closeModal();if(S.tab==="home")render()};
}
/* ============ المؤسسات ============ */
function renameInst(old,nv){
  nv=(nv||"").trim();
  if(!nv||nv===old)return false;
  if(INSTS().includes(nv)){toast("الاسم موجود مسبقاً");return false}
  S.settings.insts=INSTS().map(x=>x===old?nv:x);
  S.students.forEach(s=>{if(instOf(s)===old)s.inst=nv});
  S.timetable.forEach(t=>{if(t.inst===old)t.inst=nv});
  if(S.settings.instMeta&&S.settings.instMeta[old]){S.settings.instMeta[nv]=S.settings.instMeta[old];delete S.settings.instMeta[old]}
  if(S.curInst===old)S.curInst=nv;
  save.settings();save.students();save.timetable();
  return true;
}
function updateHeader(){
  const sn=el("schoolName");
  if(S.curInst){sn.value=S.curInst;sn.disabled=false}
  else{sn.value="كل مؤسساتي ("+INSTS().length+")";sn.disabled=true}
}
function openInstSheet(){
  el("modal").innerHTML=
  '<div class="overlay"><div class="sheet">'+
    '<div class="sheetHead"><h3>مؤسساتي</h3><button class="x" id="wx">✕</button></div>'+
    '<div class="form">'+
      '<div id="wsList" class="payList"></div>'+
      '<div class="addRow" style="grid-template-columns:1fr auto"><input id="wsName" placeholder="اسم المدرسة/المعهد الجديد"><button class="btn" id="wsAdd">+ إضافة</button></div>'+
      '<input type="file" id="wsLogoFile" accept="image/*" style="display:none">'+
      '<p class="empty" style="padding:8px;font-size:11.5px">اختر مؤسسة لعرض طلبتها فقط، أو «كل مؤسساتي» لنظرة عامة. زر ⚙️ يضبط نوع الخطاب (مدرسة/تدريس خاص) وشعار المؤسسة، و✏️ يعدّل الاسم. رسائل أولياء الأمور تُختم حسب نوع مؤسسة الطالب.</p>'+
    '</div>'+
    '<div class="sheetFoot"><button class="btn" id="wsClose">تم</button></div>'+
  '</div></div>';
  let cfgOpen=null;
  const renderWs=()=>{
    const rows=['<div class="behavRow" style="'+(S.curInst===""?'border-color:var(--green);background:var(--okbg)':'')+'">'+
      '<span class="bChip '+(S.curInst===""?'p':'w')+'">'+(S.curInst===""?'الحالية':'عرض')+'</span>'+
      '<div class="bd" data-wgo="__all__" style="cursor:pointer;font-weight:700">كل مؤسساتي — نظرة عامة</div></div>']
      .concat(INSTS().map(name=>{
        const cur=S.curInst===name;
        const n=S.students.filter(s=>instOf(s)===name).length;
        const priv=instType(name)==="private",logo=instLogo(name);
        let row='<div class="behavRow" style="'+(cur?'border-color:var(--green);background:var(--okbg)':'')+'">'+
          '<span class="bChip '+(cur?'p':'w')+'">'+n+' طالب</span>'+
          '<div class="bd" data-wgo="'+esc(name)+'" style="cursor:pointer;font-weight:700">'+(priv?'👨‍🏫 ':'')+esc(name)+'</div>'+
          '<button class="bDel" data-wset="'+esc(name)+'" style="color:var(--green);border-color:var(--green)">⚙️</button>'+
          '<button class="bDel" data-wren="'+esc(name)+'" style="color:var(--green);border-color:var(--green)">✏️</button>'+
          (INSTS().length>1?'<button class="bDel" data-wdel="'+esc(name)+'">✕</button>':'')+
        '</div>';
        if(cfgOpen===name){
          row+='<div class="instCfg">'+
            '<label style="font-size:12px;font-weight:700;color:var(--green2)">نوع المؤسسة وطبيعة الخطاب'+
              '<select data-wtype="'+esc(name)+'">'+
                '<option value="school"'+(priv?'':' selected')+'>🏫 مدرسة رسمية — الرسائل والتقارير بصيغة الإدارة</option>'+
                '<option value="private"'+(priv?' selected':'')+'>👨‍🏫 تدريس خاص — الرسائل بصيغة الأستاذ الشخصية</option>'+
              '</select></label>'+
            '<div class="instLogoRow">'+
              (logo?'<img src="'+logo+'" class="instLogoPrev" alt="الشعار">':'<span class="instLogoNone">لا يوجد شعار</span>')+
              '<button class="btn ghost" data-wlogo="'+esc(name)+'" style="margin:0">🖼 '+(logo?'تغيير':'رفع')+' الشعار</button>'+
              (logo?'<button class="btn ghostD" data-wlogodel="'+esc(name)+'" style="margin:0">إزالة</button>':'')+
            '</div>'+
            '<p class="empty" style="padding:4px 6px;font-size:11px">الشعار يظهر بترويسة التقارير المطبوعة والبطاقة المصوّرة لطلبة هذه المؤسسة. بالتدريس الخاص تُوقَّع الرسائل باسمك مباشرة ويختفي حقل مدير المدرسة من التقارير.</p>'+
            '<label style="font-size:12px;font-weight:700;color:var(--green2)">عنوان المؤسسة (يظهر بترويسة التقارير، اختياري)'+
              '<input data-waddr="'+esc(name)+'" placeholder="مثال: بغداد — الكرادة — قرب ساحة ..." value="'+esc(instAddress(name))+'"></label>'+
            '<label style="font-size:12px;font-weight:700;color:var(--green2)">اسم مدير هذه المؤسسة (يظهر أسفل تقارير هذه المؤسسة فقط)'+
              '<input data-wprincipal="'+esc(name)+'" placeholder="مثال: أحمد محمد علي" value="'+esc(instMeta(name).principal||"")+'"></label>'+
            '<label style="font-size:12px;font-weight:700;color:var(--green2);flex-direction:row;align-items:center;justify-content:space-between">لون مميّز للتقارير المطبوعة<input type="color" data-wcolor="'+esc(name)+'" value="'+esc(instMeta(name).color||"#0F172A")+'" style="width:44px;height:32px;padding:2px;border-radius:8px"></label>'+
            '<div class="colorSwatches">'+COLOR_PRESETS.map(c=>'<button type="button" class="swatch" data-wswatch="'+esc(name)+'|'+c+'" style="background:'+c+'"></button>').join("")+'</div>'+
            '<div style="font-size:12px;font-weight:700;color:var(--green2);margin-top:6px">المراحل الدراسية الموجودة بهذه المؤسسة</div>'+
            '<select data-wgpreset="'+esc(name)+'" style="margin-bottom:4px"><option value="">— اختر قالباً جاهزاً (اختياري) —</option>'+GRADE_PRESETS.map(([l])=>'<option>'+l+'</option>').join("")+'</select>'+
            '<div class="gradeChecks" data-wgrades="'+esc(name)+'">'+ALL_GRADES.map(g=>
              '<label style="flex-direction:row;align-items:center;gap:6px;font-size:12px;font-weight:500"><input type="checkbox" value="'+esc(g)+'" '+(gradesFor(name).includes(g)?"checked":"")+' style="width:17px;height:17px">'+g+'</label>').join("")+
            '</div>'+
            '<p class="empty" style="padding:4px 6px;font-size:11px">فعّل بس المراحل الموجودة فعلياً بهذه المؤسسة — تختفي البقية من كل القوائم والفلاتر تلقائياً.</p>'+
            '<label style="font-size:12px;font-weight:700;color:var(--green2)">تسمية تصنيف الطلبة (شعبة / مجموعة / أي اسم تريده)'+
              '<input data-wterm="'+esc(name)+'" placeholder="مثال: شعبة أو مجموعة" value="'+esc(secTerm(name))+'"></label>'+
            '<div style="font-size:11.5px;font-weight:700;color:var(--green2)">قائمة ال'+esc(secTerm(name))+' الحالية بهذه المؤسسة</div>'+
            '<div data-wseclist="'+esc(name)+'" class="payList"></div>'+
            '<div class="addRow" style="grid-template-columns:1fr auto">'+
              '<input data-wsecnew="'+esc(name)+'" placeholder="اسم '+esc(secTerm(name))+' جديدة">'+
              '<button class="btn ghost" data-wsecadd="'+esc(name)+'" style="margin:0">+ إضافة</button>'+
            '</div>'+
          '</div>';
        }
        return row;
      }));
    el("wsList").innerHTML=rows.join("");
    el("wsList").querySelectorAll("[data-wset]").forEach(b=>b.onclick=()=>{
      cfgOpen=cfgOpen===b.dataset.wset?null:b.dataset.wset;renderWs();
    });
    el("wsList").querySelectorAll("[data-wtype]").forEach(sl=>sl.onchange=()=>{
      setInstMeta(sl.dataset.wtype,{type:sl.value});
      toast(sl.value==="private"?"صار الخطاب شخصياً باسم الأستاذ ✓":"صار الخطاب رسمياً باسم الإدارة ✓");
      renderWs();
    });
    el("wsList").querySelectorAll("[data-wlogo]").forEach(b=>b.onclick=()=>{
      window._logoInst=b.dataset.wlogo;
      el("wsLogoFile").click();
    });
    el("wsList").querySelectorAll("[data-wlogodel]").forEach(b=>b.onclick=()=>{
      if(!confirm("إزالة شعار «"+b.dataset.wlogodel+"»؟"))return;
      setInstMeta(b.dataset.wlogodel,{logo:""});renderWs();toast("أُزيل الشعار");
    });
    el("wsList").querySelectorAll("[data-wterm]").forEach(inp=>inp.onchange=()=>{
      const nv=inp.value.trim();
      if(!nv){toast("اكتب اسماً للتصنيف");inp.value=secTerm(inp.dataset.wterm);return}
      setInstMeta(inp.dataset.wterm,{sectionTerm:nv});
      toast("تم تحديث التسمية إلى «"+nv+"» ✓");renderWs();
    });
    el("wsList").querySelectorAll("[data-waddr]").forEach(inp=>inp.onchange=()=>{
      setInstMeta(inp.dataset.waddr,{address:inp.value.trim()});
      toast("تم حفظ العنوان ✓");
    });
    el("wsList").querySelectorAll("[data-wprincipal]").forEach(inp=>inp.onchange=()=>{
      setInstMeta(inp.dataset.wprincipal,{principal:inp.value.trim()});
      toast("تم حفظ اسم المدير ✓");
    });
    el("wsList").querySelectorAll("[data-wcolor]").forEach(inp=>inp.onchange=()=>{
      setInstMeta(inp.dataset.wcolor,{color:inp.value});
      toast("تم حفظ اللون المميز ✓");
    });
    el("wsList").querySelectorAll("[data-wswatch]").forEach(b=>b.onclick=()=>{
      const[name,color]=b.dataset.wswatch.split("|");
      setInstMeta(name,{color});
      renderWs();
      toast("تم تطبيق اللون ✓");
    });
    el("wsList").querySelectorAll("[data-wgpreset]").forEach(sel=>sel.onchange=()=>{
      const inst=sel.dataset.wgpreset;
      const preset=GRADE_PRESETS.find(([l])=>l===sel.value);
      if(!preset)return;
      setInstMeta(inst,{grades:preset[1].slice()});
      renderWs();
      toast("تم تطبيق القالب ✓");
    });
    el("wsList").querySelectorAll("[data-wgrades]").forEach(box=>{
      const inst=box.dataset.wgrades;
      box.querySelectorAll("input[type=checkbox]").forEach(cb=>cb.onchange=()=>{
        const checked=Array.from(box.querySelectorAll("input[type=checkbox]:checked")).map(x=>x.value);
        if(checked.length===0){toast("لازم تبقي مرحلة واحدة على الأقل مفعّلة");cb.checked=true;return}
        // نحافظ على ترتيب ALL_GRADES الطبيعي بدل ترتيب النقر
        const ordered=ALL_GRADES.filter(g=>checked.includes(g));
        setInstMeta(inst,{grades:ordered});
        toast("تم تحديث المراحل ✓");
      });
    });
    el("wsList").querySelectorAll("[data-wseclist]").forEach(box=>{
      const inst=box.dataset.wseclist;
      box.innerHTML=secList(inst).map(nm=>
        '<div class="behavRow"><div class="bd" style="font-weight:700">'+esc(nm)+'</div>'+
        '<button class="bDel" data-wsecren="'+esc(inst)+'|'+esc(nm)+'">✏️</button>'+
        (secList(inst).length>1?'<button class="bDel" data-wsecdel="'+esc(inst)+'|'+esc(nm)+'">✕</button>':'')+
        '</div>').join("");
    });
    el("wsList").querySelectorAll("[data-wsecren]").forEach(b=>b.onclick=()=>{
      const[inst,old]=b.dataset.wsecren.split("|");
      const nv=prompt("الاسم الجديد:",old);
      if(nv===null)return;
      if(renameSection(inst,old,nv)){toast("تم تغيير الاسم — تحدّث طلبتها وحصصها تلقائياً ✓");renderWs()}
    });
    el("wsList").querySelectorAll("[data-wsecdel]").forEach(b=>b.onclick=()=>{
      const[inst,nm]=b.dataset.wsecdel.split("|");
      if(!confirm("حذف «"+nm+"»؟ طلبتها سينتقلون لأول "+secTerm(inst)+" بالقائمة."))return;
      if(deleteSection(inst,nm)){renderWs();toast("تم الحذف والنقل")}
    });
    el("wsList").querySelectorAll("[data-wsecadd]").forEach(b=>b.onclick=()=>{
      const inst=b.dataset.wsecadd;
      const inp=el("wsList").querySelector('[data-wsecnew="'+CSS.escape(inst)+'"]');
      if(addSection(inst,inp.value)){inp.value="";renderWs();toast("أُضيفت ✓")}
    });
    el("wsList").querySelectorAll("[data-wgo]").forEach(d=>d.onclick=()=>{
      S.curInst=d.dataset.wgo==="__all__"?"":d.dataset.wgo;
      closeModal();updateHeader();_tabHistActive=false;S.tab="home";render();
      toast(S.curInst?("عرض: "+S.curInst):"عرض كل المؤسسات");
    });
    el("wsList").querySelectorAll("[data-wren]").forEach(b=>b.onclick=()=>{
      const old=b.dataset.wren;
      const nv=prompt("الاسم الجديد للمؤسسة:",old);
      if(nv===null)return;
      if(renameInst(old,nv)){
        updateHeader();renderWs();
        toast("تم تغيير الاسم — تحدّث طلبتها وحصصها ورسائلها تلقائياً ✓");
      }
    });
    el("wsList").querySelectorAll("[data-wdel]").forEach(b=>b.onclick=()=>{
      const name=b.dataset.wdel;
      const others=INSTS().filter(x=>x!==name);
      if(!others.length)return;
      if(!confirm("حذف «"+name+"»؟ طلبتها وحصصها سينتقلون إلى «"+others[0]+"»."))return;
      S.students.forEach(s=>{if(instOf(s)===name)s.inst=others[0]});
      S.timetable.forEach(t=>{if(t.inst===name)t.inst=others[0]});
      if(S.settings.instMeta)delete S.settings.instMeta[name];
      S.settings.insts=others;
      if(S.curInst===name)S.curInst="";
      save.students();save.timetable();save.settings();
      updateHeader();renderWs();toast("تم الحذف والنقل");
    });
  };
  el("wsLogoFile").onchange=e=>{
    const f=e.target.files&&e.target.files[0];
    e.target.value="";
    if(!f||!window._logoInst)return;
    const inst=window._logoInst;
    const fr=new FileReader();
    fr.onload=()=>{
      const im=new Image();
      im.onload=()=>{
        const max=280,sc=Math.min(1,max/Math.max(im.width,im.height));
        const cv=document.createElement("canvas");
        cv.width=Math.max(1,Math.round(im.width*sc));cv.height=Math.max(1,Math.round(im.height*sc));
        cv.getContext("2d").drawImage(im,0,0,cv.width,cv.height);
        setInstMeta(inst,{logo:cv.toDataURL("image/png")});
        renderWs();toast("حُفظ شعار "+inst+" ✓");
      };
      im.onerror=()=>toast("تعذر قراءة الصورة — جرّب صيغة PNG أو JPG");
      im.src=fr.result;
    };
    fr.readAsDataURL(f);
  };
  el("wsAdd").onclick=()=>{
    const name=el("wsName").value.trim();
    if(!name){toast("اكتب اسم المؤسسة");return}
    if(INSTS().includes(name)){toast("الاسم موجود مسبقاً");return}
    S.settings.insts=INSTS().concat([name]);
    save.settings();
    el("wsName").value="";
    S.curInst=name;updateHeader();renderWs();
    toast("أُضيفت: "+name);
  };
  el("wx").onclick=el("wsClose").onclick=()=>{closeModal();if(S.tab==="home")render()};
  renderWs();
}
function renderAlerts(){
  const lim=S.settings.absLimit||5;
  const list=VIS()
    .filter(s=>s.status==="مستمر")
    .map(s=>({s,n:absCount(s.id)}))
    .filter(x=>x.n>=lim)
    .sort((a,b)=>b.n-a.n);
  el("alertBox").innerHTML=list.length===0?
    '<p class="empty">لا يوجد طلبة تجاوزوا حد الغياب 👍</p>':
    '<ul class="slist">'+list.map(({s,n})=>
      '<li class="srow alertRow" data-id="'+s.id+'">'+
        '<div class="sinfo"><div class="sname">'+esc(s.name)+'</div>'+
        '<div class="smeta">'+s.grade+' — '+secTerm(instOf(s))+' '+s.section+'</div></div>'+
        '<span class="chip bad">'+n+' غياب</span>'+
        '<button class="wa" data-wa="'+s.id+'">واتساب</button></li>').join("")+'</ul>';
  el("alertBox").querySelectorAll("[data-wa]").forEach(b=>b.onclick=e=>{
    e.stopPropagation();
    const s=S.students.find(x=>x.id===b.dataset.wa);
    shareItemCard(s,{badge:"⚠️ تنبيه تكرار غياب",chip:"غياب متكرر",tone:"warn",filePrefix:"تكرار_غياب",
      bodyText:"السلام عليكم،\nنود تنبيهكم بأن غيابات "+genderNoun(s)+" ("+s.name+") بلغت "+absCount(s.id)+" أيام.\n"+instFollowLine(s)});
  });
  el("alertBox").querySelectorAll(".srow").forEach(r=>r.onclick=()=>openDetail(r.dataset.id));
}
/* ============ v2.9.0: حماية البيانات — حالة التخزين واللقطات التلقائية ============ */
function fmtBytes(n){if(!n&&n!==0)return "—";if(n<1024)return n+" بايت";if(n<1048576)return (n/1024).toFixed(0)+" كيلوبايت";if(n<1073741824)return (n/1048576).toFixed(1)+" ميغابايت";return (n/1073741824).toFixed(2)+" غيغابايت"}
function fmtWhen(iso){try{return new Date(iso).toLocaleString("ar-IQ-u-nu-latn",{year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"})}catch(_){return iso||""}}
function isStandaloneApp(){try{return matchMedia("(display-mode: standalone)").matches||navigator.standalone===true}catch(_){return false}}
async function renderDataSafety(){
  const box=el("dataSafety");if(!box)return;const DB=window.MasarDB;
  if(!DB){box.innerHTML='<div class="dsRow warn">التخزين: localStorage (سعة محدودة ~5MB)</div>';return}
  try{await DB.ready}catch(_){}
  const est=await DB.estimate(),snaps=await DB.listSnapshots().catch(()=>[]),persisted=await DB.requestPersist();
  const rows=[];
  rows.push(DB.mode==="idb"?'<div class="dsRow ok">'+ICON("check")+'<span><b>تخزين موسّع (IndexedDB)</b> — سعة أكبر بكثير من التخزين القديم'+(est&&est.quota?' · المستخدم '+fmtBytes(est.usage)+' من '+fmtBytes(est.quota):'')+'</span></div>':'<div class="dsRow warn">'+ICON("alert")+'<span><b>تخزين محدود (localStorage)</b> — هذا المتصفح لا يدعم التخزين الموسّع.</span></div>');
  if(persisted===true)rows.push('<div class="dsRow ok">'+ICON("check")+'<span><b>محمي من الحذف التلقائي</b> — لن يمسح المتصفح البيانات عند امتلاء الجهاز.</span></div>');
  else if(!isStandaloneApp())rows.push('<div class="dsRow warn">'+ICON("alert")+'<span><b>ثبّت التطبيق على الشاشة الرئيسية</b> — سفاري قد يحذف بيانات المواقع غير المستخدمة لعدة أيام. التطبيق المثبّت يبدأ فارغًا: احفظ نسخة احتياطية أولًا، ثم من زر المشاركة ⬆ اختر «إضافة إلى الشاشة الرئيسية»، واستورد النسخة داخله.</span></div>');
  rows.push(snaps.length?'<div class="dsRow ok">'+ICON("clock")+'<span><b>لقطات تلقائية داخل الجهاز:</b> '+snaps.length+' — آخرها '+fmtWhen(snaps[0].at)+'</span></div>':'<div class="dsRow">'+ICON("clock")+'<span>تُؤخذ لقطة تلقائية يوميًا عند فتح التطبيق.</span></div>');
  const last=S.settings.lastBackupAt?fmtWhen(S.settings.lastBackupAt):S.settings.lastBackup;const days=daysSinceBackup();
  rows.push(last&&days<BACKUP_REMIND_DAYS?'<div class="dsRow ok">'+ICON("check")+'<span><b>آخر ملف نسخة احتياطية:</b> '+esc(last)+'</span></div>':'<div class="dsRow warn">'+ICON("alert")+'<span><b>'+(last?'مرّ '+days+' يومًا على آخر ملف نسخة احتياطية':'لم تنزّل ملف نسخة احتياطية بعد')+'</b> — اللقطات داخل الجهاز لا تحمي من ضياع الجهاز نفسه. احفظ الملف في «الملفات» أو iCloud.</span></div>');
  box.innerHTML=rows.join("");
}
async function openSnapshotsSheet(){
  const DB=window.MasarDB;
  el("modal").innerHTML='<div class="overlay"><div class="sheet"><div class="sheetHead"><h3>اللقطات الاحتياطية التلقائية</h3><button class="x" id="snX">✕</button></div><div class="form"><p class="empty" style="padding:4px 2px;font-size:12px">يأخذ التطبيق لقطة كاملة لكل بياناتك ومحاضراتك مرة يوميًا، وقبل أي استيراد أو استعادة. تُحفظ آخر 7 لقطات يومية داخل هذا الجهاز.</p><div id="snList" class="snList"><p class="empty">جارِ التحميل…</p></div></div><div class="sheetFoot"><button class="btn ghost" id="snNow">'+ICON("clock")+' لقطة الآن</button><button class="btn" id="snClose">تم</button></div></div></div>';
  el("snX").onclick=el("snClose").onclick=closeModal;
  const draw=async()=>{
    if(!DB||DB.mode!=="idb"){el("snList").innerHTML='<p class="empty">اللقطات تحتاج التخزين الموسّع (IndexedDB)، وهو غير متاح في هذا المتصفح.</p>';return}
    const list=await DB.listSnapshots();
    el("snList").innerHTML=list.length?list.map(x=>'<div class="snRow"><div class="snInfo"><b>'+esc(fmtWhen(x.at))+'</b><small>'+esc(x.reason||"")+' · '+fmtBytes(x.size)+'</small></div><button class="btn ghost" data-sn-dl="'+x.id+'">'+ICON("exam")+' تنزيل</button><button class="btn ghost" data-sn-restore="'+x.id+'">'+ICON("undo")+' استعادة</button></div>').join(""):'<p class="empty">لا توجد لقطات بعد.</p>';
    el("snList").querySelectorAll("[data-sn-dl]").forEach(b=>b.onclick=async()=>{const sn=await DB.getSnapshot(b.dataset.snDl);if(!sn)return;const payload={schema:"nibor-class-full-backup",schemaVersion:1,appVersion:APP_VER,exportedAt:sn.at,kv:sn.kv};const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(payload)],{type:"application/json"}));a.download="نيبور_كلاس_نسخة_كاملة_"+String(sn.at).slice(0,10)+".json";a.click();toast("تم تنزيل اللقطة كملف ✓")});
    el("snList").querySelectorAll("[data-sn-restore]").forEach(b=>b.onclick=async()=>{if(!confirm("استعادة هذه اللقطة تستبدل كل البيانات والمحاضرات الحالية بها. (تُحفظ لقطة من الحالة الحالية قبل ذلك.) متابعة؟"))return;try{await DB.restoreSnapshot(b.dataset.snRestore);toast("تمت الاستعادة — جارِ إعادة التحميل…");setTimeout(()=>location.reload(),800)}catch(err){console.error(err);toast("تعذرت الاستعادة")}});
  };
  el("snNow").onclick=async()=>{if(!DB||DB.mode!=="idb")return;await DB.snapshot("لقطة يدوية");toast("تم أخذ لقطة ✓");draw();renderDataSafety()};
  draw();
}
function backupData(){
  return JSON.stringify({
    masarBackup:true,appVersion:APP_VER,schemaVersion:MASAR_SCHEMA_VERSION,exportedAt:new Date().toISOString(),
    lectureStore:(()=>{try{return window.MasarStorage?window.MasarStorage.exportBackup():null}catch(_){return null}})(), // v2.9.0: المحاضرات والمشاريع ضمن نفس الملف
    data:{students:S.students,grades:S.grades,attendance:S.attendance,payments:S.payments,behavior:S.behavior,homework:S.homework,timetable:S.timetable,dailyPlans:S.dailyPlans||[],settings:S.settings,exams:S.exams,messages:S.messages,events:S.events,qbank:S.qbank,examTemplates:S.examTemplates}
  });
}
// يقبل الصيغة الجديدة (مغلّفة) والقديمة (مسطّحة) معًا، للتوافق مع نسخ احتياطية قديمة
function unwrapBackup(d){return d&&d.masarBackup&&d.data?d.data:d}
async function createPreImportSnapshot(){
  try{await saveRaw("safety:preImport",{createdAt:new Date().toISOString(),appVersion:APP_VER,payload:JSON.parse(backupData())});return true}
  catch(e){console.error("snapshot",e);return false}
}
// تحقق أساسي من بنية ملف الاستيراد قبل تطبيقه — يمنع دخول بيانات تالفة بصمت
function validateBackupSchema(d){
  if(!d||typeof d!=="object"||Array.isArray(d))return "الملف فاسد أو غير مقروء";
  const isArr=k=>d[k]===undefined||Array.isArray(d[k]);
  const isObj=k=>d[k]===undefined||(typeof d[k]==="object"&&d[k]!==null&&!Array.isArray(d[k]));
  if(!isArr("students"))return "بيانات الطلبة تالفة (يُفترض أن تكون قائمة)";
  if(d.students&&d.students.some(s=>!s||typeof s!=="object"||typeof s.id!=="string"))return "بعض سجلات الطلبة تالفة (بدون معرّف صالح)";
  for(const k of ["grades","attendance","payments","behavior","messages"])if(!isObj(k))return "بيانات «"+k+"» تالفة (يُفترض أن تكون كائن)";
  for(const k of ["homework","timetable","exams","events","qbank","examTemplates","dailyPlans"])if(!isArr(k))return "بيانات «"+k+"» تالفة (يُفترض أن تكون قائمة)";
  if(!isObj("settings"))return "بيانات الإعدادات تالفة";
  return null;
}
// تشفير اختياري بكلمة مرور — يُرجع null إذا ألغى المستخدم، أو النص كما هو إذا تُرك بدون كلمة مرور
async function maybeEncryptBackup(data){
  if(!hasCrypto)return data;
  const pass=prompt("🔒 كلمة مرور لتشفير النسخة الاحتياطية (اختياري)\nاتركها فارغة واضغط موافق للتصدير بدون تشفير.\n⚠️ إذا نسيت كلمة المرور لاحقاً، لا يمكن فتح هذه النسخة نهائياً.");
  if(pass===null)return null;
  if(!pass.trim())return data;
  try{return await encryptBackupText(data,pass.trim())}
  catch(e){console.error("encrypt failed",e);toast("تعذّر التشفير — صُدّرت النسخة بدون تشفير");return data}
}
async function shareBackup(){
  const raw=backupData();
  const data=await maybeEncryptBackup(raw);
  if(data===null)return;
  const file=new File([data],"مزامنة_الطلبة_"+todayStr()+".json",{type:"application/json"});
  if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
    try{
      await navigator.share({files:[file]});
      S.settings.lastBackup=todayStr();save.settings();
      if(S.tab==="home")render();
      toast("أرسل الملف لنفسك وافتحه بالجهاز الآخر ثم «استيراد نسخة»");
    }catch(e){/* المستخدم ألغى */}
  }else{
    await exportBackup(data);
    toast("نزل الملف — انقله للجهاز الآخر واستورده هناك");
  }
}
/* v2.9.4: نافذة النسخ الاحتياطي — الملف يُجهَّز مسبقًا حتى تعمل المشاركة في سفاري (تحتاج لمسة مباشرة) */
function backupFileName(enc){return "نيبور_كلاس_نسخة_احتياطية_"+todayStr()+(enc?"_مشفرة":"")+".json"}
function markBackupDone(how){
  S.settings.lastBackup=todayStr();S.settings.lastBackupAt=new Date().toISOString();delete S.settings.backupSnoozeUntil;save.settings();
  closeModal();if(S.tab==="home")render();if(el("dataSafety"))renderDataSafety();
  toast(how==="share"?"تم حفظ النسخة الاحتياطية ✓":"تم تنزيل النسخة — انقلها إلى «الملفات» أو iCloud ✓");
}
function downloadBackupFile(file){const a=document.createElement("a");const u=URL.createObjectURL(file);a.href=u;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000)}
function openBackupSheet(){
  let raw,parsed;
  try{raw=backupData();parsed=JSON.parse(raw)}catch(e){console.error("backup build",e);toast("تعذّر تجهيز النسخة الاحتياطية — حاول مرة أخرى");return}
  const ls=parsed.lectureStore&&parsed.lectureStore.data||{};const lec=(ls["masar-education-v1-lectures"]||[]).length;
  const d=parsed.data||{};const counts=[[ICON("users"),(d.students||[]).length,"طالب"],[ICON("book"),lec,"محاضرة"],[ICON("exam"),(d.exams||[]).length,"امتحان"]];
  const canShareFiles=!!(navigator.share&&navigator.canShare);
  el("modal").innerHTML='<div class="overlay"><div class="sheet backupSheet"><div class="sheetHead"><h3>نسخة احتياطية كاملة</h3><button class="x" id="bsX">✕</button></div><div class="form">'+
    '<div class="bsSummary">'+counts.map(c=>'<div class="bsItem">'+c[0]+'<b>'+c[1]+'</b><span>'+c[2]+'</span></div>').join("")+'<div class="bsItem">'+ICON("clipboard")+'<b>'+fmtBytes(new Blob([raw]).size)+'</b><span>حجم الملف</span></div></div>'+
    (parsed.lectureStore?'':'<p class="bsWarn">'+ICON("alert")+' تعذّر تضمين المحاضرات في هذه النسخة.</p>')+
    '<p class="bsHint">'+(canShareFiles?'بعد الضغط على «حفظ» اختر <b>«حفظ في الملفات»</b> ثم <b>iCloud Drive</b>، أو أرسل الملف لنفسك.':'سيُنزَّل الملف؛ انقله بعد ذلك إلى مكان خارج هذا الجهاز (iCloud أو Google Drive أو بريدك).')+' اللقطات التلقائية داخل الجهاز لا تحمي من ضياع الجهاز نفسه.</p>'+
    (hasCrypto?'<label>كلمة مرور للتشفير (اختياري)<input id="bsPass" type="password" autocomplete="new-password" placeholder="اتركها فارغة للحفظ دون تشفير"></label><p class="bsWarn" id="bsPassWarn" hidden>'+ICON("alert")+' إذا نسيت كلمة المرور لا يمكن فتح هذه النسخة نهائيًا.</p>':'')+
    '</div><div class="sheetFoot"><button class="btn ghost" id="bsCancel">إلغاء</button><button class="btn" id="bsSave">'+ICON("clipboard")+'<span>حفظ النسخة</span></button></div></div></div>';
  el("bsX").onclick=el("bsCancel").onclick=closeModal;
  let ready={pass:"",file:new File([raw],backupFileName(false),{type:"application/json"})},seq=0;
  const btn=el("bsSave"),setBusy=b=>{btn.disabled=b;btn.querySelector("span").textContent=b?"جارِ التجهيز…":"حفظ النسخة"};
  const pass=el("bsPass");let tm;
  if(pass)pass.oninput=()=>{const v=pass.value.trim();el("bsPassWarn").hidden=!v;setBusy(true);clearTimeout(tm);const my=++seq;
    tm=setTimeout(async()=>{let f;if(!v)f=new File([raw],backupFileName(false),{type:"application/json"});else{try{f=new File([await encryptBackupText(raw,v)],backupFileName(true),{type:"application/json"})}catch(e){console.error("encrypt",e);if(my===seq){toast("تعذّر التشفير");pass.value="";el("bsPassWarn").hidden=true;ready={pass:"",file:new File([raw],backupFileName(false),{type:"application/json"})};setBusy(false)}return}}
      if(my===seq){ready={pass:v,file:f};setBusy(false)}},350)};
  btn.onclick=()=>{
    if(btn.disabled)return;if(pass&&pass.value.trim()!==ready.pass)return;
    const file=ready.file;
    if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
      navigator.share({files:[file]}).then(()=>markBackupDone("share")).catch(err=>{if(err&&err.name==="AbortError")return;console.warn("share failed",err);downloadBackupFile(file);markBackupDone("download")});
    }else{downloadBackupFile(file);markBackupDone("download")}
  };
}
async function exportBackup(preparedData){
  try{
    const data=preparedData!==undefined?preparedData:await maybeEncryptBackup(backupData());
    if(data===null)return;
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([data],{type:"application/json"}));
    a.download="نسخة_احتياطية_الطلبة_"+todayStr()+".json";a.click();
    S.settings.lastBackup=todayStr();save.settings();
    if(S.tab==="home")render();
    toast("تم تنزيل النسخة الاحتياطية");
  }catch(e){
    console.error("exportBackup failed",e);
    toast("تعذّر إنشاء النسخة الاحتياطية — حاول مرة أخرى");
  }
}
el("importFile").onchange=e=>{
  const f=e.target.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=async()=>{try{
    let d=JSON.parse(r.result);
    if(d&&d.masarEncrypted){
      const pass=prompt("🔒 هذه النسخة مشفّرة — اكتب كلمة المرور لفتحها:");
      if(pass===null)return;
      try{d=JSON.parse(await decryptBackupObj(d,pass))}
      catch(err){toast("كلمة المرور غير صحيحة أو الملف تالف");return}
    }
    if(d&&d.schema==="nibor-class-full-backup"){if(!window.MasarDB){toast("هذا الإصدار لا يدعم النسخ الكاملة");return}if(!confirm("استيراد نسخة كاملة يستبدل كل البيانات والمحاضرات الحالية (تُحفظ لقطة قبلها تلقائيًا). متابعة؟"))return;const n=await window.MasarDB.importAll(d);try{window.NiborLectureSync&&window.NiborLectureSync.markRestored();await window.MasarDB.whenFlushed()}catch(_){}toast("تم استيراد "+n+" عنصرًا — جارِ إعادة التحميل…");setTimeout(()=>location.reload(),900);return}
    const lectureStore=(d&&d.masarBackup&&d.lectureStore)||null;
    d=unwrapBackup(d);
    const schemaErr=validateBackupSchema(d);
    if(schemaErr){toast("⚠️ "+schemaErr+" — أُلغي الاستيراد لحماية بياناتك");return}
    if(d.settings&&(d.settings.pin||d.settings.pinHash||d.settings.sync)){
      if(!confirm("هذا الملف يحتوي أيضاً على رمز قفل و/أو إعدادات مزامنة سحابية — استيراده سيستبدل رمز القفل وإعدادات المزامنة الحالية بجهازك. متابعة؟"))return;
    }
    d=sanitizeImportedData(d);
    if(window.MasarDB&&window.MasarDB.mode==="idb"){try{await window.MasarDB.snapshot("قبل استيراد نسخة احتياطية")}catch(_){}}
    if(!await createPreImportSnapshot()){if(!confirm("تعذّر إنشاء نقطة استرجاع تلقائية قبل الاستيراد. متابعة رغم ذلك؟"))return}
    S.students=d.students||[];S.grades=d.grades||{};S.attendance=d.attendance||{};
    S.payments=d.payments||{};S.behavior=d.behavior||{};S.homework=d.homework||[];S.timetable=d.timetable||[];S.dailyPlans=d.dailyPlans||[];S.exams=d.exams||[];S.messages=d.messages||{};S.events=d.events||[];S.qbank=d.qbank||[];S.examTemplates=d.examTemplates||[];S.settings=d.settings||S.settings;
    save.students();save.grades();save.attendance();save.payments();save.behavior();save.homework();save.timetable();save.dailyPlans&&save.dailyPlans();save.exams();save.messages();save.events();save.qbank();save.examTemplates();save.settings();
    let lecMsg="";if(lectureStore&&window.MasarStorage){try{window.MasarStorage.importBackup(lectureStore,{replace:true});try{window.NiborLectureSync&&window.NiborLectureSync.markRestored()}catch(_){}lecMsg=" مع المحاضرات"}catch(err){console.error("lectures import",err);lecMsg=" (تعذر استيراد المحاضرات)"}}
    el("schoolName").value=S.settings.school;render();toast("تم استيراد البيانات"+lecMsg+" ✓");
  }catch(err){toast("ملف غير صالح")}};
  r.readAsText(f);e.target.value="";
};

