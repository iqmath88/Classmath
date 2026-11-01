/* =========================================================
   مسار التعليم — مصمم المحاضرات v2.8.9 — KaTeX & Preview Binding Fix
   نموذج أولي مستقل مبني فوق مشروع مسار المستقر
   ========================================================= */
(function(){
"use strict";
const LECTURE_KEY="masar-education-v1-lectures";
const DRAFT_KEY="masar-education-v1-lecture-draft";
const PROJECTS_KEY="masar-education-v1-projects";
const BLOCK_LIBRARY_KEY="masar-education-v1-block-library";
let navigation={projectId:null,chapterId:null};
const BLOCK_TYPES={
  heading:{label:"عنوان فرعي",icon:"🔷"},
  objectives:{label:"أهداف المحاضرة",icon:"🎯"},
  text:{label:"فقرة شرح",icon:"📝"},
  definition:{label:"تعريف",icon:"📘"},
  rule:{label:"قاعدة",icon:"📐"},
  theorem:{label:"نظرية",icon:"📙"},
  proof:{label:"برهان",icon:"🧾"},
  example:{label:"مثال محلول",icon:"✳️"},
  note:{label:"ملاحظة",icon:"💡"},
  exercise:{label:"تمرين",icon:"✍️"},
  activity:{label:"نشاط",icon:"🧩"},
  check:{label:"تحقق من فهمك",icon:"🧠"},
  ministerial:{label:"سؤال وزاري",icon:"🏛️"},
  image:{label:"صورة أو رسم",icon:"🖼️"},
  homework:{label:"واجب بيتي",icon:"🏠"},
  math:{label:"معادلة",icon:"∑"},
  graph:{label:"رسم بياني",icon:"📈"},
  geometry:{label:"هندسة",icon:"📐"},
  conic:{label:"قطع مخروطي",icon:"🟣"},
  table:{label:"جدول ذكي",icon:"▦"},
  matrix:{label:"مصفوفة",icon:"▤"},
  illustration:{label:"رسم توضيحي",icon:"✏️"},
  summary:{label:"خلاصة",icon:"✅"},
  pagebreak:{label:"فاصل / صفحة فارغة",icon:"⤓"}
};
// v2.9.1: أيقونات خطية لأنواع الكتل (بدل الإيموجي)
const BLOCK_ICONS={pagebreak:'pagebreak',heading:'sparkle',objectives:'sunrise',text:'alignRight',definition:'book',rule:'bolt',theorem:'star',proof:'listNumber',example:'exam',note:'pin',exercise:'pen',activity:'users',check:'check',ministerial:'building',image:'image',homework:'clipboard',graph:'graph',geometry:'expand',conic:'graph',table:'table',matrix:'table',illustration:'pen',summary:'listBullet'};
function blockIcon(type){if(type==='math')return '<span class="rtSigma">∑</span>';const n=BLOCK_ICONS[type];return (n&&window.ICON)?ICON(n):((BLOCK_TYPES[type]||{}).icon||'•')}
let pendingInsertAt=null;
function editorFocusPref(){try{return localStorage.getItem('nibor-editor-focus')!=='off'}catch(_){return true}}
function applyEditorFocus(on){document.body.classList.toggle('editorFocus',!!on);const b=document.getElementById('focusToggle');if(b){b.classList.toggle('on',!!on);b.setAttribute('aria-pressed',String(!!on))}}
let editorLecture=null;
let draggedBlockIndex=null;
let selectedBlockIndex=0;
const history=new (window.MasarDocumentCore?.CommandHistory||class{reset(){} commit(){} undo(){return null} redo(){return null} state(){return {canUndo:false,canRedo:false}}})(60);
function normalizeLecture(doc){return window.MasarDocumentCore?window.MasarDocumentCore.migrateLecture(doc):doc}
function historyCommit(label){if(editorLecture)history.commit(editorLecture,label||"تعديل");updateHistoryButtons()}
// v2.8.16: خطوة تراجع لكل دفعة كتابة (بعد توقف قصير) بدل كل حرف، والأزرار تتحدث فورًا.
let historyTimer=null;
function isTypingTarget(el){return !!el&&(el.isContentEditable||el.tagName==='TEXTAREA'||(el.tagName==='INPUT'&&/^(text|search|url|email|tel)?$/i.test(el.getAttribute('type')||'')))}
// الكتابة تُجمَّع في خطوة واحدة؛ الإجراءات البنائية (إضافة عنصر، تغيير حجم جدول…) خطوة مستقلة فورًا.
function scheduleHistoryCommit(){if(!isTypingTarget(document.activeElement)){flushHistory();return}clearTimeout(historyTimer);historyTimer=setTimeout(flushHistory,650);updateHistoryButtons()}
function flushHistory(){if(historyTimer){clearTimeout(historyTimer);historyTimer=null}historyCommit("تحرير")}
function updateHistoryButtons(){const ub=document.getElementById("undoLecture"),rb=document.getElementById("redoLecture");if(!ub&&!rb)return;const hs=history.state?history.state():{canUndo:false,canRedo:false};if(ub)ub.disabled=!(hs.canUndo||historyTimer);if(rb)rb.disabled=!hs.canRedo}
function activeRichSpot(){const a=document.activeElement;if(a&&a.classList&&a.classList.contains('richContent'))return {i:a.dataset.richIndex,f:a.dataset.richField};return null}
function focusRichSpot(spot){if(!spot)return;const ed=document.querySelector('.richContent[data-rich-index="'+spot.i+'"][data-rich-field="'+spot.f+'"]');if(!ed)return;ed.focus();const r=document.createRange();r.selectNodeContents(ed);r.collapse(false);const sel=window.getSelection();sel.removeAllRanges();sel.addRange(r);rememberRichRange(ed)}
function restoreHistory(snapshot){if(!snapshot)return;const spot=activeRichSpot();editorLecture=normalizeLecture(snapshot);selectedBlockIndex=Math.min(selectedBlockIndex,Math.max(0,editorLecture.blocks.length-1));renderLectureEditor();updateHistoryButtons();focusRichSpot(spot);draftSave()}

function uid(){return "lec_"+Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function clone(v){return JSON.parse(JSON.stringify(v))}
function storageGet(key,fallback){return window.MasarStorage?window.MasarStorage.get(key,fallback):(function(){try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch(_){return fallback}})()}
function storageSet(key,value){return window.MasarStorage?window.MasarStorage.set(key,value):localStorage.setItem(key,JSON.stringify(value))}
function storageRemove(key){return window.MasarStorage?window.MasarStorage.remove(key):localStorage.removeItem(key)}
function loadLectures(){const list=storageGet(LECTURE_KEY,[]);return Array.isArray(list)?list:[]}
function saveLectures(list){storageSet(LECTURE_KEY,list)}
function loadBlockLibrary(){const list=storageGet(BLOCK_LIBRARY_KEY,[]);return Array.isArray(list)?list:[]}
function saveBlockLibrary(list){storageSet(BLOCK_LIBRARY_KEY,list)}
function loadProjects(){let list=storageGet(PROJECTS_KEY,[]);if(!Array.isArray(list))list=[];if(!list.length){const now=new Date().toISOString(),legacy=loadLectures();const project={id:"prj_legacy",title:"مشروعي الأول",grade:legacy[0]?.grade||"السادس العلمي",subject:legacy[0]?.subject||"الرياضيات",createdAt:now,updatedAt:now,chapters:[{id:"ch_legacy",title:legacy[0]?.chapter||"الفصل الأول",order:1}]};list=[project];legacy.forEach(l=>{l.projectId=project.id;l.chapterId=project.chapters[0].id});saveLectures(legacy);saveProjects(list)}return list}
function saveProjects(list){storageSet(PROJECTS_KEY,list)}
function projectById(id){return loadProjects().find(p=>p.id===id)}
function chapterById(project,id){return project?.chapters?.find(c=>c.id===id)}
function lastTeacherInfo(){try{const L=loadLectures().filter(x=>x&&x.updatedAt).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));const t=L.find(x=>x.teacher);const p=L.find(x=>typeof x.phone==='string');return {teacher:t?t.teacher:'الأستاذ فائز الحمداني',phone:p?p.phone:DEFAULT_TEACHER_PHONE}}catch(_){return {teacher:'الأستاذ فائز الحمداني',phone:DEFAULT_TEACHER_PHONE}}}
function blankLecture(){const p=projectById(navigation.projectId),c=chapterById(p,navigation.chapterId);return normalizeLecture({id:uid(),projectId:p?.id||null,chapterId:c?.id||null,title:"الصيغة الجبرية للعدد المركب",subject:"الرياضيات",grade:p?.grade||"السادس العلمي",chapter:c?.title||"الأعداد المركبة",lectureNo:"1",teacher:lastTeacherInfo().teacher,phone:lastTeacherInfo().phone,theme:"academic",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),blocks:[
  {id:uid(),type:"heading",title:"أهداف المحاضرة",content:"أن يتعرّف الطالب إلى الصيغة الجبرية للعدد المركب ويميّز بين جزئه الحقيقي والتخيلي."},
  {id:uid(),type:"definition",title:"تعريف",content:"العدد المركب هو عدد يُكتب بالصورة $z=a+bi$، حيث $a,b\\in\\mathbb{R}$ و $i^2=-1$."},
  {id:uid(),type:"example",title:"مثال محلول",content:"اكتب العدد $z=3-2i$ محددًا الجزء الحقيقي والجزء التخيلي.",solution:"لدينا $\\operatorname{Re}(z)=3$ و $\\operatorname{Im}(z)=-2$."},
  {id:uid(),type:"exercise",title:"تحقق من فهمك",content:"حدّد الجزء الحقيقي والجزء التخيلي للعدد $w=-5+4i$."},
  {id:uid(),type:"homework",title:"الواجب البيتي",content:"حل تمارين الكتاب المتعلقة بالصورة الجبرية للعدد المركب."}
]})}
function safe(v){return typeof esc==="function"?esc(String(v??"")):String(v??"").replace(/[&<>\"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]))}

// عارض KaTeX محلي وآمن. كان استدعاؤه موجودًا في محرر المحاضرات
// من دون تعريف، ما كان يوقف bindEditor قبل ربط زر المعاينة.
function renderKatex(root){
  const scope=(root&&typeof root.querySelectorAll==="function")?root:document;
  const nodes=[];
  if(scope?.matches?.('.eduMath,.richEquation,.eqSymbolMath,.eqHistoryMath'))nodes.push(scope);
  if(scope?.querySelectorAll)nodes.push(...scope.querySelectorAll('.eduMath,.richEquation,.eqSymbolMath,.eqHistoryMath'));
  nodes.forEach(node=>{
    // لا نعتمد على data-rendered وحده؛ فقد ينتقل من محرر النص إلى المعاينة
    // بينما لا يحتوي العنصر الجديد على مخرجات KaTeX فعلية.
    if(!node)return;
    if(node.dataset?.rendered==="true" && node.querySelector?.('.katex'))return;
    const latex=String(node.dataset?.latex||node.textContent||"").trim();
    if(!latex)return;
    const display=node.dataset?.display==="true"||node.classList?.contains('eduMathDisplay')||node.classList?.contains('richEquationDisplay');
    try{
      if(window.katex&&typeof window.katex.render==="function")
        window.katex.render(latex,node,{throwOnError:false,displayMode:!!display,strict:"ignore",trust:false});
      else node.textContent=latex;
      if(node.dataset)node.dataset.rendered="true";
    }catch(err){
      console.warn('تعذر رسم معادلة KaTeX؛ تم إبقاء النص الأصلي.',err);
      node.textContent=latex;
      if(node.dataset)node.dataset.rendered="error";
    }
  });
}
function fmtDate(iso){try{return new Date(iso).toLocaleDateString("ar-IQ")}catch(_){return ""}}
// v2.8.16: أثناء إعادة الرسم لا يُسمح لحدث blur بكتابة محتوى DOM القديم فوق البيانات الجديدة (كان يُفسد التراجع).
let replacingContent=false;
function setContent(html){const c=document.getElementById("content");if(!c)return;const a=document.activeElement;if(a&&a!==document.body&&c.contains(a)){replacingContent=true;try{a.blur()}catch(_){}finally{replacingContent=false}}c.innerHTML=html;const page=c.firstElementChild;const inEd=!!(page&&page.classList.contains('lectureEditor'));document.body.classList.toggle('inLectureEditor',inEd);if(!inEd)document.body.classList.remove('editorFocus');if(page&&page.classList.contains('eduPage'))showDraftBanner(page)}
// v2.8.16: استرجاع المسودة غير المحفوظة (كانت تُكتب ولا تُقرأ أبدًا).
function pendingDraft(){let d=null;try{d=storageGet(DRAFT_KEY,null)}catch(_){d=null}if(!d||typeof d!=='object'||!Array.isArray(d.blocks)||!d.blocks.length)return null;const saved=loadLectures().find(x=>x.id===d.id);if(saved){const pick=l=>JSON.stringify({t:l.title,b:l.blocks});if(pick(saved)===pick(normalizeLecture(clone(d))))return null}return {draft:d,saved:!!saved}}
function showDraftBanner(page){const p=pendingDraft();if(!p)return;const d=p.draft;let when='';try{when=new Date(d.updatedAt||Date.now()).toLocaleString('ar-IQ-u-nu-latn',{weekday:'long',hour:'2-digit',minute:'2-digit'})}catch(_){}
 page.insertAdjacentHTML('afterbegin','<div class="draftBanner" id="draftBanner" role="status"><span class="draftIc">'+(window.ICON?ICON('pen'):'✎')+'</span><div class="draftText"><b>لديك '+(p.saved?'تعديلات غير محفوظة':'مسودة غير محفوظة')+'</b><span>«'+safe(d.title||'محاضرة بلا عنوان')+'»'+(when?' — آخر تعديل: '+safe(when):'')+'</span></div><button type="button" class="eduPrimary" id="draftResume">استكمال</button><button type="button" class="eduGhost" id="draftDiscard">تجاهل</button></div>');
 document.getElementById('draftResume').onclick=()=>{editorLecture=normalizeLecture(clone(d));navigation={projectId:d.projectId||navigation.projectId||null,chapterId:d.chapterId||navigation.chapterId||null};history.reset(editorLecture);renderLectureEditor();const s=document.getElementById('lectureSaveState');if(s)s.textContent='مسودة مستعادة — اضغط «حفظ» لتثبيتها'};
 document.getElementById('draftDiscard').onclick=()=>{if(!confirm('تجاهل المسودة نهائيًا؟ لا يمكن استرجاعها بعد ذلك.'))return;storageRemove(DRAFT_KEY);document.getElementById('draftBanner')?.remove()}}
function draftSave(){if(!editorLecture)return;editorLecture.updatedAt=new Date().toISOString();try{storageSet(DRAFT_KEY,editorLecture)}catch(err){storageFull(err);return}clearStorageWarning();const s=document.getElementById("lectureSaveState");if(s){s.textContent="تم الحفظ تلقائيًا";s.classList.remove("saveFailed")}}
// v2.8.16: لا فشل صامت — تنبيه واضح عند امتلاء التخزين مع حلول مباشرة.
let storageWarnShown=0;
function isQuotaError(err){return err&&(err.name==='QuotaExceededError'||err.code===22||err.code===1014||/quota|exceeded/i.test(String(err.message||err)))}
function storageFull(err){console.error('تعذر الحفظ',err);const s=document.getElementById("lectureSaveState");if(s){s.textContent="⚠️ لم تُحفظ آخر التعديلات";s.classList.add("saveFailed")}
 const host=document.querySelector('.lectureEditor');if(host&&!document.getElementById('storageWarn')){host.insertAdjacentHTML('afterbegin','<div class="storageWarn" id="storageWarn" role="alert"><b>'+(isQuotaError(err)?'مساحة التخزين في المتصفح ممتلئة':'تعذر الحفظ التلقائي')+'</b><span>آخر التعديلات لم تُحفظ بعد. صغّر الصور أو خذ نسخة احتياطية، ثم تابع.</span><button type="button" class="eduPrimary" id="shrinkImgsBtn">تصغير صور المحاضرة</button><button type="button" class="eduGhost" id="warnBackupBtn">نسخة احتياطية</button></div>');document.getElementById('shrinkImgsBtn').onclick=async()=>{const n=await shrinkLectureImages(editorLecture,0);renderLectureEditor();draftSave();if(typeof toast==='function')toast(n?'تم تصغير '+n+' صورة ✓':'لا توجد صور كبيرة لتصغيرها')};document.getElementById('warnBackupBtn').onclick=()=>window.MasarStorage?.downloadBackup?.()}
 if(Date.now()-storageWarnShown>30000&&typeof toast==='function'){storageWarnShown=Date.now();toast('⚠️ لم تُحفظ التعديلات — التخزين ممتلئ')}}
function clearStorageWarning(){const w=document.getElementById('storageWarn');if(w)w.remove()}
// v2.9.0: الحفظ في IndexedDB غير متزامن — الأخطاء تصل كحدث
window.addEventListener('masar:storage-error',e=>{if(document.querySelector('.lectureEditor'))storageFull(e.detail)});
window.addEventListener('masar:storage-saved',()=>{if(document.getElementById('storageWarn')){clearStorageWarning();const s=document.getElementById('lectureSaveState');if(s){s.textContent='تم الحفظ تلقائيًا';s.classList.remove('saveFailed')}}});
function autoShrinkOnce(lec){if(!lec||lec.__shrinkChecked)return;Object.defineProperty(lec,'__shrinkChecked',{value:true,enumerable:false});const big=JSON.stringify(lec.blocks||[]).match(/data:image\/(?:png|jpe?g|webp);base64,[A-Za-z0-9+/=]{600000,}/);if(!big)return;setTimeout(async()=>{const n=await shrinkLectureImages(editorLecture,600000);if(n){renderLectureEditor();draftSave();if(typeof toast==='function')toast('تم تصغير '+n+' صورة كبيرة لتوفير المساحة ✓')}},50)}
// v2.8.16: تصغير الصور — أقصى بُعد 1600px وجودة 0.8 (صورة كاميرا ~1.5MB تصبح ~200KB).
const IMG_MAX_SIDE=1600,IMG_QUALITY=0.8;
function compressImageSrc(src,maxSide){return new Promise(resolve=>{const img=new Image();img.onload=()=>{try{const sc=Math.min(1,(maxSide||IMG_MAX_SIDE)/Math.max(img.naturalWidth,img.naturalHeight));const w=Math.max(1,Math.round(img.naturalWidth*sc)),h=Math.max(1,Math.round(img.naturalHeight*sc));const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,w,h);x.drawImage(img,0,0,w,h);const out=c.toDataURL('image/jpeg',IMG_QUALITY);resolve(out.length<String(src).length?out:src)}catch(_){resolve(src)}};img.onerror=()=>resolve(src);img.src=src})}
function compressImageFile(file){return new Promise(resolve=>{const rd=new FileReader();rd.onload=async()=>{const src=String(rd.result||'');if(/^data:image\/(svg|gif)/i.test(src))return resolve(src);resolve(await compressImageSrc(src))};rd.onerror=()=>resolve('');rd.readAsDataURL(file)})}
async function shrinkLectureImages(lec,minBytes){if(!lec||!Array.isArray(lec.blocks))return 0;let n=0;for(const b of lec.blocks){for(const k of Object.keys(b)){if(!/Html$/.test(k)||typeof b[k]!=='string'||b[k].indexOf('data:image/')<0)continue;const srcs=[...new Set(b[k].match(/data:image\/(?:png|jpe?g|webp);base64,[A-Za-z0-9+/=]+/g)||[])];for(const src of srcs){if(src.length<(minBytes==null?400000:minBytes))continue;const out=await compressImageSrc(src);if(out!==src&&out.length<src.length){b[k]=b[k].split(src).join(out);n++}}}}return n}
function scheduleDraft(){scheduleHistoryCommit();const s=document.getElementById("lectureSaveState");if(s)s.textContent="جارِ الحفظ…";clearTimeout(scheduleDraft.t);scheduleDraft.t=setTimeout(draftSave,350)}

window.renderLectures=function(){renderProjectsDashboard()};
function renderProjectsDashboard(){
  navigation={projectId:null,chapterId:null};
  const projects=loadProjects(),lectures=loadLectures();
  setContent('<section class="eduPage projectWorkspace"><div class="eduHero"><div><span class="eduEyebrow">نيبور كلاس</span><h2>مشاريع التأليف</h2><p>نظّم الملازم إلى مشاريع وفصول ومحاضرات، ثم افتح المحرر مباشرة.</p></div><div class="eduHeroActions"><button class="eduGhost" id="backupLecturesBtn">⬇ نسخة احتياطية</button><button class="eduGhost" id="restoreLecturesBtn">⬆ استعادة</button><button class="eduPrimary" id="newProjectBtn">＋ مشروع جديد</button></div></div><div class="eduStats"><div><b>'+projects.length+'</b><span>مشروع</span></div><div><b>'+projects.reduce((n,p)=>n+(p.chapters?.length||0),0)+'</b><span>فصل</span></div><div><b>'+lectures.length+'</b><span>محاضرة</span></div></div>'+(projects.length?'<div class="projectGrid">'+projects.map(p=>{const count=lectures.filter(l=>l.projectId===p.id).length;return '<article class="projectCard"><div class="projectIcon">📘</div><div class="projectCardBody"><span>'+safe(p.subject||"الرياضيات")+'</span><h3>'+safe(p.title)+'</h3><p>'+safe(p.grade||"")+'</p><div class="projectMeta"><span>'+(p.chapters?.length||0)+' فصول</span><span>'+count+' محاضرات</span></div></div><div class="projectActions"><button class="eduSecondary openProject" data-id="'+safe(p.id)+'">فتح المشروع</button><button class="projectMore" data-delete-project="'+safe(p.id)+'" title="حذف">⋯</button></div></article>'}).join('')+'</div>':'<div class="eduEmpty"><div>📚</div><h3>أنشئ مشروعك الأول</h3><p>مثال: ملزمة الرياضيات للسادس العلمي.</p><button class="eduPrimary" id="emptyNewProject">إنشاء مشروع</button></div>')+'</section>');
  const create=()=>createProject();document.getElementById('newProjectBtn').onclick=create;document.getElementById('emptyNewProject')&&(document.getElementById('emptyNewProject').onclick=create);
  document.querySelectorAll('.openProject').forEach(b=>b.onclick=()=>renderProject(b.dataset.id));
  document.querySelectorAll('[data-delete-project]').forEach(b=>b.onclick=()=>deleteProject(b.dataset.deleteProject));
  document.getElementById('backupLecturesBtn').onclick=()=>window.MasarStorage?.downloadBackup();document.getElementById('restoreLecturesBtn').onclick=restoreEducationBackup;
}
function createProject(){const title=prompt('اسم المشروع','ملزمة السادس العلمي');if(!title?.trim())return;const grade=prompt('الصف الدراسي','السادس العلمي')||'';const subject=prompt('المادة','الرياضيات')||'';const now=new Date().toISOString(),p={id:'prj_'+uid(),title:title.trim(),grade:grade.trim(),subject:subject.trim(),createdAt:now,updatedAt:now,chapters:[]};const list=loadProjects();list.unshift(p);saveProjects(list);renderProject(p.id)}
function deleteProject(id){const p=projectById(id);if(!p)return;const count=loadLectures().filter(l=>l.projectId===id).length;if(!confirm('حذف مشروع «'+p.title+'»'+(count?' وجميع محاضراته ('+count+')':'')+'؟'))return;saveProjects(loadProjects().filter(x=>x.id!==id));saveLectures(loadLectures().filter(l=>l.projectId!==id));renderProjectsDashboard()}
function breadcrumb(items){return '<nav class="eduBreadcrumb">'+items.map((x,i)=>'<button '+(x.action?'data-nav="'+x.action+'"':'disabled')+'>'+safe(x.label)+'</button>'+(i<items.length-1?'<span>‹</span>':'')).join('')+'</nav>'}
function bindBreadcrumb(){document.querySelectorAll('[data-nav="projects"]').forEach(b=>b.onclick=renderProjectsDashboard);document.querySelectorAll('[data-nav="project"]').forEach(b=>b.onclick=()=>renderProject(navigation.projectId))}
function renderProject(id){const p=projectById(id);if(!p)return renderProjectsDashboard();navigation={projectId:id,chapterId:null};const lectures=loadLectures();setContent('<section class="eduPage projectWorkspace">'+breadcrumb([{label:'المشاريع',action:'projects'},{label:p.title}])+'<div class="workspaceHeader"><div><span>'+safe(p.subject||'')+' · '+safe(p.grade||'')+'</span><h2>'+safe(p.title)+'</h2><p>اختر فصلًا أو أنشئ فصلًا جديدًا.</p></div><button class="eduPrimary" id="newChapterBtn">＋ فصل جديد</button></div>'+(p.chapters?.length?'<div class="chapterList">'+p.chapters.map((c,i)=>{const n=lectures.filter(l=>l.projectId===p.id&&l.chapterId===c.id).length;return '<article class="chapterRow"><button class="chapterOpen" data-chapter="'+safe(c.id)+'"><span class="chapterNumber">'+String(i+1).padStart(2,'0')+'</span><span><b>'+safe(c.title)+'</b><small>'+n+' محاضرات</small></span></button><button class="chapterDelete" data-delete-chapter="'+safe(c.id)+'">×</button></article>'}).join('')+'</div>':'<div class="eduEmpty compact"><div>📂</div><h3>لا توجد فصول بعد</h3><p>أنشئ الفصل الأول لتبدأ إضافة المحاضرات.</p></div>')+'</section>');bindBreadcrumb();document.getElementById('newChapterBtn').onclick=()=>createChapter(id);document.querySelectorAll('.chapterOpen').forEach(b=>b.onclick=()=>renderChapter(id,b.dataset.chapter));document.querySelectorAll('[data-delete-chapter]').forEach(b=>b.onclick=()=>deleteChapter(id,b.dataset.deleteChapter))}
function createChapter(projectId){const title=prompt('اسم الفصل','الفصل الأول');if(!title?.trim())return;const list=loadProjects(),p=list.find(x=>x.id===projectId);p.chapters=p.chapters||[];const c={id:'ch_'+uid(),title:title.trim(),order:p.chapters.length+1,createdAt:new Date().toISOString()};p.chapters.push(c);p.updatedAt=new Date().toISOString();saveProjects(list);renderChapter(projectId,c.id)}
function deleteChapter(projectId,chapterId){const p=projectById(projectId),c=chapterById(p,chapterId);if(!c)return;const count=loadLectures().filter(l=>l.projectId===projectId&&l.chapterId===chapterId).length;if(!confirm('حذف فصل «'+c.title+'»'+(count?' وجميع محاضراته ('+count+')':'')+'؟'))return;const list=loadProjects(),target=list.find(x=>x.id===projectId);target.chapters=target.chapters.filter(x=>x.id!==chapterId);saveProjects(list);saveLectures(loadLectures().filter(l=>!(l.projectId===projectId&&l.chapterId===chapterId)));renderProject(projectId)}
function renderChapter(projectId,chapterId){const p=projectById(projectId),c=chapterById(p,chapterId);if(!p||!c)return renderProject(projectId);navigation={projectId,chapterId};const list=loadLectures().filter(l=>l.projectId===projectId&&l.chapterId===chapterId);setContent('<section class="eduPage projectWorkspace">'+breadcrumb([{label:'المشاريع',action:'projects'},{label:p.title,action:'project'},{label:c.title}])+'<div class="workspaceHeader"><div><span>'+safe(p.title)+'</span><h2>'+safe(c.title)+'</h2><p>المحاضرات مرتبة داخل هذا الفصل.</p></div><button class="eduPrimary" id="newLectureBtn">＋ محاضرة جديدة</button></div>'+(list.length?'<div class="eduGrid">'+list.map((l,i)=>'<article class="lectureCard"><div class="lectureCardTop"><span>المحاضرة '+safe(l.lectureNo||i+1)+'</span><button class="lectureMenuBtn" data-del="'+safe(l.id)+'">×</button></div><h3>'+safe(l.title||'محاضرة بلا عنوان')+'</h3><p>'+safe(l.grade||'')+' · '+safe(c.title)+'</p><div class="lectureMeta"><span>'+safe(l.subject||'')+'</span><span>'+fmtDate(l.updatedAt)+'</span></div><button class="eduSecondary openLecture" data-id="'+safe(l.id)+'">فتح وتحرير</button></article>').join('')+'</div>':'<div class="eduEmpty compact"><div>📝</div><h3>ابدأ أول محاضرة</h3><p>سيُنشئ التطبيق نموذجًا جاهزًا داخل هذا الفصل.</p><button class="eduPrimary" id="emptyNewLecture">إنشاء المحاضرة الأولى</button></div>')+'</section>');bindBreadcrumb();const create=()=>{editorLecture=blankLecture();editorLecture.lectureNo=String(list.length+1);history.reset(editorLecture);renderLectureEditor()};document.getElementById('newLectureBtn').onclick=create;document.getElementById('emptyNewLecture')&&(document.getElementById('emptyNewLecture').onclick=create);document.querySelectorAll('.openLecture').forEach(b=>b.onclick=()=>{const l=loadLectures().find(x=>x.id===b.dataset.id);if(l){editorLecture=normalizeLecture(clone(l));history.reset(editorLecture);renderLectureEditor()}});document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{if(!confirm('حذف هذه المحاضرة؟'))return;saveLectures(loadLectures().filter(x=>x.id!==b.dataset.del));renderChapter(projectId,chapterId)})}


function restoreEducationBackup(){
  if(!window.MasarStorage){alert("تعذر تشغيل الاستعادة.");return}
  const input=document.createElement("input");input.type="file";input.accept="application/json,.json";input.style.display="none";document.body.appendChild(input);
  input.onchange=()=>{const file=input.files&&input.files[0];if(!file){input.remove();return}const reader=new FileReader();reader.onload=()=>{try{const payload=JSON.parse(String(reader.result||""));const check=window.MasarStorage.validateBackup(payload);if(!check.ok)throw new Error(check.error);if(!confirm("سيتم دمج بيانات النسخة الاحتياطية مع البيانات الحالية ثم إعادة تحميل التطبيق. هل تريد المتابعة؟"))return;window.MasarStorage.importBackup(payload,{replace:false});alert("تمت استعادة النسخة الاحتياطية بنجاح.");location.reload()}catch(err){alert(err&&err.message?err.message:"تعذر استعادة النسخة الاحتياطية.")}finally{input.remove()}};reader.onerror=()=>{alert("تعذر قراءة الملف.");input.remove()};reader.readAsText(file,"utf-8")};
  input.click();
}

function renderLectureEditor(){
  if(!editorLecture)editorLecture=blankLecture();
  editorLecture=normalizeLecture(editorLecture);
  autoShrinkOnce(editorLecture);
  const I2=n=>(window.ICON?ICON(n):'');
  setContent('<section class="lectureEditor writeMode">'+
   '<div class="editorTopbar"><button class="eduGhost" id="backLectures">‹ المحاضرات</button><div class="editorTitle"><b>تحرير المحاضرة</b><span id="lectureSaveState">مسودة محلية</span></div><div class="editorActions"><button class="eduGhost etIcon" id="openPalette" title="إضافة عنصر">'+I2('plus')+'<span>عنصر</span></button><button class="eduGhost etIcon" id="openProps" title="خصائص العنصر المحدد">'+I2('settings')+'</button><button class="eduGhost etIcon" id="focusToggle" title="وضع التركيز: إخفاء قائمة التطبيق" aria-pressed="false">'+I2('expand')+'</button><button class="eduGhost" id="undoLecture" title="تراجع">↶</button><button class="eduGhost" id="redoLecture" title="إعادة">↷</button><button class="eduSecondary" id="previewLecture">معاينة</button><button class="eduPrimary" id="saveLecture">حفظ</button></div></div>'+
   '<details class="lectureInfoDetails"'+(editorLecture.title?'':' open')+'><summary><span class="lidTitle">'+safe(editorLecture.title||'محاضرة بلا عنوان')+'</span><span class="lidMeta">'+safe([editorLecture.subject,editorLecture.grade,editorLecture.chapter].filter(Boolean).join(' · '))+'</span><span class="lidEdit">بيانات المحاضرة</span></summary><div class="lectureInfoPanel"><label>عنوان المحاضرة<input id="lecTitle" value="'+safe(editorLecture.title)+'"></label><label>المادة<input id="lecSubject" value="'+safe(editorLecture.subject)+'"></label><label>الصف<input id="lecGrade" value="'+safe(editorLecture.grade)+'"></label><label>الفصل أو الوحدة<input id="lecChapter" value="'+safe(editorLecture.chapter)+'"></label><label>رقم المحاضرة<input id="lecNo" value="'+safe(editorLecture.lectureNo)+'"></label><label>اسم الأستاذ<input id="lecTeacher" value="'+safe(editorLecture.teacher)+'"></label><label>رقم الهاتف<input id="lecPhone" type="tel" dir="ltr" inputmode="tel" value="'+safe(lecturePhone(editorLecture))+'" placeholder="07xxxxxxxxx"></label><label>حجم خط الطباعة<select id="lecTextSize">'+[['12','12 — مضغوط'],['13','13 — متوازن (مقترح)'],['14','14 — كبير']].map(([v,t])=>'<option value="'+v+'"'+(lectureTextSize(editorLecture)===Number(v)?' selected':'')+'>'+t+'</option>').join('')+'</select></label><label>ألوان المستند<select id="lecColorTheme"><option value="royal"'+(lectureTheme(editorLecture)==='royal'?' selected':'')+'>ملكي (كحلي وأحمر)</option><option value="classic"'+(lectureTheme(editorLecture)==='classic'?' selected':'')+'>أسود (للاستنساخ)</option></select></label>'+watermarkPanelHTML()+'</div></details>'+
   '<div class="builderLayout authorCanvasLayout"><aside class="blockPalette" aria-label="إضافة عنصر"><div class="drawerHead"><b>إضافة عنصر</b><button class="drawerClose" data-close-drawer title="إغلاق">✕</button></div><div class="paletteTabs"><button class="active" data-palette-tab="types">العناصر</button><button data-palette-tab="library">مكتبتي</button></div><div id="paletteTypes"><p class="paletteHint" id="paletteHint">اختر نوع الكتلة.</p>'+Object.entries(BLOCK_TYPES).map(([k,v])=>'<button data-add-block="'+k+'"><span class="pIc">'+blockIcon(k)+'</span>'+v.label+'</button>').join("")+'</div><div id="paletteLibrary" hidden>'+libraryPaletteHTML()+'</div></aside><main class="blocksCanvas authorCanvas"><div class="canvasHeader"><div><b>لوحة التأليف</b><span>'+editorLecture.blocks.length+' عناصر</span></div><button class="eduGhost" id="addPageBreak">＋ فاصل صفحة</button></div><div id="blocksList" class="smartBlocksList">'+canvasBlocksHTML()+'</div></main><aside class="propertiesPanel" id="propertiesPanel">'+propertiesPanelHTML()+'</aside></div><div class="drawerBackdrop" data-close-drawer></div>'+
  '</section>');
  bindEditor();
  applyEditorFocus(editorFocusPref());
}
function legacyToRich(text){
  let out=safe(text||"").replace(/\$([^$]+)\$/g,(_,lx)=>'<span class="richEquation" contenteditable="false" data-latex="'+safe(lx)+'">'+safe(lx)+'</span>');
  out=out.replace(/\*\*([^*\n]+)\*\*/g,"<strong>$1</strong>").replace(/(^|[^*])\*([^*\n]+)\*/g,"$1<em>$2</em>");
  return out.split(/\n{2,}/).map(x=>'<p>'+x.replace(/\n/g,'<br>')+'</p>').join('')||'<p><br></p>';
}
function richValue(b,field){const k=field+'Html';if(b[k]){const clean=sanitizeRichHTML(b[k]);if(clean!==b[k])b[k]=clean;return clean}return legacyToRich(b[field]||'')}
function richToolbar(i,field){const I=n=>(window.ICON?ICON(n):'');return '<div class="richToolbar" data-toolbar-for="'+i+'-'+field+'">'+
 '<div class="rtRow rtMain">'+
 '<select data-rich-block title="نمط الفقرة"><option value="p">فقرة</option><option value="h2">عنوان كبير</option><option value="h3">عنوان فرعي</option><option value="blockquote">اقتباس/تنبيه</option></select>'+
 '<span class="rtGroup"><button data-rich-cmd="bold" title="غامق"><b>ع</b></button><button data-rich-cmd="italic" title="مائل"><i>م</i></button><button data-rich-cmd="underline" title="تحته خط"><u>س</u></button></span>'+
 '<span class="rtGroup"><button data-rich-cmd="insertUnorderedList" title="تعداد نقطي" aria-label="تعداد نقطي">'+I('listBullet')+'</button><button data-rich-cmd="insertOrderedList" title="تعداد رقمي" aria-label="تعداد رقمي">'+I('listNumber')+'</button></span>'+
 '<span class="rtGroup rtInsert"><button data-rich-insert="equation" title="إدراج معادلة"><span class="rtSigma">∑</span><span class="rtLbl">معادلة</span></button><button data-rich-insert="table" title="إدراج جدول">'+I('table')+'<span class="rtLbl">جدول</span></button><button data-rich-insert="image" title="إدراج صورة">'+I('image')+'<span class="rtLbl">صورة</span></button><button data-rich-insert="graph" title="رسم دالة">'+I('graph')+'<span class="rtLbl">دالة</span></button></span>'+
 '<button class="rtMoreBtn" data-rich-more title="أدوات إضافية: المحاذاة، الاتجاه، اللون" aria-expanded="false">'+I('more')+'</button>'+
 '</div>'+
 '<div class="rtRow rtMore" hidden>'+
 '<span class="rtGroup"><button data-rich-cmd="justifyRight" title="محاذاة يمين" aria-label="محاذاة يمين">'+I('alignRight')+'</button><button data-rich-cmd="justifyCenter" title="توسيط" aria-label="توسيط">'+I('alignCenter')+'</button><button data-rich-cmd="justifyLeft" title="محاذاة يسار" aria-label="محاذاة يسار">'+I('alignLeft')+'</button></span>'+
 '<span class="rtGroup"><button data-rich-dir="rtl" title="اتجاه الفقرة من اليمين إلى اليسار">RTL</button><button data-rich-dir="ltr" title="اتجاه الفقرة من اليسار إلى اليمين">LTR</button><button data-rich-dir="auto" title="اتجاه تلقائي">تلقائي</button><span class="richDirectionStatus" data-dir-status>تلقائي</span></span>'+
 '<span class="rtGroup"><label class="richColor" title="لون النص">A<input type="color" data-rich-color></label><button data-rich-cmd="removeFormat" title="إزالة التنسيق" aria-label="إزالة التنسيق">'+I('eraser')+'</button></span>'+
 '</div></div>'}
function richEditor(i,field,b,extraClass){return '<div class="compoundEditor '+(extraClass||'')+'">'+richToolbar(i,field)+'<div class="richContent" contenteditable="true" spellcheck="true" dir="auto" data-dir-mode="auto" data-rich-index="'+i+'" data-rich-field="'+field+'" data-placeholder="اكتب المحتوى، ثم أدرج معادلة أو جدولًا أو صورة في موضع المؤشر…">'+richValue(b,field)+'</div></div>'}
function smartPasteHint(){return '<span class="smartPasteHint" title="يحافظ المحرر على الفقرات والقوائم والجداول الأساسية">📋 لصق من Word</span>'}
function libraryPaletteHTML(){const list=loadBlockLibrary();return '<h3>مكتبتي</h3><p>كتل محفوظة لإعادة استخدامها.</p>'+(list.length?'<div class="savedBlocks">'+list.map((b,i)=>{const t=BLOCK_TYPES[b.type]||BLOCK_TYPES.text;return '<div class="savedBlock"><button data-insert-library="'+i+'"><span>'+t.icon+'</span><b>'+safe(b.title||t.label)+'</b></button><button data-remove-library="'+i+'" title="حذف">×</button></div>'}).join('')+'</div>':'<div class="libraryEmpty">احفظ أي كتلة من زر ☆ لتظهر هنا.</div>')}
function insertHandleHTML(index){return '<button class="canvasInsert" data-insert-at="'+index+'" title="إدراج عنصر هنا">＋ إدراج عنصر هنا</button>'}
function canvasBlocksHTML(){let out=insertHandleHTML(0);editorLecture.blocks.forEach((b,i)=>{out+=blockEditorHTML(b,i)+insertHandleHTML(i+1)});return out}
function selectedBlock(){return editorLecture?.blocks?.[Math.max(0,Math.min(selectedBlockIndex,editorLecture.blocks.length-1))]||null}
const SMART_TYPES=new Set(["definition","rule","theorem","proof","example","exercise","activity","check","ministerial","homework"]);
function ensureSmart(b){if(!b.smart||typeof b.smart!=="object")b.smart={};const s=b.smart;s.autoNumber=s.autoNumber!==false;s.difficulty=["easy","medium","hard"].includes(s.difficulty)?s.difficulty:"medium";s.marks=Number(s.marks)||0;s.tags=Array.isArray(s.tags)?s.tags:String(s.tags||"").split(",").map(x=>x.trim()).filter(Boolean);s.answerLines=Math.max(0,Number(s.answerLines)||0);s.showSolution=s.showSolution!==false;s.showDifficulty=s.showDifficulty===true;s.referenceLabel=String(s.referenceLabel||"");s.dependencies=Array.isArray(s.dependencies)?s.dependencies:[];return s}
function smartNumberFor(l,index,type){return l.blocks.slice(0,index+1).filter(x=>x.type===type&&ensureSmart(x).autoNumber!==false).length}
function smartLabel(l,b,index){const t=BLOCK_TYPES[b.type]?.label||b.title||"عنصر";return SMART_TYPES.has(b.type)&&ensureSmart(b).autoNumber!==false?t+" "+smartNumberFor(l,index,b.type):t}
function difficultyLabel(v){return v==='easy'?'سهل':v==='hard'?'متقدم':'متوسط'}
function dependencyOptions(current){return editorLecture.blocks.map((x,i)=>x.id!==current.id&&SMART_TYPES.has(x.type)?'<option value="'+safe(x.id)+'" '+(ensureSmart(current).dependencies.includes(x.id)?'selected':'')+'>'+safe(smartLabel(editorLecture,x,i))+' — '+safe(x.title||'')+'</option>':'').join('')}
function propertiesPanelHTML(){const b=selectedBlock();if(!b)return '<div class="propertiesEmpty">حدد عنصرًا لعرض خصائصه.</div>';const d=b.design||{},sm=ensureSmart(b);const math=b.type==='math'?'<div class="mathInspector"><h4>Math Inspector</h4><label>كود LaTeX<textarea data-math-prop="latex" dir="ltr" spellcheck="false">'+safe(b.latex||b.content||'')+'</textarea></label><label class="propCheck"><input type="checkbox" data-math-prop="numbered" '+(b.numbered!==false?'checked':'')+'> ترقيم المعادلة تلقائيًا</label><label>المحاذاة<select data-math-prop="mathAlign"><option value="center">وسط</option><option value="right">يمين</option><option value="left">يسار</option></select></label><label>حجم المعادلة<select data-math-prop="mathSize"><option value="1">عادي</option><option value="1.15">كبير</option><option value="1.3">كبير جدًا</option></select></label><button type="button" class="eduGhost" id="copySelectedLatex">نسخ LaTeX</button></div>':'';const smart=SMART_TYPES.has(b.type)?'<div class="smartInspector"><h4>خصائص العنصر الذكي</h4><label class="propCheck"><input type="checkbox" data-smart-prop="autoNumber" '+(sm.autoNumber!==false?'checked':'')+'> ترقيم تلقائي</label><label class="propCheck"><input type="checkbox" data-smart-prop="showDifficulty" '+(sm.showDifficulty?'checked':'')+'> إظهار مستوى الصعوبة في المعاينة والطباعة</label><label>مستوى الصعوبة<select data-smart-prop="difficulty"><option value="easy">سهل</option><option value="medium">متوسط</option><option value="hard">متقدم</option></select></label><label>الدرجة<input type="number" min="0" step="0.5" data-smart-prop="marks" value="'+safe(sm.marks)+'"></label><label>الوسوم<input type="text" data-smart-prop="tags" value="'+safe(sm.tags.join(', '))+'" placeholder="أعداد مركبة، وزاري"></label><label>أسطر الإجابة<input type="number" min="0" max="30" data-smart-prop="answerLines" value="'+safe(sm.answerLines)+'"></label><label class="propCheck"><input type="checkbox" data-smart-prop="showSolution" '+(sm.showSolution!==false?'checked':'')+'> إظهار الحل في الطباعة</label><label>وسم مرجعي<input type="text" data-smart-prop="referenceLabel" value="'+safe(sm.referenceLabel)+'" placeholder="مثال: thm-complex"></label><label>يعتمد على<select multiple size="4" data-smart-prop="dependencies">'+dependencyOptions(b)+'</select></label></div>':'';return '<div class="propertiesHead"><b>خصائص العنصر</b><span>'+safe(BLOCK_TYPES[b.type]?.label||b.type)+'</span></div>'+math+smart+'<label>لون العنوان<input type="color" data-prop="accent" value="'+safe(d.accent||'#0f172a')+'"></label><label>لون الخلفية<input type="color" data-prop="background" value="'+safe(d.background||'#ffffff')+'"></label><label>حجم النص<select data-prop="fontSize"><option value="1">عادي (حجم المحاضرة)</option><option value="1.15">أكبر قليلًا</option><option value="1.3">كبير</option><option value="1.45">كبير جدًا</option></select></label><label>المحاذاة<select data-prop="align"><option value="right">يمين</option><option value="center">وسط</option><option value="left">يسار</option><option value="justify">ضبط</option></select></label><label>شكل الحدود<select data-prop="borderStyle"><option value="solid">متصل</option><option value="dashed">متقطع</option><option value="none">بدون حدود</option></select></label><label>المسافة الداخلية<input type="range" min="6" max="28" step="1" data-prop="padding" value="'+safe(d.padding||12)+'"></label><label class="propCheck"><input type="checkbox" data-prop="hideTitle" '+(d.hideTitle?'checked':'')+'> إخفاء عنوان الكتلة في الطباعة</label><button class="eduGhost resetDesign" type="button">إعادة التصميم الافتراضي</button>'}
function refreshPropertiesPanel(){const p=document.getElementById('propertiesPanel');if(p){p.innerHTML=propertiesPanelHTML();bindPropertiesPanel()}}
function bindPropertiesPanel(){const b=selectedBlock();if(!b)return;const d=b.design||(b.design={});document.querySelectorAll('#propertiesPanel [data-prop]').forEach(el=>{const k=el.dataset.prop;if(el.tagName==='SELECT'&&k==='fontSize'){const sc=blockFontScale(d);el.value=[1,1.15,1.3,1.45].reduce((x,y)=>Math.abs(y-sc)<Math.abs(x-sc)?y:x,1)+''}else if(el.tagName==='SELECT'&&d[k]!=null)el.value=String(d[k]);el.oninput=()=>{d[k]=el.type==='checkbox'?el.checked:el.value;applyBlockDesign();scheduleDraft()}});document.querySelectorAll('#propertiesPanel [data-math-prop]').forEach(el=>{const k=el.dataset.mathProp;if(el.tagName==='SELECT'&&b[k]!=null)el.value=String(b[k]);el.oninput=()=>{b[k]=el.type==='checkbox'?el.checked:el.value;if(k==='latex')b.content=el.value;renderMathBlockPreview(selectedBlockIndex);scheduleDraft()}});const sm=ensureSmart(b);document.querySelectorAll('#propertiesPanel [data-smart-prop]').forEach(el=>{const k=el.dataset.smartProp;if(el.tagName==='SELECT'&&!el.multiple)el.value=String(sm[k]);el.oninput=()=>{if(k==='tags')sm[k]=el.value.split(',').map(x=>x.trim()).filter(Boolean);else if(k==='dependencies')sm[k]=[...el.selectedOptions].map(o=>o.value);else if(k==='marks'||k==='answerLines')sm[k]=Number(el.value)||0;else sm[k]=el.type==='checkbox'?el.checked:el.value;applyBlockDesign();scheduleDraft()}});const cp=document.getElementById('copySelectedLatex');if(cp)cp.onclick=async()=>{const code=b.latex||b.content||'';try{await navigator.clipboard.writeText(code);if(typeof toast==='function')toast('تم نسخ LaTeX ✓')}catch(_){prompt('انسخ كود LaTeX',code)}};const r=document.querySelector('#propertiesPanel .resetDesign');if(r)r.onclick=()=>{delete b.design;refreshPropertiesPanel();applyBlockDesign();scheduleDraft()}}
function applyBlockDesign(){document.querySelectorAll('.blockEditor').forEach(card=>{const i=Number(card.dataset.index),b=editorLecture.blocks[i],d=b.design||{};card.style.setProperty('--block-accent',d.accent||'#0f172a');card.style.setProperty('--block-bg',d.background||'#ffffff');card.style.setProperty('--block-font-size',(blockFontScale(d)*15)+'px');card.style.setProperty('--block-align',d.align||'right');card.style.setProperty('--block-border-style',d.borderStyle||'solid');card.style.setProperty('--block-padding',(d.padding||12)+'px');card.classList.toggle('selectedBlock',i===selectedBlockIndex)})}

// v2.10.0: فاصل صفحة / صفحة فارغة
function pageBreakEditor(i,b){const m=b.pageMode==='blank'?'blank':'break',pp=['blank','lined','grid'].includes(b.paper)?b.paper:'blank';
 return '<div class="pageBreakEditor"><label>النوع<select data-pb="pageMode" data-pb-i="'+i+'"><option value="break"'+(m==='break'?' selected':'')+'>ابدأ ما بعده في صفحة جديدة</option><option value="blank"'+(m==='blank'?' selected':'')+'>أدرج صفحة فارغة كاملة</option></select></label><label class="pbBlankOnly"'+(m==='blank'?'':' hidden')+'>شكل الصفحة<select data-pb="paper" data-pb-i="'+i+'"><option value="blank"'+(pp==='blank'?' selected':'')+'>فارغة</option><option value="lined"'+(pp==='lined'?' selected':'')+'>مسطّرة</option><option value="grid"'+(pp==='grid'?' selected':'')+'>مربعات</option></select></label><label class="pbBlankOnly"'+(m==='blank'?'':' hidden')+'>عنوان الصفحة (اختياري)<input data-pb="caption" data-pb-i="'+i+'" value="'+safe(b.caption||'')+'" placeholder="مثل: ملاحظات، حل التمارين"></label><div class="pbLine"><span>'+(m==='blank'?'صفحة فارغة كاملة هنا':'صفحة جديدة من هنا')+'</span></div></div>'}
function pageBreakPrintHTML(b,i){if(b.pageMode!=='blank')return '<div class="lecturePageBreak" data-lecture-block="'+i+'"></div>';const pp=['blank','lined','grid'].includes(b.paper)?b.paper:'blank';return '<section class="lectureBlankPage paper-'+pp+'" data-lecture-block="'+i+'">'+(String(b.caption||'').trim()?'<h2 class="blankCaption">'+safe(b.caption)+'</h2>':'')+'<div class="blankArea">'+blankPaperSVG(pp,i)+'</div></section>'}
function blankPaperSVG(pp,i){if(pp==='blank')return '';const id='bp'+i+'_'+Math.random().toString(36).slice(2,7);const pat=pp==='lined'?'<pattern id="'+id+'" width="40" height="34" patternUnits="userSpaceOnUse"><line x1="0" y1="33.5" x2="40" y2="33.5" stroke="#b8c2d6" stroke-width="1"/></pattern>':'<pattern id="'+id+'" width="19" height="19" patternUnits="userSpaceOnUse"><path d="M19 0H0V19" fill="none" stroke="#d5dbe8" stroke-width="1"/></pattern>';return '<svg class="blankPattern" width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true"><defs>'+pat+'</defs><rect x="0" y="0" width="100%" height="100%" fill="url(#'+id+')"/></svg>'}
function mathBlockEditor(i,b){const code=b.latex||b.content||'';return '<div class="mathBlockEditor"><div class="mathQuickBar"><button type="button" data-math-snippet="\\frac{}{}" data-math-cursor="6">كسر</button><button type="button" data-math-snippet="\\sqrt{}" data-math-cursor="6">جذر</button><button type="button" data-math-snippet="^{}" data-math-cursor="2">أس</button><button type="button" data-math-snippet="\\int_{}^{} \\, dx" data-math-cursor="6">تكامل</button><button type="button" data-math-snippet="\\lim_{x \\to }" data-math-cursor="11">نهاية</button><button type="button" data-open-full-equation="'+i+'">المحرر الكامل</button></div><textarea class="mathBlockLatex" data-math-index="'+i+'" dir="ltr" spellcheck="false" placeholder="اكتب LaTeX مثل: \\frac{x+1}{x-1}">'+safe(code)+'</textarea><div class="mathLiveDiagnostics mathBlockDiagnostics" id="mathBlockDiagnostics-'+i+'" hidden></div><div class="mathBlockPreview" id="mathBlockPreview-'+i+'"></div></div>'}function blockEditorHTML(b,i){const t=BLOCK_TYPES[b.type]||BLOCK_TYPES.text;const collapsed=!!b.collapsed,sm=ensureSmart(b);let extra='';if(b.type==='theorem')extra='<div class="solutionLabel">الشروط أو الفرضيات</div>'+richEditor(i,'conditions',b,'conditionsEditor');if(b.type==='proof')extra='<div class="solutionLabel">النتيجة</div>'+richEditor(i,'conclusion',b,'conclusionEditor');const hasSolution=['example','exercise','activity','check','ministerial','homework'].includes(b.type);const body=b.type==='pagebreak'?pageBreakEditor(i,b):b.type==='math'?mathBlockEditor(i,b):(b.type==='graph'?graphBlockEditor(i,b):b.type==='geometry'?geometryBlockEditor(i,b):b.type==='conic'?conicBlockEditor(i,b):b.type==='table'?tableBlockEditor(i,b):b.type==='matrix'?matrixBlockEditor(i,b):b.type==='illustration'?illustrationBlockEditor(i,b):richEditor(i,'content',b,'')+extra+(hasSolution?'<div class="solutionLabel">الحل أو الإجابة النموذجية</div>'+richEditor(i,'solution',b,'solutionEditor'):''));const smartBadge=SMART_TYPES.has(b.type)?'<span class="smartObjectBadge">'+safe(sm.autoNumber?smartLabel(editorLecture,b,i):t.label)+(sm.showDifficulty?' · '+difficultyLabel(sm.difficulty):'')+(sm.marks?' · '+safe(sm.marks)+' درجات':'')+'</span>':'';return '<article class="blockEditor'+(collapsed?' isCollapsed':'')+(i===selectedBlockIndex?' selectedBlock':'')+'" draggable="true" data-index="'+i+'"><div class="blockEditorHead"><button class="dragHandle" data-drag-handle="'+i+'" title="اسحب لإعادة الترتيب">⋮⋮</button><strong><span class="bhIc">'+blockIcon(b.type)+'</span>'+t.label+smartBadge+'</strong><div class="blockHeadTools"><button class="bhBtn" data-props="'+i+'" title="خصائص العنصر" aria-label="خصائص العنصر">'+(window.ICON?ICON('settings'):'⚙')+'</button><button class="bhBtn" data-block-menu="'+i+'" title="خيارات" aria-label="خيارات" aria-expanded="false">'+(window.ICON?ICON('more'):'⋯')+'</button><div class="blockMenu" role="menu"><button data-up="'+i+'" title="أعلى">↑<span>نقل للأعلى</span></button><button data-down="'+i+'" title="أسفل">↓<span>نقل للأسفل</span></button><button data-copy="'+i+'" title="نسخ">⧉<span>نسخ الكتلة</span></button><button data-save-library="'+i+'" title="حفظ في مكتبتي">☆<span>حفظ في مكتبتي</span></button><button data-collapse="'+i+'" title="طي أو فتح">'+(collapsed?'▾':'▴')+'<span>'+(collapsed?'فتح':'طي')+'</span></button><button class="danger" data-remove="'+i+'" title="حذف">×<span>حذف الكتلة</span></button></div></div></div><div class="blockEditorBody"><input class="blockTitleInput" data-field="title" value="'+safe(b.title||t.label)+'" placeholder="عنوان الكتلة">'+body+'<div class="blockHints"><span>'+(b.type==='math'?'تظهر المعادلة فورًا في المعاينة والطباعة.':b.type==='graph'?'أضف دالة أو أكثر، وعدّل المعادلة واللون والمجال في أي وقت.':b.type==='geometry'?'أنشئ أشكالًا هندسية ذكية، واسحب النقاط أو عدّلها في أي وقت.':b.type==='conic'?'اختر نوع القطع وعدّل معلماته؛ يتحدث الرسم والعناصر تلقائيًا.':'حدد النص لتنسيقه، أو استخدم أدوات الإدراج داخل موضع المؤشر.')+'</span>'+smartPasteHint()+'<label><input type="checkbox" data-field="keepTogether" '+(b.keepTogether!==false?'checked':'')+'> إبقاء الكتلة معًا عند الطباعة</label></div></div></article>'}
function renderMathBlockPreview(i){const b=editorLecture?.blocks?.[i],box=document.getElementById('mathBlockPreview-'+i);if(!b||!box)return;const code=(b.latex||b.content||'').trim();box.innerHTML='';if(!code){box.textContent='معاينة المعادلة';box.classList.add('empty');return}box.classList.remove('empty');box.style.textAlign=b.mathAlign||'center';box.style.fontSize=(Number(b.mathSize)||1)+'em';if(window.katex){try{window.katex.render(code,box,{throwOnError:false,displayMode:true,strict:'ignore'})}catch(_){box.textContent=code}}else box.textContent=code}
function bindMathBlocks(){document.querySelectorAll('.mathBlockLatex').forEach(area=>{const i=Number(area.dataset.mathIndex),b=editorLecture.blocks[i];const live=window.Masar?.resolve?.('math.liveDiagnostics');
 const deb=live?live.debounce:(fn,ms)=>{let t;return()=>{clearTimeout(t);t=setTimeout(fn,ms)}};const runDiagnostics=deb(()=>{const panel=document.getElementById('mathBlockDiagnostics-'+i);const raw=area.value.trim();renderUnifiedDiagnostics(panel,raw,unifiedMathCheck(raw))},220);
 area.oninput=()=>{b.latex=area.value;b.content=area.value;renderMathBlockPreview(i);runDiagnostics();scheduleDraft()};
 const panel=document.getElementById('mathBlockDiagnostics-'+i);if(panel)panel.addEventListener('masar:math-quick-fix',e=>{area.value=e.detail.value;area.dispatchEvent(new Event('input',{bubbles:true}));area.focus()});runDiagnostics();area.closest('.mathBlockEditor').querySelectorAll('[data-math-snippet]').forEach(btn=>btn.onclick=()=>{const start=area.selectionStart||0,end=area.selectionEnd||0,code=btn.dataset.mathSnippet,cur=btn.dataset.mathCursor;area.setRangeText(code,start,end,'end');if(cur!=null){const pos=start+Math.min(Number(cur),code.length);area.setSelectionRange(pos,pos)}area.dispatchEvent(new Event('input',{bubbles:true}));area.focus()});renderMathBlockPreview(i)});document.querySelectorAll('[data-open-full-equation]').forEach(btn=>btn.onclick=()=>{const i=Number(btn.dataset.openFullEquation),b=editorLecture.blocks[i];ensureEquationModal();equationTarget={mathBlockIndex:i};const m=document.getElementById('equationEditorModal'),x=document.getElementById('eqLatexInput');x.value=b.latex||b.content||'';document.getElementById('eqDisplayMode').checked=true;document.getElementById('eqDialogTitle').textContent='∑ تعديل المعادلة';m.classList.add('open');m.setAttribute('aria-hidden','false');document.body.classList.add('eqModalOpen');updateEquationPreview();fitEqModal();bindEqViewport(true);if(!isCoarsePointer())setTimeout(()=>x.focus(),30)})}
function ensureGraph(b){
  if(!b.graph||typeof b.graph!=="object")b.graph={};
  const g=b.graph;
  g.xMin=Number.isFinite(Number(g.xMin))?Number(g.xMin):-5;g.xMax=Number.isFinite(Number(g.xMax))?Number(g.xMax):5;
  g.yMin=Number.isFinite(Number(g.yMin))?Number(g.yMin):-5;g.yMax=Number.isFinite(Number(g.yMax))?Number(g.yMax):5;
  g.showGrid=g.showGrid!==false;g.showAxes=g.showAxes!==false;g.points=Array.isArray(g.points)?g.points:[];g.segments=Array.isArray(g.segments)?g.segments:[];
  g.functions=Array.isArray(g.functions)?g.functions.map((f,i)=>({id:String(f.id||('fn_'+uid())),expression:String(f.expression||f.expr||'x'),label:String(f.label||('f'+(i+1))),color:/^#[0-9a-f]{6}$/i.test(f.color||'')?f.color:['#0d8bd7','#dc2626','#16a34a','#7c3aed'][i%4],visible:f.visible!==false,lineStyle:['solid','dashed','dotted'].includes(f.lineStyle)?f.lineStyle:'solid',domainMin:Number.isFinite(Number(f.domainMin))?Number(f.domainMin):g.xMin,domainMax:Number.isFinite(Number(f.domainMax))?Number(f.domainMax):g.xMax})) : [];
  return g;
}
function graphExpressionToJS(raw){
 let e=String(raw||'').trim().replace(/^\s*(?:y|f\s*\(\s*x\s*\))\s*=\s*/i,'');
 e=e.replace(/\\left|\\right/g,'').replace(/\\cdot|\\times/g,'*').replace(/\\pi/g,'pi').replace(/π/g,'pi');
 for(let n=0;n<5;n++)e=e.replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g,'(($1)/($2))');
 e=e.replace(/\\sqrt\s*\{([^{}]+)\}/g,'sqrt($1)').replace(/\^\s*\{([^{}]+)\}/g,'^($1)');
 e=e.replace(/\bln\s*\(/gi,'log(').replace(/\|([^|]+)\|/g,'abs($1)').replace(/\^/g,'**');
 if(!/^[0-9xX+\-*/().,\s_a-zA-Z*]+$/.test(e))throw new Error('رموز غير مدعومة');
 const allowed=['sin','cos','tan','asin','acos','atan','sqrt','abs','exp','log','floor','ceil','round','min','max','pow'];
 const words=e.match(/[A-Za-z_]+/g)||[];
 if(words.some(w=>!['x','X','pi','e',...allowed].includes(w)))throw new Error('دالة غير مدعومة');
 e=e.replace(/\bpi\b/g,'Math.PI').replace(/\be\b/g,'Math.E');
 allowed.forEach(fn=>{e=e.replace(new RegExp('\\b'+fn+'\\b','g'),'Math.'+fn)});
 e=e.replace(/\bX\b/g,'x');
 return e;
}
function sampleGraphFunction(fn,g,sx,sy){
 let js;try{js=graphExpressionToJS(fn.expression)}catch(err){return {paths:[],error:err.message}}
 let calc;try{calc=Function('x','"use strict";return ('+js+')')}catch(_){return {paths:[],error:'صيغة غير صحيحة'}}
 const lo=Math.max(g.xMin,Number(fn.domainMin)),hi=Math.min(g.xMax,Number(fn.domainMax));if(!(hi>lo))return {paths:[],error:'المجال غير صالح'};
 const paths=[];let current=[];let lastY=null;const steps=520;
 for(let k=0;k<=steps;k++){
   const x=lo+(hi-lo)*k/steps;let y;try{y=Number(calc(x))}catch(_){y=NaN}
   const valid=Number.isFinite(y)&&Math.abs(y)<1e6;
   if(!valid){if(current.length>1)paths.push(current);current=[];lastY=null;continue}
   const px=sx(x),py=sy(y);const jump=lastY!==null&&Math.abs(py-lastY)>180;
   if(jump&&current.length>1){paths.push(current);current=[]}
   if(py>-2000&&py<2500)current.push([px,py]);lastY=py;
 }
 if(current.length>1)paths.push(current);return {paths,error:''};
}
function graphSvg(b,interactive=false,index=-1){
  const g=ensureGraph(b),W=720,H=420,pad=38,sx=x=>pad+(x-g.xMin)/(g.xMax-g.xMin)*(W-pad*2),sy=y=>H-pad-(y-g.yMin)/(g.yMax-g.yMin)*(H-pad*2);
  let out='<svg class="masarGraphSvg" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="رسم بياني" data-graph-svg="'+index+'"><defs><clipPath id="graphClip-'+String(b.id||index).replace(/[^a-z0-9_-]/gi,'')+'"><rect x="'+pad+'" y="'+pad+'" width="'+(W-pad*2)+'" height="'+(H-pad*2)+'"/></clipPath></defs>';
  out+='<rect class="graphBg" x="0" y="0" width="'+W+'" height="'+H+'" rx="16"/>';
  if(g.showGrid){for(let x=Math.ceil(g.xMin);x<=Math.floor(g.xMax);x++)out+='<line class="graphGrid" x1="'+sx(x)+'" y1="'+pad+'" x2="'+sx(x)+'" y2="'+(H-pad)+'"/>';for(let y=Math.ceil(g.yMin);y<=Math.floor(g.yMax);y++)out+='<line class="graphGrid" x1="'+pad+'" y1="'+sy(y)+'" x2="'+(W-pad)+'" y2="'+sy(y)+'"/>'}
  if(g.showAxes){if(g.yMin<=0&&g.yMax>=0)out+='<line class="graphAxis" x1="'+pad+'" y1="'+sy(0)+'" x2="'+(W-pad)+'" y2="'+sy(0)+'"/>';if(g.xMin<=0&&g.xMax>=0)out+='<line class="graphAxis" x1="'+sx(0)+'" y1="'+pad+'" x2="'+sx(0)+'" y2="'+(H-pad)+'"/>'}
  const clip='graphClip-'+String(b.id||index).replace(/[^a-z0-9_-]/gi,'');
  g.functions.forEach((fn,j)=>{if(fn.visible===false)return;const r=sampleGraphFunction(fn,g,sx,sy),dash=fn.lineStyle==='dashed'?'12 8':fn.lineStyle==='dotted'?'3 7':'';r.paths.forEach(path=>{const d=path.map((p,k)=>(k?'L':'M')+p[0].toFixed(2)+' '+p[1].toFixed(2)).join(' ');out+='<path class="graphFunction" clip-path="url(#'+clip+')" d="'+d+'" style="stroke:'+safe(fn.color)+';stroke-dasharray:'+dash+'"/>'});});
  g.segments.forEach(seg=>{const a=g.points[seg.a],c=g.points[seg.b];if(a&&c)out+='<line class="graphSegment" x1="'+sx(a.x)+'" y1="'+sy(a.y)+'" x2="'+sx(c.x)+'" y2="'+sy(c.y)+'"/>'});
  g.points.forEach((pt,j)=>{const label=pt.label||String.fromCharCode(65+j);out+='<g class="graphPointGroup" data-point="'+j+'"><circle class="graphPoint" cx="'+sx(pt.x)+'" cy="'+sy(pt.y)+'" r="7"/><text class="graphPointLabel" x="'+(sx(pt.x)+10)+'" y="'+(sy(pt.y)-10)+'">'+safe(label)+' ('+pt.x+', '+pt.y+')</text></g>'});
  return out+'</svg>';
}
function graphFunctionRows(g,i){return g.functions.map((fn,j)=>'<div class="graphFunctionRow" data-function-row="'+j+'"><label class="functionVisible"><input type="checkbox" data-fn-field="visible" '+(fn.visible!==false?'checked':'')+' title="إظهار الدالة"></label><input class="functionLabel" data-fn-field="label" value="'+safe(fn.label)+'" aria-label="اسم الدالة"><input class="functionExpression" data-fn-field="expression" dir="ltr" value="'+safe(fn.expression)+'" aria-label="معادلة الدالة"><input type="color" data-fn-field="color" value="'+safe(fn.color)+'" title="لون المنحنى"><select data-fn-field="lineStyle"><option value="solid">متصل</option><option value="dashed">متقطع</option><option value="dotted">منقط</option></select><input type="number" step="0.5" data-fn-field="domainMin" value="'+fn.domainMin+'" title="بداية المجال"><input type="number" step="0.5" data-fn-field="domainMax" value="'+fn.domainMax+'" title="نهاية المجال"><button type="button" data-remove-function="'+i+':'+j+'" title="حذف الدالة">×</button></div>').join('')}
function graphBlockEditor(i,b){const g=ensureGraph(b);return '<div class="graphBlockEditor"><div class="graphModeTabs"><button type="button" class="active">📈 الدوال والنقاط</button><span>اكتب الدالة بصيغة مثل x^2-4x+3 أو sin(x)</span></div><div class="graphControls"><label>س من <input type="number" step="1" data-graph-field="xMin" value="'+g.xMin+'"></label><label>إلى <input type="number" step="1" data-graph-field="xMax" value="'+g.xMax+'"></label><label>ص من <input type="number" step="1" data-graph-field="yMin" value="'+g.yMin+'"></label><label>إلى <input type="number" step="1" data-graph-field="yMax" value="'+g.yMax+'"></label><label class="graphCheck"><input type="checkbox" data-graph-field="showGrid" '+(g.showGrid?'checked':'')+'> شبكة</label><label class="graphCheck"><input type="checkbox" data-graph-field="showAxes" '+(g.showAxes?'checked':'')+'> محاور</label></div><section class="functionPlotterPanel"><div class="functionPlotterHead"><b>الدوال</b><button type="button" data-add-function="'+i+'">＋ إضافة دالة</button></div><div class="functionColumnLabels"><span></span><span>الاسم</span><span>المعادلة</span><span>اللون</span><span>النمط</span><span>من</span><span>إلى</span><span></span></div><div class="graphFunctionList">'+graphFunctionRows(g,i)+'</div></section><div class="graphAddPoint"><input type="text" data-point-label placeholder="الاسم A"><input type="number" step="0.5" data-point-x placeholder="س"><input type="number" step="0.5" data-point-y placeholder="ص"><button type="button" data-add-point="'+i+'">＋ إضافة نقطة</button><button type="button" data-connect-last="'+i+'">ربط آخر نقطتين</button><button type="button" data-clear-graph="'+i+'">مسح النقاط</button></div><div class="graphCanvas" data-graph-canvas="'+i+'">'+graphSvg(b,true,i)+'</div><div class="graphPointList">'+g.points.map((pt,j)=>'<span>'+safe(pt.label||String.fromCharCode(65+j))+' ('+pt.x+', '+pt.y+') <button type="button" data-remove-point="'+i+':'+j+'">×</button></span>').join('')+'</div></div>'}
function bindGraphBlocks(){
 document.querySelectorAll('.graphBlockEditor').forEach(box=>{const card=box.closest('.blockEditor'),i=Number(card.dataset.index),b=editorLecture.blocks[i],g=ensureGraph(b);
  box.querySelectorAll('[data-graph-field]').forEach(inp=>inp.onchange=()=>{const k=inp.dataset.graphField;g[k]=inp.type==='checkbox'?inp.checked:Number(inp.value);if(g.xMax<=g.xMin)g.xMax=g.xMin+1;if(g.yMax<=g.yMin)g.yMax=g.yMin+1;g.functions.forEach(fn=>{if(!Number.isFinite(fn.domainMin))fn.domainMin=g.xMin;if(!Number.isFinite(fn.domainMax))fn.domainMax=g.xMax});renderLectureEditor();scheduleDraft()});
  box.querySelector('[data-add-function]').onclick=()=>{const colors=['#0d8bd7','#dc2626','#16a34a','#7c3aed','#ea580c'];g.functions.push({id:'fn_'+uid(),label:'f'+(g.functions.length+1),expression:g.functions.length?'sin(x)':'x^2',color:colors[g.functions.length%colors.length],visible:true,lineStyle:'solid',domainMin:g.xMin,domainMax:g.xMax});renderLectureEditor();scheduleDraft()};
  box.querySelectorAll('[data-function-row]').forEach(row=>{const j=Number(row.dataset.functionRow),fn=g.functions[j];row.querySelectorAll('[data-fn-field]').forEach(inp=>{if(inp.tagName==='SELECT')inp.value=fn[inp.dataset.fnField];inp.oninput=()=>{const k=inp.dataset.fnField;fn[k]=inp.type==='checkbox'?inp.checked:(inp.type==='number'?Number(inp.value):inp.value);const canvas=box.querySelector('.graphCanvas');if(canvas)canvas.innerHTML=graphSvg(b,true,i);scheduleDraft()}})});
  box.querySelectorAll('[data-remove-function]').forEach(btn=>btn.onclick=()=>{const j=Number(btn.dataset.removeFunction.split(':')[1]);g.functions.splice(j,1);renderLectureEditor();scheduleDraft()});
  const add=box.querySelector('[data-add-point]');add.onclick=()=>{const x=Number(box.querySelector('[data-point-x]').value),y=Number(box.querySelector('[data-point-y]').value);if(!Number.isFinite(x)||!Number.isFinite(y)){alert('أدخل إحداثيي س و ص بصورة صحيحة');return}g.points.push({id:'pt_'+uid(),label:box.querySelector('[data-point-label]').value.trim()||String.fromCharCode(65+g.points.length),x,y});renderLectureEditor();scheduleDraft()};
  box.querySelector('[data-connect-last]').onclick=()=>{if(g.points.length<2){alert('أضف نقطتين على الأقل');return}g.segments.push({a:g.points.length-2,b:g.points.length-1});renderLectureEditor();scheduleDraft()};
  box.querySelector('[data-clear-graph]').onclick=()=>{if(confirm('مسح جميع نقاط الرسم والقطع المستقيمة؟')){g.points=[];g.segments=[];renderLectureEditor();scheduleDraft()}};
  box.querySelectorAll('[data-remove-point]').forEach(btn=>btn.onclick=()=>{const j=Number(btn.dataset.removePoint.split(':')[1]);g.points.splice(j,1);g.segments=g.segments.filter(q=>q.a!==j&&q.b!==j).map(q=>({a:q.a>j?q.a-1:q.a,b:q.b>j?q.b-1:q.b}));renderLectureEditor();scheduleDraft()});
  const svg=box.querySelector('svg');svg.addEventListener('click',e=>{if(e.target.closest('.graphPointGroup'))return;const r=svg.getBoundingClientRect(),px=(e.clientX-r.left)/r.width*720,py=(e.clientY-r.top)/r.height*420,pad=38;let x=g.xMin+(px-pad)/(720-76)*(g.xMax-g.xMin),y=g.yMax-(py-pad)/(420-76)*(g.yMax-g.yMin);x=Math.round(x*2)/2;y=Math.round(y*2)/2;if(x<g.xMin||x>g.xMax||y<g.yMin||y>g.yMax)return;g.points.push({id:'pt_'+uid(),label:String.fromCharCode(65+g.points.length),x,y});renderLectureEditor();scheduleDraft()});
 });
}

function ensureGeometry(b){
 if(!b.geometry||typeof b.geometry!=="object")b.geometry={};const g=b.geometry;
 g.xMin=Number.isFinite(Number(g.xMin))?Number(g.xMin):-6;g.xMax=Number.isFinite(Number(g.xMax))?Number(g.xMax):6;g.yMin=Number.isFinite(Number(g.yMin))?Number(g.yMin):-5;g.yMax=Number.isFinite(Number(g.yMax))?Number(g.yMax):5;
 g.showGrid=g.showGrid!==false;g.showAxes=g.showAxes!==false;g.snap=g.snap!==false;g.showLabels=g.showLabels!==false;g.showMeasurements=g.showMeasurements!==false;
 g.points=Array.isArray(g.points)?g.points:[];g.shapes=Array.isArray(g.shapes)?g.shapes:[];g.stroke=g.stroke||'#0d8bd7';g.fill=g.fill||'#0d8bd722';g.lineWidth=Number(g.lineWidth)||3;return g;
}
function geometryDistance(a,b){return Math.hypot(Number(b.x)-Number(a.x),Number(b.y)-Number(a.y))}
function geometrySvg(b,interactive=false,index=-1){
 const g=ensureGeometry(b),W=720,H=420,pad=38,sx=x=>pad+(x-g.xMin)/(g.xMax-g.xMin)*(W-pad*2),sy=y=>H-pad-(y-g.yMin)/(g.yMax-g.yMin)*(H-pad*2);let out='<svg class="masarGeometrySvg" viewBox="0 0 '+W+' '+H+'" data-geometry-svg="'+index+'"><rect class="geometryBg" width="'+W+'" height="'+H+'" rx="16"/>';
 if(g.showGrid){for(let x=Math.ceil(g.xMin);x<=Math.floor(g.xMax);x++)out+='<line class="geometryGrid" x1="'+sx(x)+'" y1="'+pad+'" x2="'+sx(x)+'" y2="'+(H-pad)+'"/>';for(let y=Math.ceil(g.yMin);y<=Math.floor(g.yMax);y++)out+='<line class="geometryGrid" x1="'+pad+'" y1="'+sy(y)+'" x2="'+(W-pad)+'" y2="'+sy(y)+'"/>'}
 if(g.showAxes){if(g.yMin<=0&&g.yMax>=0)out+='<line class="geometryAxis" x1="'+pad+'" y1="'+sy(0)+'" x2="'+(W-pad)+'" y2="'+sy(0)+'"/>';if(g.xMin<=0&&g.xMax>=0)out+='<line class="geometryAxis" x1="'+sx(0)+'" y1="'+pad+'" x2="'+sx(0)+'" y2="'+(H-pad)+'"/>'}
 g.shapes.forEach((sh,k)=>{const pts=(sh.points||[]).map(i=>g.points[i]).filter(Boolean);if(sh.type==='segment'&&pts.length===2){out+='<line class="geometryShape" x1="'+sx(pts[0].x)+'" y1="'+sy(pts[0].y)+'" x2="'+sx(pts[1].x)+'" y2="'+sy(pts[1].y)+'" style="stroke:'+safe(sh.stroke||g.stroke)+';stroke-width:'+(sh.lineWidth||g.lineWidth)+'"/>';if(g.showMeasurements)out+='<text class="geometryMeasure" x="'+((sx(pts[0].x)+sx(pts[1].x))/2)+'" y="'+(((sy(pts[0].y)+sy(pts[1].y))/2)-8)+'">'+geometryDistance(pts[0],pts[1]).toFixed(2)+'</text>'}
 else if((sh.type==='polygon'||sh.type==='triangle'||sh.type==='rectangle')&&pts.length>=3){const list=pts.map(q=>sx(q.x)+','+sy(q.y)).join(' ');out+='<polygon class="geometryShape geometryPolygon" points="'+list+'" style="stroke:'+safe(sh.stroke||g.stroke)+';fill:'+safe(sh.fill||g.fill)+';stroke-width:'+(sh.lineWidth||g.lineWidth)+'"/>'}
 else if(sh.type==='circle'&&pts.length>=2){const r=geometryDistance(pts[0],pts[1]),rp=Math.abs(sx(pts[0].x+r)-sx(pts[0].x));out+='<circle class="geometryShape geometryCircle" cx="'+sx(pts[0].x)+'" cy="'+sy(pts[0].y)+'" r="'+rp+'" style="stroke:'+safe(sh.stroke||g.stroke)+';fill:'+safe(sh.fill||g.fill)+';stroke-width:'+(sh.lineWidth||g.lineWidth)+'"/>';if(g.showMeasurements)out+='<text class="geometryMeasure" x="'+(sx(pts[0].x)+rp/2)+'" y="'+(sy(pts[0].y)-8)+'">r = '+r.toFixed(2)+'</text>'}});
 g.points.forEach((q,j)=>{out+='<g data-geometry-point="'+j+'"><circle class="geometryPoint" cx="'+sx(q.x)+'" cy="'+sy(q.y)+'" r="7"/>'+(g.showLabels?'<text class="geometryLabel" x="'+(sx(q.x)+10)+'" y="'+(sy(q.y)-10)+'">'+safe(q.label||String.fromCharCode(65+j))+'</text>':'')+'</g>'});return out+'</svg>';
}
function geometryBlockEditor(i,b){const g=ensureGeometry(b);return '<div class="geometryBlockEditor"><div class="geometryToolbar"><button type="button" data-geo-action="segment">／ قطعة</button><button type="button" data-geo-action="triangle">△ مثلث</button><button type="button" data-geo-action="rectangle">▭ مستطيل</button><button type="button" data-geo-action="circle">○ دائرة</button><button type="button" data-geo-action="deleteShape">حذف آخر شكل</button></div><div class="graphControls"><label>س من <input type="number" data-geo-field="xMin" value="'+g.xMin+'"></label><label>إلى <input type="number" data-geo-field="xMax" value="'+g.xMax+'"></label><label>ص من <input type="number" data-geo-field="yMin" value="'+g.yMin+'"></label><label>إلى <input type="number" data-geo-field="yMax" value="'+g.yMax+'"></label><label class="graphCheck"><input type="checkbox" data-geo-field="showGrid" '+(g.showGrid?'checked':'')+'> شبكة</label><label class="graphCheck"><input type="checkbox" data-geo-field="showAxes" '+(g.showAxes?'checked':'')+'> محاور</label><label class="graphCheck"><input type="checkbox" data-geo-field="showMeasurements" '+(g.showMeasurements?'checked':'')+'> قياسات</label></div><div class="geometryStyle"><label>الحد <input type="color" data-geo-field="stroke" value="'+safe(g.stroke)+'"></label><label>التعبئة <input type="color" data-geo-field="fillSolid" value="'+safe((g.fill||'#0d8bd722').slice(0,7))+'"></label><label>السماكة <input type="range" min="1" max="8" data-geo-field="lineWidth" value="'+g.lineWidth+'"></label></div><div class="graphAddPoint"><input type="text" data-geo-label placeholder="A"><input type="number" step="0.5" data-geo-x placeholder="س"><input type="number" step="0.5" data-geo-y placeholder="ص"><button type="button" data-add-geo-point>＋ نقطة</button><button type="button" data-clear-geometry>مسح الكل</button></div><div class="geometryCanvas" data-geometry-canvas="'+i+'">'+geometrySvg(b,true,i)+'</div><div class="graphPointList">'+g.points.map((q,j)=>'<span>'+safe(q.label)+' ('+q.x+', '+q.y+') <button type="button" data-remove-geo-point="'+j+'">×</button></span>').join('')+'</div></div>'}
function bindGeometryBlocks(){document.querySelectorAll('.geometryBlockEditor').forEach(box=>{const i=Number(box.closest('.blockEditor').dataset.index),b=editorLecture.blocks[i],g=ensureGeometry(b);const redraw=()=>{const c=box.querySelector('.geometryCanvas');if(c)c.innerHTML=geometrySvg(b,true,i)};
 box.querySelectorAll('[data-geo-field]').forEach(inp=>inp.oninput=()=>{const k=inp.dataset.geoField;if(k==='fillSolid')g.fill=inp.value+'22';else g[k]=inp.type==='checkbox'?inp.checked:(inp.type==='number'||inp.type==='range'?Number(inp.value):inp.value);redraw();scheduleDraft()});
 box.querySelector('[data-add-geo-point]').onclick=()=>{const x=Number(box.querySelector('[data-geo-x]').value),y=Number(box.querySelector('[data-geo-y]').value);if(!Number.isFinite(x)||!Number.isFinite(y))return;g.points.push({x,y,label:box.querySelector('[data-geo-label]').value.trim()||String.fromCharCode(65+g.points.length)});renderLectureEditor();scheduleDraft()};
 box.querySelectorAll('[data-geo-action]').forEach(btn=>btn.onclick=()=>{const a=btn.dataset.geoAction,n=g.points.length;if(a==='deleteShape')g.shapes.pop();else if(a==='segment'&&n>=2)g.shapes.push({type:'segment',points:[n-2,n-1]});else if(a==='triangle'&&n>=3)g.shapes.push({type:'triangle',points:[n-3,n-2,n-1]});else if(a==='rectangle'&&n>=2){const A=g.points[n-2],C=g.points[n-1],i1=g.points.push({x:C.x,y:A.y,label:String.fromCharCode(65+g.points.length)})-1,i2=g.points.push({x:A.x,y:C.y,label:String.fromCharCode(65+g.points.length)})-1;g.shapes.push({type:'rectangle',points:[n-2,i1,n-1,i2]})}else if(a==='circle'&&n>=2)g.shapes.push({type:'circle',points:[n-2,n-1]});renderLectureEditor();scheduleDraft()});
 box.querySelectorAll('[data-remove-geo-point]').forEach(btn=>btn.onclick=()=>{const j=Number(btn.dataset.removeGeoPoint);g.points.splice(j,1);g.shapes=[];renderLectureEditor();scheduleDraft()});box.querySelector('[data-clear-geometry]').onclick=()=>{g.points=[];g.shapes=[];renderLectureEditor();scheduleDraft()};
 const svg=box.querySelector('.masarGeometrySvg');if(svg)svg.onclick=e=>{if(e.target.closest('[data-geometry-point]'))return;const r=svg.getBoundingClientRect(),pad=38,W=720,H=420,px=(e.clientX-r.left)/r.width*W,py=(e.clientY-r.top)/r.height*H;let x=g.xMin+(px-pad)/(W-pad*2)*(g.xMax-g.xMin),y=g.yMax-(py-pad)/(H-pad*2)*(g.yMax-g.yMin);if(g.snap){x=Math.round(x*2)/2;y=Math.round(y*2)/2}if(x<g.xMin||x>g.xMax||y<g.yMin||y>g.yMax)return;g.points.push({x,y,label:String.fromCharCode(65+g.points.length)});renderLectureEditor();scheduleDraft()};});}


function ensureConic(b){
 if(!b.conic||typeof b.conic!=="object")b.conic={};const c=b.conic;
 c.type=["circle","ellipse","hyperbola","parabola"].includes(c.type)?c.type:"ellipse";
 c.orientation=["horizontal","vertical"].includes(c.orientation)?c.orientation:"horizontal";
 c.h=Number(c.h)||0;c.k=Number(c.k)||0;c.a=Math.max(.1,Number(c.a)||4);c.b=Math.max(.1,Number(c.b)||3);c.p=Number(c.p)||2;
 c.xMin=Number.isFinite(Number(c.xMin))?Number(c.xMin):-10;c.xMax=Number.isFinite(Number(c.xMax))?Number(c.xMax):10;c.yMin=Number.isFinite(Number(c.yMin))?Number(c.yMin):-8;c.yMax=Number.isFinite(Number(c.yMax))?Number(c.yMax):8;
 c.showGrid=c.showGrid!==false;c.showAxes=c.showAxes!==false;c.showGuides=c.showGuides!==false;c.stroke=c.stroke||"#7c3aed";return c;
}
function conicInfo(c){
 const f=n=>Number(n.toFixed(3));let eq='',items=[];
 if(c.type==='circle'){eq='(x-'+c.h+')² + (y-'+c.k+')² = '+f(c.a*c.a);items=[['المركز','('+c.h+', '+c.k+')'],['نصف القطر',f(c.a)]]}
 if(c.type==='ellipse'){const A=c.a,B=c.b,maj=Math.max(A,B),min=Math.min(A,B),cc=Math.sqrt(Math.max(0,maj*maj-min*min)),hor=(c.orientation==='horizontal');eq=hor?'(x-'+c.h+')²/'+f(A*A)+' + (y-'+c.k+')²/'+f(B*B)+' = 1':'(x-'+c.h+')²/'+f(B*B)+' + (y-'+c.k+')²/'+f(A*A)+' = 1';items=[['المركز','('+c.h+', '+c.k+')'],['a',f(A)],['b',f(B)],['c',f(cc)],['البؤرتان',hor?'('+(c.h-cc)+', '+c.k+') ، ('+(c.h+cc)+', '+c.k+')':'('+c.h+', '+(c.k-cc)+') ، ('+c.h+', '+(c.k+cc)+')'],['الاختلاف المركزي',f(cc/A)]]}
 if(c.type==='hyperbola'){const cc=Math.sqrt(c.a*c.a+c.b*c.b),hor=c.orientation==='horizontal';eq=hor?'(x-'+c.h+')²/'+f(c.a*c.a)+' - (y-'+c.k+')²/'+f(c.b*c.b)+' = 1':'(y-'+c.k+')²/'+f(c.a*c.a)+' - (x-'+c.h+')²/'+f(c.b*c.b)+' = 1';items=[['المركز','('+c.h+', '+c.k+')'],['a',f(c.a)],['b',f(c.b)],['c',f(cc)],['البؤرتان',hor?'('+(c.h-cc)+', '+c.k+') ، ('+(c.h+cc)+', '+c.k+')':'('+c.h+', '+(c.k-cc)+') ، ('+c.h+', '+(c.k+cc)+')'],['خطا التقارب',hor?'y-'+c.k+' = ±'+f(c.b/c.a)+'(x-'+c.h+')':'y-'+c.k+' = ±'+f(c.a/c.b)+'(x-'+c.h+')'] ]}
 if(c.type==='parabola'){const hor=c.orientation==='horizontal';eq=hor?'(y-'+c.k+')² = '+f(4*c.p)+'(x-'+c.h+')':'(x-'+c.h+')² = '+f(4*c.p)+'(y-'+c.k+')';items=[['الرأس','('+c.h+', '+c.k+')'],['البؤرة',hor?'('+(c.h+c.p)+', '+c.k+')':'('+c.h+', '+(c.k+c.p)+')'],['الدليل',hor?'x = '+f(c.h-c.p):'y = '+f(c.k-c.p)],['محور التماثل',hor?'y = '+c.k:'x = '+c.h]]}
 return {eq,items};
}
function conicSvg(b){const c=ensureConic(b),W=720,H=440,pad=42,sx=x=>pad+(x-c.xMin)/(c.xMax-c.xMin)*(W-pad*2),sy=y=>H-pad-(y-c.yMin)/(c.yMax-c.yMin)*(H-pad*2);let out='<svg class="masarConicSvg" viewBox="0 0 '+W+' '+H+'" role="img"><rect class="conicBg" width="'+W+'" height="'+H+'" rx="16"/>';
 if(c.showGrid){for(let x=Math.ceil(c.xMin);x<=Math.floor(c.xMax);x++)out+='<line class="conicGrid" x1="'+sx(x)+'" y1="'+pad+'" x2="'+sx(x)+'" y2="'+(H-pad)+'"/>';for(let y=Math.ceil(c.yMin);y<=Math.floor(c.yMax);y++)out+='<line class="conicGrid" x1="'+pad+'" y1="'+sy(y)+'" x2="'+(W-pad)+'" y2="'+sy(y)+'"/>'}
 if(c.showAxes){if(c.yMin<=0&&c.yMax>=0)out+='<line class="conicAxis" x1="'+pad+'" y1="'+sy(0)+'" x2="'+(W-pad)+'" y2="'+sy(0)+'"/>';if(c.xMin<=0&&c.xMax>=0)out+='<line class="conicAxis" x1="'+sx(0)+'" y1="'+pad+'" x2="'+sx(0)+'" y2="'+(H-pad)+'"/>'}
 const paths=[];function sample(fn,t0,t1,n=400){let d='';for(let i=0;i<=n;i++){const t=t0+(t1-t0)*i/n,q=fn(t);if(!q||!Number.isFinite(q[0])||!Number.isFinite(q[1]))continue;d+=(d?'L':'M')+sx(q[0]).toFixed(2)+' '+sy(q[1]).toFixed(2)+' '}return d}
 if(c.type==='circle')paths.push(sample(t=>[c.h+c.a*Math.cos(t),c.k+c.a*Math.sin(t)],0,Math.PI*2));
 if(c.type==='ellipse'){const hor=c.orientation==='horizontal';paths.push(sample(t=>hor?[c.h+c.a*Math.cos(t),c.k+c.b*Math.sin(t)]:[c.h+c.b*Math.cos(t),c.k+c.a*Math.sin(t)],0,Math.PI*2))}
 if(c.type==='hyperbola'){const hor=c.orientation==='horizontal',T=2.5;paths.push(sample(t=>hor?[c.h+c.a*Math.cosh(t),c.k+c.b*Math.sinh(t)]:[c.h+c.b*Math.sinh(t),c.k+c.a*Math.cosh(t)],-T,T));paths.push(sample(t=>hor?[c.h-c.a*Math.cosh(t),c.k+c.b*Math.sinh(t)]:[c.h+c.b*Math.sinh(t),c.k-c.a*Math.cosh(t)],-T,T));if(c.showGuides){if(hor){out+='<line class="conicGuide" x1="'+sx(c.xMin)+'" y1="'+sy(c.k+(c.b/c.a)*(c.xMin-c.h))+'" x2="'+sx(c.xMax)+'" y2="'+sy(c.k+(c.b/c.a)*(c.xMax-c.h))+'"/><line class="conicGuide" x1="'+sx(c.xMin)+'" y1="'+sy(c.k-(c.b/c.a)*(c.xMin-c.h))+'" x2="'+sx(c.xMax)+'" y2="'+sy(c.k-(c.b/c.a)*(c.xMax-c.h))+'"/>'}else{out+='<line class="conicGuide" x1="'+sx(c.xMin)+'" y1="'+sy(c.k+(c.a/c.b)*(c.xMin-c.h))+'" x2="'+sx(c.xMax)+'" y2="'+sy(c.k+(c.a/c.b)*(c.xMax-c.h))+'"/><line class="conicGuide" x1="'+sx(c.xMin)+'" y1="'+sy(c.k-(c.a/c.b)*(c.xMin-c.h))+'" x2="'+sx(c.xMax)+'" y2="'+sy(c.k-(c.a/c.b)*(c.xMax-c.h))+'"/>'}}}
 if(c.type==='parabola'){const hor=c.orientation==='horizontal';if(hor){paths.push(sample(y=>[c.h+((y-c.k)*(y-c.k))/(4*c.p),y],c.yMin,c.yMax));if(c.showGuides)out+='<line class="conicGuide" x1="'+sx(c.h-c.p)+'" y1="'+pad+'" x2="'+sx(c.h-c.p)+'" y2="'+(H-pad)+'"/>'}else{paths.push(sample(x=>[x,c.k+((x-c.h)*(x-c.h))/(4*c.p)],c.xMin,c.xMax));if(c.showGuides)out+='<line class="conicGuide" x1="'+pad+'" y1="'+sy(c.k-c.p)+'" x2="'+(W-pad)+'" y2="'+sy(c.k-c.p)+'"/>'}}
 paths.forEach(d=>out+='<path class="conicCurve" style="stroke:'+safe(c.stroke)+'" d="'+d+'"/>');out+='<circle class="conicCenter" cx="'+sx(c.h)+'" cy="'+sy(c.k)+'" r="5"/></svg>';return out}
function conicBlockEditor(i,b){const c=ensureConic(b),info=conicInfo(c);return '<div class="conicBlockEditor"><div class="conicControls"><label>النوع <select data-conic-field="type"><option value="circle" '+(c.type==='circle'?'selected':'')+'>دائرة</option><option value="ellipse" '+(c.type==='ellipse'?'selected':'')+'>قطع ناقص</option><option value="hyperbola" '+(c.type==='hyperbola'?'selected':'')+'>قطع زائد</option><option value="parabola" '+(c.type==='parabola'?'selected':'')+'>قطع مكافئ</option></select></label><label>الاتجاه <select data-conic-field="orientation"><option value="horizontal" '+(c.orientation==='horizontal'?'selected':'')+'>أفقي</option><option value="vertical" '+(c.orientation==='vertical'?'selected':'')+'>عمودي</option></select></label><label>h <input type="number" step="0.5" data-conic-field="h" value="'+c.h+'"></label><label>k <input type="number" step="0.5" data-conic-field="k" value="'+c.k+'"></label><label>a / r <input type="number" min="0.1" step="0.5" data-conic-field="a" value="'+c.a+'"></label><label>b <input type="number" min="0.1" step="0.5" data-conic-field="b" value="'+c.b+'"></label><label>p <input type="number" step="0.5" data-conic-field="p" value="'+c.p+'"></label><label>اللون <input type="color" data-conic-field="stroke" value="'+safe(c.stroke)+'"></label><label><input type="checkbox" data-conic-field="showGuides" '+(c.showGuides?'checked':'')+'> الأدلة/التقاربات</label></div><div class="conicEquation" dir="ltr">'+safe(info.eq)+'</div><div class="conicWorkspace"><div class="conicCanvas">'+conicSvg(b)+'</div><aside class="conicInfo"><h4>عناصر القطع</h4>'+info.items.map(x=>'<div><b>'+safe(x[0])+'</b><span>'+safe(String(x[1]))+'</span></div>').join('')+'</aside></div></div>'}
function bindConicBlocks(){document.querySelectorAll('.conicBlockEditor').forEach(box=>{const i=Number(box.closest('.blockEditor').dataset.index),b=editorLecture.blocks[i],c=ensureConic(b);box.querySelectorAll('[data-conic-field]').forEach(inp=>inp.oninput=()=>{const k=inp.dataset.conicField;c[k]=inp.type==='checkbox'?inp.checked:(inp.type==='number'?Number(inp.value):inp.value);renderLectureEditor();scheduleDraft()})})}


// v2.8.12 — خلايا الجدول الذكي تُخزَّن نصًا خالصًا (مع \n للأسطر).
// الإصدارات السابقة كانت تخزن innerHTML ثم تهرّبه عند العرض، فيتضاعف &amp; مع كل إعادة رسم.
function decodeCellEntities(s){const ta=document.createElement('textarea');ta.innerHTML=s;return ta.value}
function legacyCellToText(v){let s=String(v??'');if(!/[<&]/.test(s))return s;
 s=s.replace(/<br\s*\/?>/gi,'\n').replace(/<\/(div|p|li)>\s*/gi,'\n').replace(/<[^>]*>/g,'');
 for(let k=0;k<8&&/&(?:amp|lt|gt|quot|#39|#x27|nbsp|#\d+);/.test(s);k++)s=decodeCellEntities(s);
 return s.replace(/\u00a0/g,' ').replace(/\n+$/,'')}
function cellDir(text){const api=window.MasarAutoDirection;const d=api?.firstStrongDirection?api.firstStrongDirection(text):null;return d||'auto'}
function cellEditorHTML(text){return safe(text).replace(/\n/g,'<br>')}
function readCellText(cell){let t=cell.innerText!=null?cell.innerText:cell.textContent;return String(t||'').replace(/\u00a0/g,' ').replace(/\n$/,'')}
function ensureTable(b){
 if(!b.table||typeof b.table!=="object")b.table={};const t=b.table;
 t.rows=Math.max(1,Math.min(20,Number(t.rows)||3));t.cols=Math.max(1,Math.min(10,Number(t.cols)||3));t.header=t.header!==false;
 if(!Array.isArray(t.cells))t.cells=[];
 if(t.format!=='text'){t.cells=t.cells.map(r=>Array.isArray(r)?r.map(legacyCellToText):[]);t.format='text'}
 while(t.cells.length<t.rows)t.cells.push([]);t.cells=t.cells.slice(0,t.rows);
 t.cells.forEach((r,i)=>{if(!Array.isArray(r))r=[];while(r.length<t.cols)r.push(i===0&&t.header?'العنوان '+(r.length+1):'');t.cells[i]=r.slice(0,t.cols).map(x=>String(x??''))});return t;
}
function tableBlockEditor(i,b){const t=ensureTable(b);let rows='';for(let r=0;r<t.rows;r++){rows+='<tr>';for(let c=0;c<t.cols;c++){const tag=t.header&&r===0?'th':'td';rows+='<'+tag+' contenteditable="true" dir="'+cellDir(t.cells[r][c])+'" data-table-cell="'+r+','+c+'">'+cellEditorHTML(t.cells[r][c])+'</'+tag+'>'}rows+='</tr>'}return '<div class="smartTableEditor"><div class="visualObjectToolbar"><label>صفوف <input type="number" min="1" max="20" data-table-size="rows" value="'+t.rows+'"></label><label>أعمدة <input type="number" min="1" max="10" data-table-size="cols" value="'+t.cols+'"></label><label><input type="checkbox" data-table-header '+(t.header?'checked':'')+'> صف عناوين</label><button type="button" data-table-action="addRow">＋ صف</button><button type="button" data-table-action="addCol">＋ عمود</button><button type="button" data-table-action="delRow">− صف</button><button type="button" data-table-action="delCol">− عمود</button></div><div class="smartTableScroll"><table class="smartAuthorTable"><tbody>'+rows+'</tbody></table></div></div>'}
function tableShrinkOk(t,k,v){v=Math.max(1,v);const lost=k==='rows'?t.cells.slice(v).flat():t.cells.flatMap((r,i)=>(t.header&&i===0)?[]:r.slice(v));if(!lost.some(x=>String(x||'').trim()))return true;return confirm('سيتم حذف خلايا فيها بيانات. يمكنك التراجع بزر ↶ لاحقًا. هل تريد المتابعة؟')}
function bindTableBlocks(){document.querySelectorAll('.smartTableEditor').forEach(box=>{const i=Number(box.closest('.blockEditor').dataset.index),b=editorLecture.blocks[i],t=ensureTable(b);box.querySelectorAll('[data-table-cell]').forEach(cell=>{cell.oninput=()=>{const [r,c]=cell.dataset.tableCell.split(',').map(Number);t.cells[r][c]=readCellText(cell);scheduleDraft()};cell.onpaste=e=>{const txt=e.clipboardData?.getData('text/plain');if(txt==null)return;e.preventDefault();document.execCommand('insertText',false,txt.replace(/\r\n?/g,'\n'))};try{window.MasarAutoDirection?.bindEditor?.(cell)}catch(_){}});box.querySelectorAll('[data-table-size]').forEach(inp=>inp.onchange=()=>{const k=inp.dataset.tableSize,v=Number(inp.value)||1;if(!tableShrinkOk(t,k,v)){inp.value=t[k];return}t[k]=v;ensureTable(b);renderLectureEditor();scheduleDraft()});const h=box.querySelector('[data-table-header]');if(h)h.onchange=()=>{t.header=h.checked;renderLectureEditor();scheduleDraft()};box.querySelectorAll('[data-table-action]').forEach(btn=>btn.onclick=()=>{const a=btn.dataset.tableAction;if(a==='addRow')t.rows++;if(a==='addCol')t.cols++;if(a==='delRow'){if(!tableShrinkOk(t,'rows',t.rows-1))return;t.rows=Math.max(1,t.rows-1)}if(a==='delCol'){if(!tableShrinkOk(t,'cols',t.cols-1))return;t.cols=Math.max(1,t.cols-1)}ensureTable(b);renderLectureEditor();scheduleDraft()})})}
function tablePrintHTML(b){const t=ensureTable(b);const cell=(v,tag)=>'<'+tag+' dir="'+cellDir(v)+'">'+mathHTML(v)+'</'+tag+'>';const rows=t.cells.map((row,r)=>({row,head:t.header&&r===0}));const head=rows.filter(x=>x.head).map(x=>'<tr>'+x.row.map(v=>cell(v,'th')).join('')+'</tr>').join('');const body=rows.filter(x=>!x.head).map(x=>'<tr>'+x.row.map(v=>cell(v,'td')).join('')+'</tr>').join('');const cw=Array.isArray(b._colWidths)&&b._colWidths.length===(t.cells[0]||[]).length?b._colWidths:null;return '<div class="smartTablePrint"><table'+(cw?' style="table-layout:fixed"':'')+'>'+(cw?'<colgroup>'+cw.map(w=>'<col style="width:'+w.toFixed(2)+'%">').join('')+'</colgroup>':'')+(head?'<thead>'+head+'</thead>':'')+'<tbody>'+body+'</tbody></table></div>'}

function ensureMatrix(b){if(!b.matrix||typeof b.matrix!=="object")b.matrix={};const m=b.matrix;m.rows=Math.max(1,Math.min(10,Number(m.rows)||2));m.cols=Math.max(1,Math.min(10,Number(m.cols)||2));m.brackets=['round','square','bars','none'].includes(m.brackets)?m.brackets:'round';if(!Array.isArray(m.cells))m.cells=[];while(m.cells.length<m.rows)m.cells.push([]);m.cells=m.cells.slice(0,m.rows);m.cells.forEach((r,i)=>{while(r.length<m.cols)r.push('');m.cells[i]=r.slice(0,m.cols).map(x=>String(x??''))});return m}
function matrixHTML(b,edit=false){const m=ensureMatrix(b),open={round:'(',square:'[',bars:'|',none:''}[m.brackets],close={round:')',square:']',bars:'|',none:''}[m.brackets];return '<div class="matrixObject"><span class="matrixBracket">'+open+'</span><div class="matrixGrid" style="grid-template-columns:repeat('+m.cols+',minmax(48px,auto))">'+m.cells.flatMap((row,r)=>row.map((v,c)=>edit?'<input dir="ltr" data-matrix-cell="'+r+','+c+'" value="'+safe(v)+'">':'<span dir="ltr">'+safe(v)+'</span>')).join('')+'</div><span class="matrixBracket">'+close+'</span></div>'}
function matrixBlockEditor(i,b){const m=ensureMatrix(b);return '<div class="matrixBlockEditor"><div class="visualObjectToolbar"><label>صفوف <input type="number" min="1" max="10" data-matrix-size="rows" value="'+m.rows+'"></label><label>أعمدة <input type="number" min="1" max="10" data-matrix-size="cols" value="'+m.cols+'"></label><label>الأقواس <select data-matrix-brackets><option value="round" '+(m.brackets==='round'?'selected':'')+'>( )</option><option value="square" '+(m.brackets==='square'?'selected':'')+'>[ ]</option><option value="bars" '+(m.brackets==='bars'?'selected':'')+'>| |</option><option value="none" '+(m.brackets==='none'?'selected':'')+'>بدون</option></select></label></div>'+matrixHTML(b,true)+'</div>'}
function bindMatrixBlocks(){document.querySelectorAll('.matrixBlockEditor').forEach(box=>{const i=Number(box.closest('.blockEditor').dataset.index),b=editorLecture.blocks[i],m=ensureMatrix(b);box.querySelectorAll('[data-matrix-cell]').forEach(inp=>inp.oninput=()=>{const [r,c]=inp.dataset.matrixCell.split(',').map(Number);m.cells[r][c]=inp.value;scheduleDraft()});box.querySelectorAll('[data-matrix-size]').forEach(inp=>inp.onchange=()=>{m[inp.dataset.matrixSize]=Number(inp.value)||1;ensureMatrix(b);renderLectureEditor();scheduleDraft()});box.querySelector('[data-matrix-brackets]').onchange=e=>{m.brackets=e.target.value;renderLectureEditor();scheduleDraft()}})}

function ensureIllustration(b){if(!b.illustration||typeof b.illustration!=="object")b.illustration={};const d=b.illustration;d.width=720;d.height=360;d.grid=d.grid!==false;d.items=Array.isArray(d.items)?d.items:[];return d}
function illustrationSvg(b,interactive=false,index=-1){const d=ensureIllustration(b);let g=d.grid?'<defs><pattern id="illGrid'+index+'" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" opacity=".08"/></pattern></defs><rect width="720" height="360" fill="url(#illGrid'+index+')"/>':'';d.items.forEach((it,k)=>{const col=safe(it.color||'#0f172a');if(it.type==='rect')g+='<rect x="'+it.x+'" y="'+it.y+'" width="'+it.w+'" height="'+it.h+'" rx="8" fill="'+safe(it.fill||'#dbeafe')+'" stroke="'+col+'" stroke-width="3"/>';else if(it.type==='circle')g+='<circle cx="'+it.x+'" cy="'+it.y+'" r="'+it.r+'" fill="'+safe(it.fill||'#dcfce7')+'" stroke="'+col+'" stroke-width="3"/>';else if(it.type==='line'||it.type==='arrow')g+='<line x1="'+it.x+'" y1="'+it.y+'" x2="'+it.x2+'" y2="'+it.y2+'" stroke="'+col+'" stroke-width="4" '+(it.type==='arrow'?'marker-end="url(#arrowHead'+index+')"':'')+'/>';else if(it.type==='text')g+='<text x="'+it.x+'" y="'+it.y+'" text-anchor="middle" font-size="'+(it.size||24)+'" fill="'+col+'">'+safe(it.text||'تسمية')+'</text>'});return '<svg class="illustrationSvg" viewBox="0 0 720 360"><defs><marker id="arrowHead'+index+'" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0,10 3.5,0 7" fill="currentColor"/></marker></defs>'+g+'</svg>'}
function illustrationBlockEditor(i,b){const d=ensureIllustration(b);return '<div class="illustrationBlockEditor"><div class="visualObjectToolbar"><button type="button" data-ill-add="rect">▭ مستطيل</button><button type="button" data-ill-add="circle">○ دائرة</button><button type="button" data-ill-add="line">／ خط</button><button type="button" data-ill-add="arrow">➜ سهم</button><button type="button" data-ill-add="text">T تسمية</button><button type="button" data-ill-action="remove">حذف آخر عنصر</button><button type="button" data-ill-action="clear">مسح الرسم</button><label><input type="checkbox" data-ill-grid '+(d.grid?'checked':'')+'> شبكة</label></div><div class="illustrationCanvas">'+illustrationSvg(b,true,i)+'</div><p class="visualObjectHelp">أداة خفيفة لإنشاء شكل توضيحي للسؤال. أضف العناصر ثم عدّل نصوصها ومواقعها من القائمة أدناه.</p><div class="illustrationItems">'+d.items.map((it,k)=>'<button type="button" data-ill-edit="'+k+'">'+(k+1)+' · '+safe(it.type)+(it.text?' · '+safe(it.text):'')+'</button>').join('')+'</div></div>'}
function bindIllustrationBlocks(){document.querySelectorAll('.illustrationBlockEditor').forEach(box=>{const i=Number(box.closest('.blockEditor').dataset.index),b=editorLecture.blocks[i],d=ensureIllustration(b);box.querySelectorAll('[data-ill-add]').forEach(btn=>btn.onclick=()=>{const t=btn.dataset.illAdd,n=d.items.length,base={type:t,color:'#0f172a',x:120+(n%4)*130,y:100+Math.floor(n/4)*90};if(t==='rect')Object.assign(base,{w:130,h:70,fill:'#dbeafe'});if(t==='circle')Object.assign(base,{r:45,fill:'#dcfce7'});if(t==='line'||t==='arrow')Object.assign(base,{x2:base.x+150,y2:base.y});if(t==='text')Object.assign(base,{text:prompt('اكتب التسمية','المعطى')||'المعطى',size:24});d.items.push(base);renderLectureEditor();scheduleDraft()});box.querySelectorAll('[data-ill-action]').forEach(btn=>btn.onclick=()=>{if(btn.dataset.illAction==='remove')d.items.pop();else if(confirm('مسح جميع عناصر الرسم؟'))d.items=[];renderLectureEditor();scheduleDraft()});const grid=box.querySelector('[data-ill-grid]');if(grid)grid.onchange=()=>{d.grid=grid.checked;renderLectureEditor();scheduleDraft()};box.querySelectorAll('[data-ill-edit]').forEach(btn=>btn.onclick=()=>{const it=d.items[Number(btn.dataset.illEdit)];if(!it)return;const raw=prompt('عدّل القيم بصيغة JSON',JSON.stringify(it));if(!raw)return;try{d.items[Number(btn.dataset.illEdit)]={...it,...JSON.parse(raw)};renderLectureEditor();scheduleDraft()}catch(_){alert('صيغة غير صحيحة')}})})}

function createEditorBlock(type){const t=BLOCK_TYPES[type]||BLOCK_TYPES.text;const base=window.MasarDocumentCore?.createBlock?window.MasarDocumentCore.createBlock(type,{title:t.label,content:'',keepTogether:true}):{id:uid(),type,title:t.label,content:'',keepTogether:true};ensureSmart(base);if(type==='graph')ensureGraph(base);if(type==='geometry')ensureGeometry(base);if(type==='conic')ensureConic(base);if(type==='table')ensureTable(base);if(type==='matrix')ensureMatrix(base);if(type==='illustration')ensureIllustration(base);if(['exercise','activity','check','ministerial','homework'].includes(type)&&!base.smart.answerLines)base.smart.answerLines=4;return base}
function syncWatermark(){const t=document.getElementById("lecWmType");if(!t)return;const w=Object.assign({},editorLecture.watermark||{});w.type=t.value;const tx=document.getElementById("lecWmText");if(tx)w.text=tx.value.trim();const op=document.getElementById("lecWmOpacity");if(op)w.opacity=Number(op.value)/100;editorLecture.watermark=w}
function syncMeta(){syncWatermark();const ts=document.getElementById("lecTextSize");if(ts)editorLecture.textSize=Number(ts.value)||13;const ph=document.getElementById("lecPhone");if(ph)editorLecture.phone=ph.value.trim();const ct=document.getElementById("lecColorTheme");if(ct)editorLecture.colorTheme=ct.value==='classic'?'classic':'royal';[ ["lecTitle","title"],["lecSubject","subject"],["lecGrade","grade"],["lecChapter","chapter"],["lecNo","lectureNo"],["lecTeacher","teacher"]].forEach(([id,k])=>{const e=document.getElementById(id);if(e)editorLecture[k]=e.value.trim()})}
function bindEditor(){
  document.getElementById("backLectures").onclick=()=>{if(editorLecture){syncMeta();draftSave()}navigation.projectId&&navigation.chapterId?renderChapter(navigation.projectId,navigation.chapterId):renderProjectsDashboard()};
  document.querySelectorAll(".lectureInfoPanel input").forEach(e=>e.oninput=()=>{syncMeta();scheduleDraft()});
  ["lecTextSize","lecColorTheme"].forEach(id=>{const e=document.getElementById(id);if(e)e.onchange=()=>{syncMeta();scheduleDraft()}});
  {const wt=document.getElementById("lecWmType");if(wt){const panel=wt.closest('.wmPanel');const show=()=>{const v=wt.value;panel.querySelector('label.wmText').hidden=v!=='text';panel.querySelector('.wmLogoRow').hidden=v!=='logo';panel.querySelector('.wmOp').hidden=v==='none'};
   wt.onchange=()=>{show();syncMeta();scheduleDraft()};
   const tx=document.getElementById("lecWmText");if(tx)tx.oninput=()=>{syncMeta();scheduleDraft()};
   const op=document.getElementById("lecWmOpacity");if(op)op.oninput=()=>{document.getElementById("lecWmOpV").textContent=op.value+'%';syncMeta();scheduleDraft()};
   const f=document.getElementById("lecWmFile");if(f)f.onchange=async()=>{const file=f.files&&f.files[0];if(!file)return;try{const url=await watermarkImageFile(file);syncMeta();editorLecture.watermark=Object.assign({},editorLecture.watermark||{},{type:'logo',img:url});scheduleDraft();const row=panel.querySelector('.wmLogoRow');row.querySelector('.wmThumb,.wmNone')?.remove();row.insertAdjacentHTML('beforeend','<img class="wmThumb" src="'+url+'" alt="الشعار">');row.querySelector('.wmPick').firstChild.textContent='تغيير الشعار'}catch(err){console.warn('watermark image',err);(typeof toast==='function'?toast('تعذّر قراءة الصورة — جرّب PNG أو JPG'):0)}};
  }}
  document.querySelectorAll("[data-add-block]").forEach(b=>b.onclick=()=>{const type=b.dataset.addBlock;const at=pendingInsertAt;pendingInsertAt=null;let idx;if(at!=null&&at>=0&&at<=editorLecture.blocks.length){editorLecture.blocks.splice(at,0,createEditorBlock(type));idx=at}else{editorLecture.blocks.push(createEditorBlock(type));idx=editorLecture.blocks.length-1}selectedBlockIndex=idx;renderLectureEditor();scheduleDraft();setTimeout(()=>{const card=document.querySelector('.blockEditor[data-index="'+idx+'"]');if(card){card.scrollIntoView({behavior:"smooth",block:"center"});const ed=card.querySelector('.richContent');if(ed)ed.focus()}},30)});
  document.querySelectorAll("[data-palette-tab]").forEach(b=>b.onclick=()=>{document.querySelectorAll("[data-palette-tab]").forEach(x=>x.classList.toggle("active",x===b));const lib=b.dataset.paletteTab==="library";document.getElementById("paletteTypes").hidden=lib;document.getElementById("paletteLibrary").hidden=!lib});
  document.querySelectorAll("[data-insert-library]").forEach(b=>b.onclick=()=>{const item=clone(loadBlockLibrary()[Number(b.dataset.insertLibrary)]);if(!item)return;item.id=uid();item.collapsed=false;const at=pendingInsertAt;pendingInsertAt=null;if(at!=null&&at>=0&&at<=editorLecture.blocks.length)editorLecture.blocks.splice(at,0,item);else editorLecture.blocks.push(item);renderLectureEditor();scheduleDraft()});
  document.querySelectorAll("[data-remove-library]").forEach(b=>b.onclick=()=>{const list=loadBlockLibrary();list.splice(Number(b.dataset.removeLibrary),1);saveBlockLibrary(list);renderLectureEditor()});
  document.querySelectorAll(".blockEditor").forEach(card=>{const i=Number(card.dataset.index);card.querySelectorAll("[data-field]").forEach(f=>{f.oninput=()=>{editorLecture.blocks[i][f.dataset.field]=f.type==="checkbox"?f.checked:f.value;scheduleDraft()}})});
  // اربط الأوامر الأساسية قبل أي محرر فرعي؛ لا ينبغي لفشل أداة بصرية أن يعطل المعاينة.
  const saveBtn=document.getElementById("saveLecture");
  const previewBtn=document.getElementById("previewLecture");
  if(saveBtn){saveBtn.type="button";saveBtn.onclick=saveCurrentLecture}
  if(previewBtn){previewBtn.type="button";previewBtn.onclick=e=>{e?.preventDefault?.();e?.stopPropagation?.();renderLecturePreview()}}
  const safeBind=(name,fn)=>{try{fn()}catch(err){console.error('[Masar editor init] '+name,err)}};
  safeBind('compound editors',bindCompoundEditors);
  safeBind('math blocks',bindMathBlocks);
  safeBind('graph blocks',bindGraphBlocks);
  safeBind('geometry blocks',bindGeometryBlocks);
  safeBind('conic blocks',bindConicBlocks);
  safeBind('table blocks',bindTableBlocks);
  safeBind('matrix blocks',bindMatrixBlocks);
  safeBind('illustration blocks',bindIllustrationBlocks);
  safeBind('properties panel',()=>{bindPropertiesPanel();applyBlockDesign()});
  document.querySelectorAll(".blockEditor").forEach(card=>card.addEventListener("click",e=>{if(e.target.closest("button,input,select,textarea,.richContent,.richToolbar"))return;selectedBlockIndex=Number(card.dataset.index);applyBlockDesign();refreshPropertiesPanel()}));
  // v2.9.1: «إدراج عنصر هنا» يفتح قائمة العناصر بدل نافذة كتابة نوع العنصر
  const ed=document.querySelector('.lectureEditor');
  const openDrawer=(cls)=>{ed.classList.remove('showPalette','showProps');ed.classList.add(cls)};
  const closeDrawers=()=>{ed.classList.remove('showPalette','showProps');pendingInsertAt=null};
  const openPalette=(at)=>{pendingInsertAt=(at==null?null:at);const h=document.getElementById('paletteHint');if(h)h.textContent=at==null?'تُضاف الكتلة في نهاية المحاضرة.':'تُضاف الكتلة في الموضع الذي اخترته.';openDrawer('showPalette')};
  document.querySelectorAll("[data-insert-at]").forEach(btn=>btn.onclick=()=>openPalette(Number(btn.dataset.insertAt)));
  document.querySelectorAll("[data-pb]").forEach(el=>{const ev=el.tagName==='INPUT'?'oninput':'onchange';el[ev]=()=>{const b=editorLecture.blocks[Number(el.dataset.pbI)];if(!b)return;b[el.dataset.pb]=el.value;if(el.dataset.pb==='pageMode'){const card=el.closest('.pageBreakEditor');card.querySelectorAll('.pbBlankOnly').forEach(x=>x.hidden=el.value!=='blank');card.querySelector('.pbLine span').textContent=el.value==='blank'?'صفحة فارغة كاملة هنا':'صفحة جديدة من هنا'}scheduleDraft()}});
  document.getElementById('openPalette').onclick=()=>openPalette(null);
  document.getElementById('openProps').onclick=()=>{refreshPropertiesPanel();openDrawer('showProps')};
  document.querySelectorAll('[data-props]').forEach(b=>b.onclick=e=>{e.stopPropagation();selectedBlockIndex=Number(b.dataset.props);applyBlockDesign();refreshPropertiesPanel();openDrawer('showProps')});
  document.querySelectorAll('[data-close-drawer]').forEach(b=>b.onclick=closeDrawers);
  document.getElementById('focusToggle').onclick=()=>{const on=!document.body.classList.contains('editorFocus');try{localStorage.setItem('nibor-editor-focus',on?'on':'off')}catch(_){}applyEditorFocus(on)};
  // قائمة «⋯» لكل كتلة
  document.querySelectorAll('[data-block-menu]').forEach(b=>b.onclick=e=>{e.stopPropagation();const card=b.closest('.blockEditor');const open=!card.classList.contains('menuOpen');document.querySelectorAll('.blockEditor.menuOpen').forEach(x=>{x.classList.remove('menuOpen');x.querySelector('[data-block-menu]')?.setAttribute('aria-expanded','false')});if(open){card.classList.add('menuOpen');b.setAttribute('aria-expanded','true')}});
  if(!window.__niborMenuCloser){window.__niborMenuCloser=true;document.addEventListener('click',e=>{if(!e.target.closest('.blockHeadTools'))document.querySelectorAll('.blockEditor.menuOpen').forEach(x=>x.classList.remove('menuOpen'))});document.addEventListener('keydown',e=>{if(e.key==='Escape'){const le=document.querySelector('.lectureEditor');if(le){le.classList.remove('showPalette','showProps');pendingInsertAt=null}document.querySelectorAll('.blockEditor.menuOpen').forEach(x=>x.classList.remove('menuOpen'))}})}
  // شريط أدوات واحد: يظهر فقط للحقل النشط، وتُحدَّد الكتلة التي تكتب فيها
  const compounds=[...document.querySelectorAll('.compoundEditor')];
  const activate=c=>{compounds.forEach(x=>x.classList.toggle('rtActive',x===c))};
  compounds.forEach(c=>c.addEventListener('focusin',()=>{activate(c);const card=c.closest('.blockEditor');if(card){const i=Number(card.dataset.index);if(i!==selectedBlockIndex){selectedBlockIndex=i;applyBlockDesign()}}}));
  const sel=document.querySelector('.blockEditor[data-index="'+selectedBlockIndex+'"] .compoundEditor')||compounds[0];if(sel)activate(sel);
  document.querySelectorAll(".blockEditor").forEach(card=>{card.addEventListener("dragstart",e=>{draggedBlockIndex=Number(card.dataset.index);card.classList.add("dragging");e.dataTransfer.effectAllowed="move"});card.addEventListener("dragend",()=>{draggedBlockIndex=null;card.classList.remove("dragging");document.querySelectorAll(".blockEditor").forEach(x=>x.classList.remove("dragOver"))});card.addEventListener("dragover",e=>{e.preventDefault();if(draggedBlockIndex!==Number(card.dataset.index))card.classList.add("dragOver")});card.addEventListener("dragleave",()=>card.classList.remove("dragOver"));card.addEventListener("drop",e=>{e.preventDefault();const target=Number(card.dataset.index);card.classList.remove("dragOver");if(draggedBlockIndex===null||draggedBlockIndex===target)return;const [item]=editorLecture.blocks.splice(draggedBlockIndex,1);editorLecture.blocks.splice(target,0,item);draggedBlockIndex=null;renderLectureEditor();scheduleDraft()})});
  document.querySelectorAll("[data-up]").forEach(b=>b.onclick=()=>moveBlock(Number(b.dataset.up),-1));
  document.querySelectorAll("[data-down]").forEach(b=>b.onclick=()=>moveBlock(Number(b.dataset.down),1));
  document.querySelectorAll("[data-copy]").forEach(b=>b.onclick=()=>{const i=Number(b.dataset.copy),c=clone(editorLecture.blocks[i]);c.id=uid();editorLecture.blocks.splice(i+1,0,c);renderLectureEditor()});
  document.querySelectorAll("[data-collapse]").forEach(b=>b.onclick=()=>{const i=Number(b.dataset.collapse);editorLecture.blocks[i].collapsed=!editorLecture.blocks[i].collapsed;renderLectureEditor()});
  document.querySelectorAll("[data-save-library]").forEach(b=>b.onclick=()=>{const i=Number(b.dataset.saveLibrary),item=clone(editorLecture.blocks[i]);delete item.id;item.libraryId=uid();item.savedAt=new Date().toISOString();const list=loadBlockLibrary();list.unshift(item);saveBlockLibrary(list);if(typeof toast==="function")toast("تم حفظ الكتلة في مكتبتي ✓");else alert("تم حفظ الكتلة في مكتبتي")});
  document.querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>{const i=Number(b.dataset.remove);if(confirm("حذف هذا العنصر؟")){const removed=editorLecture.blocks[i]?.id;editorLecture.blocks.splice(i,1);editorLecture.blocks.forEach(x=>{const sm=ensureSmart(x);sm.dependencies=sm.dependencies.filter(id=>id!==removed)});renderLectureEditor()}});
  document.getElementById("addPageBreak").onclick=()=>{editorLecture.blocks.push(createEditorBlock('pagebreak'));renderLectureEditor();scheduleDraft()};
  const hs=history.state();const ub=document.getElementById("undoLecture"),rb=document.getElementById("redoLecture");if(ub){ub.disabled=!hs.canUndo;ub.onmousedown=e=>e.preventDefault();ub.onclick=()=>{if(historyTimer)flushHistory();restoreHistory(history.undo())}}if(rb){rb.disabled=!hs.canRedo;rb.onmousedown=e=>e.preventDefault();rb.onclick=()=>{if(historyTimer)flushHistory();restoreHistory(history.redo())}}
}
let activeRichRange=null;
function rememberRichRange(editor){const sel=window.getSelection();if(sel&&sel.rangeCount&&editor.contains(sel.anchorNode))activeRichRange=sel.getRangeAt(0).cloneRange()}
// v2.8.16: المحاذاة التي يختارها المعلم تُثبَّت على الفقرة فلا يلغيها الاتجاه التلقائي.
function markAlignment(ed,cmd){const v={justifyRight:'right',justifyCenter:'center',justifyLeft:'left',justifyFull:'justify'}[cmd];if(!v)return;const sel=window.getSelection();if(!sel||!sel.rangeCount)return;const r=sel.getRangeAt(0);const blocks=new Set();const add=n=>{let el=n&&n.nodeType===3?n.parentElement:n;const b=el&&el.closest?el.closest('p,div,li,h1,h2,h3,h4,blockquote'):null;if(b&&b!==ed&&ed.contains(b))blocks.add(b)};add(r.startContainer);add(r.endContainer);ed.querySelectorAll('p,div,li,h1,h2,h3,h4,blockquote').forEach(b=>{if(r.intersectsNode(b)&&!b.querySelector('p,div,li'))blocks.add(b)});blocks.forEach(b=>{b.style.textAlign=v;b.dataset.align=v})}
function restoreRichRange(editor){editor.focus();if(activeRichRange&&editor.contains(activeRichRange.commonAncestorContainer)){const sel=window.getSelection();sel.removeAllRanges();sel.addRange(activeRichRange)}}
function syncRichEditor(editor){const i=Number(editor.dataset.richIndex),field=editor.dataset.richField,b=editorLecture.blocks[i];if(!b)return;b[field+'Html']=sanitizeRichHTML(editor.innerHTML);b[field]=richPlainText(editor);scheduleDraft()}
// ===== v2.8.13: تنظيف المحتوى الغني وتخزين المعادلات ككود فقط =====
// يُحلَّل في مستند خامل (DOMParser) فلا يُنفَّذ أي شيء أثناء التنظيف.
const RICH_DROP_TAGS='script,style,meta,link,base,iframe,frame,frameset,object,embed,applet,form,input,textarea,select,option,button,noscript,template,portal,foreignObject,animate,set,animateMotion,animateTransform';
const RICH_URL_ATTRS=['href','src','xlink:href','action','formaction','poster','background','data','codebase','srcset'];
function safeRichURL(name,value){const v=String(value||'').trim().replace(/[\u0000-\u001F\u007F\s]+/g,'').toLowerCase();if(!v)return true;if(name==='src'||name==='srcset'||name==='poster')return /^(data:image\/(png|jpe?g|gif|webp|svg\+xml);|blob:|https?:|\.{0,2}\/|[a-z0-9_-]+\.(png|jpe?g|gif|webp|svg)$)/.test(v)||!/^[a-z][a-z0-9+.-]*:/.test(v);return !/^(javascript|vbscript|data):/.test(v)}
function stripRenderedMath(root){root.querySelectorAll('.richEquation,.eduMath').forEach(n=>{const latex=n.getAttribute('data-latex');if(latex!=null){n.textContent=latex}else{const ann=n.querySelector('annotation[encoding="application/x-tex"]');if(ann)n.textContent=ann.textContent}n.removeAttribute('data-rendered')});root.querySelectorAll('.katex,.katex-display').forEach(k=>{if(!k.closest('.richEquation,.eduMath')){const ann=k.querySelector('annotation[encoding="application/x-tex"]');k.replaceWith(document.createTextNode(ann?'$'+ann.textContent+'$':k.textContent))}})}
function sanitizeRichHTML(html){
 const doc=new DOMParser().parseFromString('<body>'+String(html||'')+'</body>','text/html');const body=doc.body;
 const drop=new Set(RICH_DROP_TAGS.toLowerCase().split(','));[...body.querySelectorAll('*')].forEach(n=>{if(drop.has(String(n.localName||n.nodeName).toLowerCase())&&n.isConnected)n.remove()});
 body.querySelectorAll('*').forEach(n=>{[...n.attributes].forEach(a=>{const name=a.name.toLowerCase();
  if(name.startsWith('on')||name==='srcdoc'||name==='formaction'||name==='contenteditable'&&n.tagName==='DIV'&&false){n.removeAttribute(a.name);return}
  if(RICH_URL_ATTRS.includes(name)&&!safeRichURL(name,a.value)){n.removeAttribute(a.name);return}
  if(name==='style'&&/expression\s*\(|url\s*\(\s*['"]?\s*javascript:|behavior\s*:|-moz-binding/i.test(a.value)){n.removeAttribute(a.name)}
 })});
 stripRenderedMath(body);
 return body.innerHTML}
function richPlainText(root){const c=root.cloneNode(true);c.querySelectorAll('.richEquation').forEach(n=>{const l=n.getAttribute('data-latex')||n.textContent;n.replaceWith((n.getAttribute('data-display')==='true'?'$$'+l+'$$':'$'+l+'$'))});c.querySelectorAll('.katex').forEach(k=>k.remove());c.querySelectorAll('br').forEach(n=>n.replaceWith('\n'));c.querySelectorAll('p,div,li,h1,h2,h3,h4,tr').forEach(n=>n.append('\n'));return String(c.textContent||'').replace(/\u00a0/g,' ').replace(/\n{3,}/g,'\n\n').trim()}
// v2.8.16: تنظيف حقيقي للمحتوى الملصوق (Word/مواقع/المحرر نفسه) مع الحفاظ على المعادلات.
const PASTE_KEEP_STYLE=/^(text-align|font-weight|font-style|text-decoration|text-decoration-line|color|direction)$/;
function pasteEquationNode(doc,latex,disp){const e=doc.createElement('span');e.className='richEquation'+(disp?' richEquationDisplay':'');e.setAttribute('contenteditable','false');e.setAttribute('data-latex',latex);e.setAttribute('data-display',disp?'true':'false');e.textContent=latex;return e}
function cleanRichHTML(html){
 const doc=new DOMParser().parseFromString('<body>'+String(html||'')+'</body>','text/html'),body=doc.body;
 // المعادلات أولًا: من المحرر نفسه أو من أي صفحة KaTeX
 [...body.querySelectorAll('.richEquation,.eduMath,[data-latex]')].forEach(n=>{if(!n.isConnected)return;const latex=n.getAttribute('data-latex')||n.querySelector('annotation[encoding="application/x-tex"]')?.textContent||'';if(!latex.trim())return;const disp=n.getAttribute('data-display')==='true'||/Display/.test(n.className||'');n.replaceWith(pasteEquationNode(doc,latex.trim(),disp))});
 [...body.querySelectorAll('.katex')].forEach(k=>{if(!k.isConnected||k.closest('.richEquation'))return;const ann=k.querySelector('annotation[encoding="application/x-tex"]');if(!ann)return;const host=k.closest('.katex-display')||k;host.replaceWith(pasteEquationNode(doc,ann.textContent.trim(),!!k.closest('.katex-display')))});
 // تعليقات Word الشرطية ووسوم Office
 const w=doc.createTreeWalker(body,NodeFilter.SHOW_COMMENT);const cm=[];while(w.nextNode())cm.push(w.currentNode);cm.forEach(c=>c.remove());
 body.querySelectorAll('script,style,meta,link,iframe,object,xml,title,head').forEach(n=>n.remove());
 [...body.querySelectorAll('*')].forEach(n=>{if(n.isConnected&&/:/.test(n.localName||''))n.replaceWith(...n.childNodes)});
 [...body.querySelectorAll('font')].forEach(f=>f.replaceWith(...f.childNodes));
 // الخصائص: نُبقي العريض/المائل/التسطير/اللون/المحاذاة فقط
 body.querySelectorAll('*').forEach(n=>{const isEq=n.classList&&n.classList.contains('richEquation');[...n.attributes].forEach(a=>{const name=a.name.toLowerCase();
  if(isEq&&['class','contenteditable','data-latex','data-display'].includes(name))return;
  if(name==='style'){const kept=[];String(a.value).split(';').forEach(decl=>{const i=decl.indexOf(':');if(i<0)return;const k=decl.slice(0,i).trim().toLowerCase(),v=decl.slice(i+1).trim();if(!k||!v||/mso-/i.test(k)||/mso-|windowtext|inherit|initial/i.test(v))return;if(!PASTE_KEEP_STYLE.test(k))return;if(k==='color'&&/^(black|#000(000)?|rgb\(0,\s*0,\s*0\)|currentcolor)$/i.test(v))return;if(k==='font-weight'&&!/bold|[6-9]00/.test(v))return;if(k==='font-style'&&!/italic/.test(v))return;kept.push(k+':'+v)});if(kept.length)n.setAttribute('style',kept.join(';'));else n.removeAttribute('style');return}
  if(['href','src','alt','colspan','rowspan','dir'].includes(name))return;
  n.removeAttribute(a.name)})});
 [...body.querySelectorAll('span')].forEach(sp=>{if(sp.isConnected&&!sp.attributes.length)sp.replaceWith(...sp.childNodes)});
 [...body.querySelectorAll('p,div')].forEach(pp=>{if(pp.isConnected&&!pp.textContent.replace(/[\s ]/g,'')&&!pp.querySelector('img,table,.richEquation,br'))pp.remove()});
 return sanitizeRichHTML(body.innerHTML)}

function currentRichBlock(editor){
  const sel=window.getSelection();
  let n=sel&&sel.rangeCount?sel.anchorNode:null;
  if(n&&n.nodeType===Node.TEXT_NODE)n=n.parentElement;
  const block=n?.closest?.('p,div,h1,h2,h3,h4,h5,h6,li,blockquote,td,th');
  return block&&editor.contains(block)?block:editor;
}
function setRichDirection(editor,dir){
  restoreRichRange(editor);
  const block=currentRichBlock(editor);
  const autoDir=window.MasarAutoDirection||window.Masar?.resolve?.('editor.autoDirection');
  if(autoDir)autoDir.setMode(block,dir);
  else if(dir==='auto'){
    block.setAttribute('dir','auto');
    block.dataset.dirMode='auto';
    block.style.removeProperty('direction');
    block.style.removeProperty('text-align');
  }else{
    block.setAttribute('dir',dir);
    block.dataset.dirMode='manual';
    block.style.direction=dir;
    block.style.textAlign=dir==='rtl'?'right':'left';
  }
  syncRichEditor(editor);
  rememberRichRange(editor);
}
function makeMathNode(latex,display,editorMode){
  const el=document.createElement('span');
  el.className=editorMode?'richEquation'+(display?' richEquationDisplay':''):'eduMath'+(display?' eduMathDisplay':'');
  el.dataset.equationId=el.dataset.equationId||('eq_'+Date.now().toString(36)+Math.random().toString(36).slice(2,8));
  el.dataset.latex=latex;
  el.dataset.display=display?'true':'false';
  if(editorMode){el.setAttribute('contenteditable','false');el.setAttribute('tabindex','0');el.title='انقر مرتين لتعديل المعادلة';}
  el.textContent=latex;
  return el;
}
function transformMathTextNodes(root,editorMode){
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(node){
    if(!node.nodeValue||node.nodeValue.indexOf('$')<0)return NodeFilter.FILTER_REJECT;
    const p=node.parentElement;
    if(!p||p.closest('.katex,.eduMath,.richEquation,script,style,textarea,code,pre'))return NodeFilter.FILTER_REJECT;
    return NodeFilter.FILTER_ACCEPT;
  }});
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  const rx=/\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
  nodes.forEach(node=>{
    const text=node.nodeValue;let m,last=0,changed=false;const frag=document.createDocumentFragment();rx.lastIndex=0;
    while((m=rx.exec(text))){
      const latex=(m[1]??m[2]??'').trim();if(!latex)continue;
      changed=true;if(m.index>last)frag.appendChild(document.createTextNode(text.slice(last,m.index)));
      frag.appendChild(makeMathNode(latex,m[1]!=null,editorMode));last=rx.lastIndex;
    }
    if(changed){if(last<text.length)frag.appendChild(document.createTextNode(text.slice(last)));node.replaceWith(frag)}
  });
}
// v2.8.13: تحويل فوري عند إغلاق $...$ أو $$...$$ (بدل الانتظار حتى مغادرة المحرر).
function liveConvertMath(ed){
 const sel=window.getSelection();if(!sel||!sel.rangeCount||!sel.isCollapsed)return false;
 const node=sel.anchorNode,off=sel.anchorOffset;if(!node||node.nodeType!==3||!ed.contains(node))return false;
 if(node.parentElement&&node.parentElement.closest('.richEquation,.katex,code,pre'))return false;
 const before=node.nodeValue.slice(0,off);let m,display=false,start;
 if((m=before.match(/\$\$([^$]+?)\$\$$/))){display=true;start=before.length-m[0].length}
 else if((m=before.match(/(^|[^$\\])\$([^$\n]+?)\$$/))){start=before.length-m[0].length+m[1].length;m=[m[0],m[2]]}
 else return false;
 const latex=m[1].trim();if(!latex||!validateLatex(latex).ok)return false;
 const after=node.nodeValue.slice(off),head=node.nodeValue.slice(0,start);
 const math=makeMathNode(latex,display,true),parent=node.parentNode;
 const tail=document.createTextNode('\u00a0'+after);
 node.nodeValue=head;parent.insertBefore(math,node.nextSibling);parent.insertBefore(tail,math.nextSibling);
 const r=document.createRange();r.setStart(tail,1);r.collapse(true);sel.removeAllRanges();sel.addRange(r);
 renderKatex(math);return true}
function convertTypedMathToRich(editor){
  transformMathTextNodes(editor,true);
  syncRichEditor(editor);
  renderKatex(editor);
}
function bindCompoundEditors(){
 document.querySelectorAll('.richContent').forEach(ed=>{(window.MasarAutoDirection||window.Masar?.resolve?.('editor.autoDirection'))?.bindEditor(ed);ed.ondblclick=e=>{const node=e.target.closest('.richEquation');if(node&&ed.contains(node)){e.preventDefault();openEquationEditor(Number(ed.dataset.richIndex),ed.dataset.richField,ed,node)}};ed.oninput=e=>{if(e&&e.inputType==='insertText'&&e.data&&e.data.slice(-1)==='$'){try{liveConvertMath(ed)}catch(err){console.warn('liveConvertMath',err)}}syncRichEditor(ed)};ed.onkeyup=()=>rememberRichRange(ed);ed.onmouseup=()=>rememberRichRange(ed);ed.onfocus=()=>rememberRichRange(ed);ed.onblur=()=>{if(!replacingContent)convertTypedMathToRich(ed)};ed.onpaste=e=>{const html=e.clipboardData?.getData('text/html'),plain=e.clipboardData?.getData('text/plain');if(!html){setTimeout(()=>{try{convertTypedMathToRich(ed)}catch(_){}},0);return}e.preventDefault();restoreRichRange(ed);document.execCommand('insertHTML',false,cleanRichHTML(html));convertTypedMathToRich(ed);rememberRichRange(ed);showPasteNotice('تم لصق المحتوى وتنظيف تنسيقه ✓')}});
 document.querySelectorAll('.richToolbar').forEach(tb=>{const ed=tb.nextElementSibling,status=tb.querySelector('[data-dir-status]');const updateDirStatus=e=>{const d=e?.detail?.direction||currentRichBlock(ed)?.getAttribute('dir')||'auto';if(status){status.textContent=d==='rtl'?'عربي RTL':d==='ltr'?'English LTR':'تلقائي';status.dataset.direction=d}};ed.addEventListener('masar:directionchange',updateDirStatus);updateDirStatus();tb.onmousedown=e=>{if(e.target.closest('button'))e.preventDefault()};tb.querySelectorAll('[data-rich-cmd]').forEach(b=>b.onclick=()=>{restoreRichRange(ed);const cmd=b.dataset.richCmd;document.execCommand(cmd,false,null);if(/^justify/.test(cmd))markAlignment(ed,cmd);rememberRichRange(ed);syncRichEditor(ed)});const moreBtn=tb.querySelector('[data-rich-more]'),moreRow=tb.querySelector('.rtMore');if(moreBtn&&moreRow)moreBtn.onclick=()=>{moreRow.hidden=!moreRow.hidden;moreBtn.setAttribute('aria-expanded',String(!moreRow.hidden));moreBtn.classList.toggle('on',!moreRow.hidden)};const fmt=tb.querySelector('[data-rich-block]');fmt.onchange=()=>{restoreRichRange(ed);document.execCommand('formatBlock',false,fmt.value);rememberRichRange(ed);syncRichEditor(ed)};tb.querySelector('[data-rich-color]').oninput=e=>{restoreRichRange(ed);document.execCommand('foreColor',false,e.target.value);rememberRichRange(ed);syncRichEditor(ed)};tb.querySelectorAll('[data-rich-dir]').forEach(b=>b.onclick=()=>setRichDirection(ed,b.dataset.richDir));tb.querySelectorAll('[data-rich-insert]').forEach(b=>b.onclick=()=>{rememberRichRange(ed);const kind=b.dataset.richInsert;if(kind==='equation')openEquationEditor(Number(ed.dataset.richIndex),ed.dataset.richField,ed);if(kind==='table')insertRichTable(ed);if(kind==='image')insertRichImage(ed);if(kind==='graph')insertRichGraph(ed)})});
 document.querySelectorAll('.blockTitleInput').forEach(input=>(window.MasarAutoDirection||window.Masar?.resolve?.('editor.autoDirection'))?.bindInput(input));
 renderKatex(document);
}
function insertHTMLAtRich(editor,html){restoreRichRange(editor);document.execCommand('insertHTML',false,html);syncRichEditor(editor);rememberRichRange(editor)}
function insertRichTable(editor){const r=Math.max(1,Math.min(12,parseInt(prompt('عدد الصفوف','3'))||3)),c=Math.max(1,Math.min(8,parseInt(prompt('عدد الأعمدة','3'))||3));let h='<div class="richEmbed richTableWrap" contenteditable="false"><div class="embedLabel">جدول</div><table contenteditable="true"><tbody>';for(let i=0;i<r;i++){h+='<tr>';for(let j=0;j<c;j++)h+=(i===0?'<th>عنوان</th>':'<td>بيانات</td>');h+='</tr>'}h+='</tbody></table><button class="removeEmbed" onclick="this.parentElement.remove()">حذف الجدول</button></div><p><br></p>';insertHTMLAtRich(editor,h)}
function insertRichImage(editor){const input=document.createElement('input');input.type='file';input.accept='image/*';input.onchange=async()=>{const f=input.files?.[0];if(!f)return;showPasteNotice('جارِ تجهيز الصورة…');const src=await compressImageFile(f);if(!src){alert('تعذر قراءة الصورة');return}const caption=prompt('عنوان الصورة (اختياري)','')||'';insertHTMLAtRich(editor,'<figure class="richEmbed richImage" contenteditable="false"><img src="'+src+'" alt="'+safe(caption)+'"><figcaption contenteditable="true">'+safe(caption)+'</figcaption></figure><p><br></p>');showPasteNotice('تم إدراج الصورة ('+Math.round(src.length*0.75/1024)+' KB) ✓')};input.click()}
function graphSVG(expr){let pts=[];const js=expr.replace(/\^/g,'**').replace(/\bx\b/g,'(x)').replace(/sqrt/gi,'Math.sqrt').replace(/sin/gi,'Math.sin').replace(/cos/gi,'Math.cos').replace(/tan/gi,'Math.tan');for(let k=0;k<=120;k++){const x=-6+k/10;let y;try{y=Function('x','return ('+js+')')(x)}catch(_){return null}if(Number.isFinite(y)&&Math.abs(y)<=10)pts.push([20+(x+6)*30,200-y*18])}const d=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');return '<svg viewBox="0 0 400 400" role="img"><line x1="20" y1="200" x2="380" y2="200"/><line x1="200" y1="20" x2="200" y2="380"/><path d="'+d+'"/></svg>'}
function insertRichGraph(editor){const expr=prompt('اكتب الدالة بدلالة x، مثال: x^2-4','x^2-4');if(!expr)return;const svg=graphSVG(expr);if(!svg){alert('تعذر قراءة الدالة. استخدم صيغة مثل x^2-4 أو sin(x).');return}insertHTMLAtRich(editor,'<figure class="richEmbed richGraph" contenteditable="false">'+svg+'<figcaption>y = '+safe(expr)+'</figcaption><button class="removeEmbed" onclick="this.parentElement.remove()">حذف الرسم</button></figure><p><br></p>')}
function normalizePastedText(text){return String(text||"").replace(/\r\n?/g,"\n").replace(/[\u00a0\u2007\u202f]/g," ").replace(/[ \t]+\n/g,"\n").replace(/\n{3,}/g,"\n\n").trim()}
function wordHTMLToMarkup(html){
  const doc=new DOMParser().parseFromString(String(html||""),"text/html");
  doc.querySelectorAll("script,style,meta,link,xml,iframe,object").forEach(n=>n.remove());
  doc.querySelectorAll("o\\:p").forEach(n=>n.replaceWith(" "));
  const walk=node=>{
    if(node.nodeType===Node.TEXT_NODE)return node.nodeValue||"";
    if(node.nodeType!==Node.ELEMENT_NODE)return "";
    const tag=node.tagName.toLowerCase();
    let inner=Array.from(node.childNodes).map(walk).join("");
    if(tag==="br")return "\n";
    if(tag==="b"||tag==="strong")return inner.trim()?"**"+inner.trim()+"**":"";
    if(tag==="i"||tag==="em")return inner.trim()?"*"+inner.trim()+"*":"";
    if(tag==="li")return "• "+inner.trim()+"\n";
    if(/^h[1-6]$/.test(tag))return inner.trim()?"\n**"+inner.trim()+"**\n":"";
    if(["p","div","section","article","tr"].includes(tag))return inner.trim()?inner.trim()+"\n":"";
    if(tag==="td"||tag==="th")return inner.trim()+" | ";
    return inner;
  };
  return normalizePastedText(walk(doc.body));
}
function insertAtSelection(area,text){const start=area.selectionStart??area.value.length,end=area.selectionEnd??start;area.setRangeText(text,start,end,"end");area.dispatchEvent(new Event("input",{bubbles:true}))}
function showPasteNotice(message){if(typeof toast==="function")toast(message);else{const s=document.getElementById("lectureSaveState");if(s)s.textContent=message}}
function handleSmartPaste(e,index,field,area){
  const data=e.clipboardData;if(!data)return;
  const html=data.getData("text/html"),plain=data.getData("text/plain");
  if(!html&&!plain)return;
  const cleaned=html?wordHTMLToMarkup(html):normalizePastedText(plain);
  if(!cleaned)return;
  e.preventDefault();
  if(cleaned.length>12000&&!confirm("المحتوى كبير. للحصول على نتيجة أفضل عند نقل فصل أو ملزمة كاملة استخدم استيراد ملف Word في الإصدار المخصص لذلك. هل تريد متابعة اللصق الآن؟"))return;
  insertAtSelection(area,cleaned);
  editorLecture.blocks[index][field]=area.value;scheduleDraft();
  showPasteNotice(html?"تم لصق المحتوى وتنظيف تنسيق Word ✓":"تم لصق النص ✓");
}
function moveBlock(i,d){const j=i+d;if(j<0||j>=editorLecture.blocks.length)return;[editorLecture.blocks[i],editorLecture.blocks[j]]=[editorLecture.blocks[j],editorLecture.blocks[i]];renderLectureEditor()}
function saveCurrentLecture(){syncMeta();editorLecture=normalizeLecture(editorLecture);const validation=window.MasarDocumentCore?.validateLecture(editorLecture);if(validation&&!validation.ok){alert("تعذر الحفظ:\n"+validation.errors.join("\n"));return}const ids=new Set(editorLecture.blocks.map(x=>x.id));const broken=editorLecture.blocks.flatMap((x,i)=>ensureSmart(x).dependencies.filter(id=>!ids.has(id)).map(()=>"العنصر "+(i+1)+" يحتوي مرجعًا مفقودًا"));if(broken.length){alert("تعذر الحفظ:\n"+broken.join("\n"));return}if(!editorLecture.title){alert("اكتب عنوان المحاضرة أولًا");return}editorLecture.updatedAt=new Date().toISOString();const list=loadLectures(),i=list.findIndex(x=>x.id===editorLecture.id);if(i>=0)list[i]=clone(editorLecture);else list.unshift(clone(editorLecture));try{saveLectures(list)}catch(err){storageFull(err);alert('تعذر حفظ المحاضرة: '+(isQuotaError(err)?'مساحة التخزين ممتلئة. اضغط «تصغير صور المحاضرة» ثم احفظ مجددًا.':String(err&&err.message||err)));return}storageRemove(DRAFT_KEY);const s=document.getElementById("lectureSaveState");if(s)s.textContent="محفوظة";if(typeof toast==="function")toast("تم حفظ المحاضرة ✓")}
function mathHTML(text){
  let out=safe(text||"");
  out=out.replace(/\$\$([\s\S]+?)\$\$/g,(_,lx)=>'<span class="eduMath eduMathDisplay" data-display="true" data-latex="'+safe(lx.trim())+'">'+safe(lx.trim())+'</span>');
  out=out.replace(/\$([^$\n]+?)\$/g,(_,lx)=>'<span class="eduMath" data-display="false" data-latex="'+safe(lx.trim())+'">'+safe(lx.trim())+'</span>');
  return out.replace(/\n/g,'<br>')
}
function richPreview(b,field){let html=b[field+'Html'];if(!html)return mathHTML(b[field]||'');const box=document.createElement('div');box.innerHTML=sanitizeRichHTML(html);box.querySelectorAll('script,style,button').forEach(n=>n.remove());box.querySelectorAll('.richEquation').forEach(n=>{
    const isDisplay=n.dataset.display==='true'||n.classList.contains('richEquationDisplay');
    n.className='eduMath'+(isDisplay?' eduMathDisplay':'');
    n.textContent=n.dataset.latex||n.textContent;
    n.dataset.display=n.dataset.display||'false';
    // مهم: HTML المحرر قد يحمل data-rendered=true من معاينة التحرير.
    // يجب مسحه حتى يعاد رسم المعادلة داخل معاينة A4 والطباعة.
    n.removeAttribute('data-rendered');
  });transformMathTextNodes(box,false);return box.innerHTML}
function smartPrintMetaHTML(b){
 const sm=ensureSmart(b),parts=[];
 if(sm.showDifficulty)parts.push('<span>'+difficultyLabel(sm.difficulty)+'</span>');
 if(sm.marks)parts.push('<span>'+safe(sm.marks)+' درجات</span>');
 if(sm.tags.length)parts.push('<span>'+sm.tags.map(safe).join(' · ')+'</span>');
 return parts.length?'<div class="smartPrintMeta">'+parts.join('')+'</div>':'';
}
// v2.9.7: حجم خط الطباعة على مستوى المحاضرة (12/13/14 نقطة) وحجم الكتلة نسبة منه
function lectureTextSize(l){const v=Number(l&&l.textSize);return v>=11&&v<=16?v:13}
// v2.10.0: العلامة المائية (نص أو شعار) فوق المحتوى بشفافية عالية
function lectureWatermark(l){const w=(l&&l.watermark&&typeof l.watermark==='object')?l.watermark:{};const type=['text','logo'].includes(w.type)?w.type:'none';const op=Math.min(0.25,Math.max(0.03,Number(w.opacity)||0.08));return {type,text:String(w.text||'').trim(),img:typeof w.img==='string'&&/^data:image\/(png|jpeg|webp|gif);base64,/.test(w.img)?w.img:'',opacity:op}}
function watermarkHTML(l){const w=lectureWatermark(l);if(w.type==='text'&&w.text)return '<div class="lecWatermark wmText" aria-hidden="true" style="opacity:'+w.opacity+'"><span>'+safe(w.text)+'</span></div>';if(w.type==='logo'&&w.img)return '<div class="lecWatermark wmLogo" aria-hidden="true" style="opacity:'+w.opacity+'"><img src="'+w.img+'" alt=""></div>';return ''}
function watermarkImageFile(file){return new Promise((res,rej)=>{if(!file||!/^image\//.test(file.type))return rej(new Error('NOT_IMAGE'));const fr=new FileReader();fr.onload=()=>{const im=new Image();im.onload=()=>{const k=Math.min(1,700/Math.max(im.width,im.height));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.width*k));c.height=Math.max(1,Math.round(im.height*k));c.getContext('2d').drawImage(im,0,0,c.width,c.height);res(c.toDataURL('image/png'))};im.onerror=()=>rej(new Error('BAD_IMAGE'));im.src=fr.result};fr.onerror=()=>rej(fr.error);fr.readAsDataURL(file)})}
function watermarkPanelHTML(){const w=lectureWatermark(editorLecture);return '<div class="wmPanel"><label>العلامة المائية<select id="lecWmType"><option value="none"'+(w.type==='none'?' selected':'')+'>بدون</option><option value="text"'+(w.type==='text'?' selected':'')+'>نص</option><option value="logo"'+(w.type==='logo'?' selected':'')+'>شعار (صورة)</option></select></label><label class="wmText"'+(w.type==='text'?'':' hidden')+'>نص العلامة<input id="lecWmText" value="'+safe(w.text||editorLecture.teacher||'')+'" placeholder="مثل: الأستاذ فائز الحمداني"></label><div class="wmLogoRow"'+(w.type==='logo'?'':' hidden')+'><label class="wmPick">'+(w.img?'تغيير الشعار':'اختيار شعار')+'<input id="lecWmFile" type="file" accept="image/*" hidden></label>'+(w.img?'<img class="wmThumb" src="'+w.img+'" alt="الشعار">':'<span class="wmNone">لم يُختر شعار بعد (PNG بخلفية شفافة أفضل)</span>')+'</div><label class="wmOp"'+(w.type==='none'?' hidden':'')+'>الشفافية <span id="lecWmOpV">'+Math.round(w.opacity*100)+'%</span><input id="lecWmOpacity" type="range" min="3" max="25" step="1" value="'+Math.round(w.opacity*100)+'"></label></div>'}
function lectureTheme(l){return (l&&l.colorTheme==='classic')?'classic':'royal'}
function lectureSizeStyle(l){return ' style="--lec-fs:'+lectureTextSize(l)+'pt" data-theme="'+lectureTheme(l)+'"'}
function blockFontScale(d){const v=Number(d&&d.fontSize);if(!v||v===13.5)return 1;if(v>3)return Math.round(v/13.5*100)/100;return v}
// v2.10.1: رأس وتذييل بهوية ملزمة: شريط الأستاذ (الاسم بخط كبير + رقم الهاتف)، ورأس جارٍ مختصر في الصفحات التالية.
const DEFAULT_TEACHER_PHONE='07810295140';
function lecturePhone(l){return l&&typeof l.phone==='string'?l.phone.trim():DEFAULT_TEACHER_PHONE}
const PHONE_IC='<svg class="lecPhIc" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25c1.1.37 2.3.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.6a1 1 0 0 1-.25 1z"/></svg>';
function teacherRole(l){const t=String(l.teacher||'');if(!l.subject)return '';return (/^(الست|المدرسة|الأستاذة|المدرّسة)/.test(t)?'مدرّسة':'مدرّس')+' مادة '+safe(l.subject)}
function phoneHTML(ph,cls){return ph?'<span class="'+cls+'" dir="ltr">'+PHONE_IC+'<bdi>'+safe(ph)+'</bdi></span>':''}
function teacherBandHTML(l){const t=String(l.teacher||'').trim(),ph=lecturePhone(l);if(!t&&!ph)return '';const role=teacherRole(l);return '<div class="lecBand"><div class="lecBandWho">'+(t?'<b class="lecTeacher">'+safe(t)+'</b>':'')+(t&&role?'<small class="lecRole">'+role+'</small>':'')+'</div>'+phoneHTML(ph,'lecPhone')+'</div>'}
function lectureHeaderHTML(l,compact=false){const kick=[l.subject,l.grade,l.chapter].filter(Boolean).map(safe).join(' <i>·</i> ');
 if(compact)return '<header class="lectureDocHead lectureDocHeadCompact lecRun"><span class="lecRunWho">'+safe(l.teacher||'')+'</span><span class="lecRunTitle">'+safe(l.title||'')+'</span><span class="lectureNumber lecRunNo">المحاضرة <b>'+safe(l.lectureNo||"—")+'</b></span></header>';
 return teacherBandHTML(l)+'<header class="lectureDocHead lecHeadMain"><div class="lecHeadTxt">'+(kick?'<span class="lecKicker">'+kick+'</span>':'')+'<h1>'+safe(l.title)+'</h1></div><div class="lectureNumber">المحاضرة<br><b>'+safe(l.lectureNo||"—")+'</b></div></header>'}
function lectureFootSide(l){return [l.subject,l.grade].filter(Boolean).map(safe).join(' — ')}
function lectureFooterHTML(l,page,total){return '<footer class="lectureDocFoot lecFoot"><span class="lecFootWho"><b>'+safe(l.teacher||'')+'</b>'+phoneHTML(lecturePhone(l),'lecFootPh')+'</span><span class="lecturePageNumber">صفحة '+page+' من '+total+'</span><span class="lecFootSide">'+lectureFootSide(l)+'</span></footer>'}
function previewFallbackBlockHTML(b,i,err){
 const type=String(b?.type||'text'),label=BLOCK_TYPES[type]?.label||'عنصر',title=String(b?.title||label),plain=String(b?.content||b?.latex||'').trim();
 console.warn('تعذر عرض عنصر المحاضرة رقم '+(i+1),{type,error:err});
 return '<section data-lecture-block="'+i+'" class="lectureBlock previewFallbackBlock type-'+safe(type)+'"><div class="lectureBlockTitle"><span>⚠️</span><h2>'+safe(title)+'</h2></div><div class="lectureBlockContent">'+(plain?'<p>'+mathHTML(plain)+'</p>':'<p>تعذر عرض هذا العنصر، لكن بقية المحاضرة ما زالت متاحة.</p>')+'</div></section>';
}
function lectureBlockHTMLUnsafe(l,b,i){
 b=(b&&typeof b==='object')?b:{type:'text',title:'عنصر',content:''};
 if(b.type==='pagebreak')return pageBreakPrintHTML(b,i);
 const d=(b.design&&typeof b.design==='object')?b.design:{};
 const eqNo=b.type==='math'&&b.numbered!==false?((Array.isArray(l?.blocks)?l.blocks:[]).slice(0,i+1).filter(x=>x?.type==='math'&&x?.numbered!==false).length):null;
 const style='--print-accent:'+safe(d.accent||'#0f172a')+';--print-bg:'+safe(d.background||'#ffffff')+';--print-font:calc(var(--lec-fs,13pt) * '+blockFontScale(d)+');--print-align:'+safe(d.align||'right')+';--print-border:'+safe(d.borderStyle||'solid')+';--print-padding:'+(Number(d.padding)||12)+'px';
 let content='';
 switch(b.type){
  case 'math': content='<div class="standaloneEquation" style="text-align:'+safe(b.mathAlign||'center')+';font-size:'+(Number(b.mathSize)||1)+'em"><span class="eduMath eduMathDisplay" data-display="true" data-latex="'+safe(b.latex||b.content||'')+'">'+safe(b.latex||b.content||'')+'</span>'+(eqNo?'<span class="equationNumber">('+eqNo+')</span>':'')+'</div>'; break;
  case 'graph': content='<div class="graphPrintObject">'+graphSvg(b,false,-1)+'</div>'; break;
  case 'geometry': content='<div class="geometryPrintObject">'+geometrySvg(b,false,-1)+'</div>'; break;
  case 'conic': {const info=conicInfo(ensureConic(b));content='<div class="conicPrintObject">'+conicSvg(b)+'<div class="conicPrintEquation">'+safe(info?.eq||'')+'</div></div>';break;}
  case 'table': content=tablePrintHTML(b); break;
  case 'matrix': content=matrixHTML(b,false); break;
  case 'illustration': content='<div class="illustrationPrintObject">'+illustrationSvg(b,false,i)+'</div>'; break;
  default: content=richPreview(b,'content');
 }
 const type=String(b.type||'text'),smart=SMART_TYPES.has(type),label=BLOCK_TYPES[type]?.label||'عنصر';
 const numbered=smart&&ensureSmart(b).autoNumber!==false,ownTitle=String(b.title||'').trim();const title=numbered?(ownTitle&&ownTitle!==label?smartLabel(l,b,i)+' — '+ownTitle:smartLabel(l,b,i)):(ownTitle||label);// v2.8.17: لا تكرار «تعريف 1 — تعريف»
 const solution=((b.solutionHtml||b.solution)&&(!smart||ensureSmart(b).showSolution!==false))?'<div class="lectureSolution"><b>الحل:</b> '+richPreview(b,'solution')+'</div>':'';
 const lines=smart?ensureSmart(b).answerLines:0;
 const customAccent=d.accent&&String(d.accent).toLowerCase()!=='#0f172a';
 return '<section data-lecture-block="'+i+'"'+(customAccent?' data-accent="1"':'')+' style="'+style+'" class="lectureBlock type-'+safe(type)+(b.pageBreakBefore?' forcePageBreak':'')+(b.keepTogether!==false?' keepTogether':'')+(d.hideTitle?' hideBlockTitle':'')+'"><div class="lectureBlockTitle"><span class="lbIc">'+blockIcon(type)+'</span><h2>'+safe(title)+'</h2></div>'+(smart?smartPrintMetaHTML(b):'')+'<div class="lectureBlockContent">'+content+solution+(smart&&lines>0?'<div class="answerLines">'+Array.from({length:lines},()=>'<span></span>').join('')+'</div>':'')+'</div></section>';
}
function lectureBlockHTML(l,b,i){
 try{return lectureBlockHTMLUnsafe(l,b,i)}catch(err){return previewFallbackBlockHTML(b,i,err)}
}
// v2.9.3: نسخة الطباعة متدفقة — المتصفح يقسّم الصفحات حسب مساحته الفعلية (Safari على الآيباد يفرض هوامشه ورأسه وتذييله).
// الصفحات الثابتة بارتفاع 297mm كانت تفيض فتنتج صفحة فارغة بعد كل صفحة.
function lectureFlowHTML(l){const lecture=(l&&typeof l==='object')?l:{};const blocks=Array.isArray(lecture.blocks)?lecture.blocks:[];let head='';try{head=lectureHeaderHTML(lecture,false)}catch(_){head='<header class="lectureDocHead"><div><h1>'+safe(lecture.title||'محاضرة')+'</h1></div></header>'}
 return '<article class="lectureFlowDoc"'+lectureSizeStyle(lecture)+'>'+watermarkHTML(lecture)+head+'<div class="lectureDocBody">'+blocks.map((b,i)=>lectureBlockHTML(lecture,b,i)).join('')+'</div><footer class="lectureFlowFoot lecFoot"><span class="lecFootWho"><b>'+safe(lecture.teacher||'')+'</b>'+phoneHTML(lecturePhone(lecture),'lecFootPh')+'</span><span class="lecFootSide">'+lectureFootSide(lecture)+'</span></footer></article>'}
function lectureDocumentHTML(l){
 const lecture=(l&&typeof l==='object')?l:{};
 const blocks=Array.isArray(lecture.blocks)?lecture.blocks:[];
 let head='',foot='';
 try{head=lectureHeaderHTML(lecture,false)}catch(err){console.warn('تعذر عرض رأس المحاضرة',err);head='<header class="lectureDocHead"><div><h1>'+safe(lecture.title||'محاضرة')+'</h1></div></header>';}
 try{foot=lectureFooterHTML(lecture,1,1)}catch(err){console.warn('تعذر عرض تذييل المحاضرة',err);foot='<footer class="lectureDocFoot"><span>نيبور كلاس</span></footer>';}
 return '<div class="lecturePaper"'+lectureSizeStyle(lecture)+'>'+watermarkHTML(lecture)+head+'<div class="lectureDocBody">'+blocks.map((b,i)=>lectureBlockHTML(lecture,b,i)).join('')+'</div>'+foot+'</div>';
}
async function waitLectureAssets(root){renderKatex(root);if(document.fonts?.ready)try{await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,1800))])}catch(_){}const imgs=[...root.querySelectorAll('img')].filter(x=>!x.complete);if(imgs.length)await Promise.race([Promise.all(imgs.map(x=>new Promise(r=>{x.onload=x.onerror=r;setTimeout(r,1200)}))),new Promise(r=>setTimeout(r,1800))])}
function splitTableForPages(lecture,b,i,node,blockH,capacity,h){
 const t=ensureTable(b);const trs=node?[...node.querySelectorAll('.smartTablePrint tr')]:[];
 if(trs.length!==t.cells.length||trs.length<2)return null;
 const rowH=trs.map(tr=>Math.max(1,h(tr)));
 // v2.9.7: تثبيت عرض الأعمدة في كل جزء كما في الجدول الكامل، حتى لا يتغير ارتفاع الصفوف بعد التقسيم
 let colWidths=null;try{const tw=node.querySelector('.smartTablePrint table').getBoundingClientRect().width;const cs=[...trs[0].children];if(tw>0&&cs.length)colWidths=cs.map(c=>c.getBoundingClientRect().width/tw*100)}catch(_){}const sum=rowH.reduce((a,x)=>a+x,0);const overhead=Math.max(0,blockH-sum);
 const headRows=t.header?1:0,headH=headRows?rowH[0]:0,avail=capacity-overhead-headH-6;if(avail<40)return null;
 const groups=[];let g=[],gh=0;for(let r=headRows;r<t.cells.length;r++){if(g.length&&gh+rowH[r]>avail){groups.push(g);g=[];gh=0}g.push(r);gh+=rowH[r]}if(g.length)groups.push(g);
 if(groups.length<2)return null;
 return groups.map((rows,k)=>{const cells=(headRows?[t.cells[0]]:[]).concat(rows.map(r=>t.cells[r]));
  const part=Object.assign({},b,{_colWidths:colWidths,table:Object.assign({},t,{rows:cells.length,cells:cells.map(r=>r.slice())}),pageBreakBefore:k===0?b.pageBreakBefore:false,keepTogether:true});
  if(k>0)part.title=(b.title||'جدول')+' (تابع)';
  return {html:lectureBlockHTML(lecture,part,i),h:overhead+headH+rows.reduce((a,r)=>a+rowH[r],0)}});
}
// v2.10.0: تقسيم كتلة بين صفحتين — عند حدود الأسطر/الفقرات، أو داخل صندوق الحل («تابع الحل»)
const SPLIT_TYPES=new Set(['text','definition','rule','theorem','proof','example','note','exercise','activity','check','ministerial','homework','summary','objectives']);
const INLINE_TAGS=new Set(['SPAN','B','STRONG','I','EM','U','SUB','SUP','A','FONT','MARK','SMALL','CODE','S']);
function nodeIsBlock(n){if(n.nodeType!==1)return false;if(n.tagName==='BR')return false;if(INLINE_TAGS.has(n.tagName))return false;try{return !String(getComputedStyle(n).display).startsWith('inline')}catch(_){return true}}
function groupNodes(container){const groups=[];let g=null;[...container.childNodes].forEach(n=>{if(n.nodeType===8)return;if(n.nodeType===3&&!n.textContent.trim()){if(g)g.push(n);return}if(nodeIsBlock(n)){g=null;groups.push([n]);return}if(!g){g=[];groups.push(g)}g.push(n);if(n.nodeType===1&&n.tagName==='BR')g=null});return groups}
function groupTop(g){try{const r=document.createRange();r.setStartBefore(g[0]);r.setEndAfter(g[g.length-1]);const rs=[...r.getClientRects()].filter(x=>x.height>0);return rs.length?Math.min(...rs.map(x=>x.top)):r.getBoundingClientRect().top}catch(_){return 0}}
function blockPieces(sec){
 const content=sec&&sec.querySelector(':scope > .lectureBlockContent');if(!content)return null;const pieces=[];
 groupNodes(content).forEach(g=>{const el=g.length===1&&g[0].nodeType===1?g[0]:null;
  if(el&&el.classList.contains('lectureSolution')){const sg=groupNodes(el);if(sg.length>1){sg.forEach((x,k)=>pieces.push({nodes:x,sol:el,solFirst:k===0}));return}}
  pieces.push({nodes:g,sol:null})});
 if(pieces.length<2)return null;
 pieces.forEach(p=>p.top=groupTop(p.nodes));
 const cr=content.getBoundingClientRect(),pb=parseFloat(getComputedStyle(content).paddingBottom)||0,bottom=cr.bottom-pb;
 for(let k=0;k<pieces.length;k++)pieces[k].h=Math.max(1,(k+1<pieces.length?pieces[k+1].top:bottom)-pieces[k].top);
 const overhead=Math.max(0,sec.getBoundingClientRect().height-(bottom-pieces[0].top));
 return {pieces,overhead};
}
function piecePartHTML(sec,info,from,to,isCont,hasMore){
 const s2=sec.cloneNode(true);const c2=s2.querySelector(':scope > .lectureBlockContent');if(!c2)return sec.outerHTML;c2.innerHTML='';
 let box=null,boxOf=null;
 for(let k=from;k<to;k++){const p=info.pieces[k];
  if(p.sol){if(boxOf!==p.sol){box=p.sol.cloneNode(false);boxOf=p.sol;c2.appendChild(box);if(!p.solFirst){box.classList.add('solCont');box.insertAdjacentHTML('afterbegin','<b>تابع الحل:</b> ')}}p.nodes.forEach(n=>box.appendChild(n.cloneNode(true)))}
  else{box=null;boxOf=null;p.nodes.forEach(n=>c2.appendChild(n.cloneNode(true)))}}
 s2.classList.remove('keepTogether');
 if(isCont){s2.classList.add('splitCont');s2.classList.remove('forcePageBreak');const h2=s2.querySelector('.lectureBlockTitle h2');if(h2)h2.textContent=h2.textContent+' (تابع)';s2.querySelectorAll('.smartPrintMeta').forEach(x=>x.remove())}
 if(hasMore)s2.classList.add('splitStart');
 return s2.outerHTML;
}
function splitBlockItem(it,avail){
 if(!it.node)return null;if(!it.info){it.info=blockPieces(it.node);it.from=it.from||0}if(!it.info)return null;
 const P=it.info.pieces,MARK=22,SOLPAD=16;let used=it.info.overhead+(it.cont&&P[it.from].sol&&!P[it.from].solFirst?SOLPAD:0),k=it.from;
 while(k<P.length){const tail=P[k].sol&&k+1<P.length&&P[k+1].sol?SOLPAD:0;if(used+P[k].h+tail+MARK>avail)break;used+=P[k].h;k++}
 if(k===it.from||k>=P.length)return null;
 const first={html:piecePartHTML(it.node,it.info,it.from,k,!!it.cont,true),h:used+MARK};
 const rest={node:it.node,info:it.info,from:k,cont:true,splittable:true,h:it.info.overhead+P.slice(k).reduce((a,p)=>a+p.h,0)+(P[k].sol&&!P[k].solFirst?SOLPAD:0)};
 rest.html=piecePartHTML(it.node,it.info,k,P.length,true,false);
 return {first,rest};
}
async function paginateLectureHTML(l){
 const lecture=(l&&typeof l==='object')?l:{};
 const sourceBlocks=Array.isArray(lecture.blocks)?lecture.blocks:[];
 const blocks=sourceBlocks.map((b,i)=>lectureBlockHTML(lecture,b,i));
 if(!blocks.length)return lectureDocumentHTML(lecture);
 const measure=document.createElement('div');
 measure.className='lecturePaginationMeasure';measure.setAttribute('aria-hidden','true');
 measure.innerHTML='<div class="lecturePaper lecturePagedPaper"'+lectureSizeStyle(lecture)+'>'+lectureHeaderHTML(lecture,false)+'<div class="lectureDocBody">'+blocks.join('')+'</div>'+lectureFooterHTML(lecture,1,1)+'</div><div class="lecturePaper lecturePagedPaper lecMeasureN"'+lectureSizeStyle(lecture)+'>'+lectureHeaderHTML(lecture,true)+'<div class="lectureDocBody"></div>'+lectureFooterHTML(lecture,2,2)+'</div>';
 document.body.appendChild(measure);
 try{
  try{await waitLectureAssets(measure)}catch(err){console.warn('تجاوز خطأ تجهيز أصول المعاينة',err)}
  const paper=measure.querySelector('.lecturePaper'),head=measure.querySelector('.lectureDocHead'),meta=measure.querySelector('.lectureDocMeta'),foot=measure.querySelector('.lectureDocFoot'),body=measure.querySelector('.lectureDocBody');
  if(!paper||!body)return lectureDocumentHTML(lecture);
  const rect=paper.getBoundingClientRect(),cs=getComputedStyle(paper);
  const rawPaperH=Number(rect.height)||0;
  const paperH=rawPaperH-(parseFloat(cs.paddingTop)||0)-(parseFloat(cs.paddingBottom)||0);
  if(!Number.isFinite(paperH)||paperH<300)return lectureDocumentHTML(lecture);
  const h=n=>{try{const v=n?.getBoundingClientRect?.().height;return Number.isFinite(v)?v:0}catch(_){return 0}};
  const footH=h(foot),bodyCS=getComputedStyle(body),gap=parseFloat(bodyCS.rowGap||bodyCS.gap)||10;
  // v2.10.1: ارتفاع منطقة الرأس = من أعلى محتوى الورقة إلى بداية الجسم (يشمل شريط الأستاذ والهوامش)
  const zone=(pp,bd)=>{try{const r=pp.getBoundingClientRect(),c=getComputedStyle(pp);return Math.max(0,bd.getBoundingClientRect().top-r.top-(parseFloat(c.paddingTop)||0))}catch(_){return 0}};
  const capacity=Math.max(300,paperH-zone(paper,body)-footH-10);
  const pN=measure.querySelector('.lecMeasureN'),bN=pN?.querySelector('.lectureDocBody');
  const capN=pN&&bN?Math.max(capacity,Math.min(paperH-60,paperH-zone(pN,bN)-footH-10)):capacity;
  const nodes=[...body.children],heights=sourceBlocks.map((_,i)=>Math.max(1,h(nodes[i])));let used=0;
  // v2.8.12: عناصر الصفحات. الجدول الأطول من صفحة يُقسَّم إلى أجزاء مع تكرار صف العناوين.
  const items=[];let breakNext=false;
  sourceBlocks.forEach((b,i)=>{
   if(b?.type==='pagebreak'){if(b.pageMode==='blank')items.push({html:blocks[i],h:capacity,brk:true,full:true});breakNext=true;return}
   const forceBrk=breakNext;breakNext=false;
   const bh=heights[i]||1;
   if(b?.type==='table'&&bh>capacity){
    const chunks=splitTableForPages(lecture,b,i,nodes[i],bh,capacity,h);
    if(chunks&&chunks.length>1){chunks.forEach((c,k)=>items.push({html:c.html,h:c.h,brk:k===0&&(forceBrk||!!b?.pageBreakBefore)}));return}
   }
   items.push({html:blocks[i],h:bh,brk:forceBrk||!!b?.pageBreakBefore,node:nodes[i],splittable:SPLIT_TYPES.has(b?.type)&&!(b?.design&&b.design.hideTitle)});
  });
  // v2.10.0: توزيع الكتل مع تقسيم الكتل النصية والأمثلة عند حدود الفقرات (أو داخل الحل) بدل نقلها كاملة
  const capFirst=capacity;const htmlPages=[];let curH=[];
  const flush=()=>{if(curH.length)htmlPages.push(curH);curH=[];used=0};
  const queue=items.slice();
  while(queue.length){
   const it=queue.shift();const capacity=htmlPages.length?capN:capFirst;
   if(it.full){flush();htmlPages.push([it.html]);continue}
   if(it.brk&&curH.length)flush();
   const add=it.h+(curH.length?gap:0);
   if(!curH.length&&it.h<=capacity||curH.length&&used+add<=capacity){curH.push(it.html);used+=add;continue}
   const remain=curH.length?capacity-used-gap:capacity;
   const fitsFresh=it.h<=capacity;
   if(it.splittable&&(!curH.length||remain>=Math.max(110,capacity*(fitsFresh?0.22:0.1)))){
    const parts=splitBlockItem(it,remain);
    if(parts){curH.push(parts.first.html);flush();queue.unshift(parts.rest);continue}
   }
   flush();curH.push(it.html);used=it.h;
   if(it.h>capacity){flush()}
  }
  flush();
  const pages=htmlPages.map(p=>p);
  if(!pages.length)return lectureDocumentHTML(lecture);
  // v2.9.3: أُزيلت «الموازنة» التي كانت تنقل كتلًا من الصفحة السابقة فتترك نصفها فارغًا.
  return pages.map((parts,p)=>'<div class="lecturePaper lecturePagedPaper"'+lectureSizeStyle(lecture)+' data-page="'+(p+1)+'">'+watermarkHTML(lecture)+lectureHeaderHTML(lecture,p>0)+'<div class="lectureDocBody">'+parts.join('')+'</div>'+lectureFooterHTML(lecture,p+1,pages.length)+'</div>').join('');
 }catch(err){
  console.error('فشل التقسيم الذكي، تم الرجوع إلى التخطيط الآمن.',err);
  return lectureDocumentHTML(lecture);
 }finally{measure.remove()}
}
// v2.9.5: نافذة «PDF جاهز» — المشاركة تتم بلمسة مباشرة حتى يقبلها سفاري
function showPdfReady(res,forPrint){
  const modal=document.getElementById('modal');if(!modal)return;
  const url=URL.createObjectURL(res.blob);
  const size=typeof window.fmtBytes==='function'?window.fmtBytes(res.blob.size):Math.round(res.blob.size/1024)+' KB';
  const canShare=!!(navigator.share&&navigator.canShare&&navigator.canShare({files:[res.file]}));
  const I=n=>(window.ICON?ICON(n):'');
  modal.innerHTML='<div class="overlay"><div class="sheet pdfSheet"><div class="sheetHead"><h3>'+(forPrint?'جاهز للطباعة':'ملف PDF جاهز')+'</h3><button class="x" id="pdfX">✕</button></div><div class="form"><div class="pdfReady"><span class="pdfIc">'+I('exam')+'</span><div><b>'+safe(res.file.name)+'</b><small>'+res.pages+' '+(res.pages===1?'صفحة':(res.pages===2?'صفحتان':'صفحات'))+' · '+safe(size)+'</small></div></div><p class="pdfHint">'+(forPrint&&canShare?'اضغط <b>«طباعة»</b> ثم اختر <b>«طباعة»</b> من القائمة التي تظهر، واختر الطابعة وعدد النسخ.':'')+(forPrint&&canShare?'':(canShare?'«مشاركة» تتيح لك: حفظ في الملفات، أو الإرسال عبر واتساب وتليغرام، أو الطباعة.':'«تنزيل» يحفظ الملف في مجلد التنزيلات.')+' الملف بصفحات A4 مطابقة للمعاينة، بلا رابط الصفحة أو التاريخ.')+'</p></div><div class="sheetFoot"><button class="btn ghost" id="pdfOpen">'+I('expand')+'<span>فتح</span></button>'+(canShare?'<button class="btn" id="pdfShare">'+I(forPrint?'exam':'clipboard')+'<span>'+(forPrint?'طباعة':'مشاركة / حفظ')+'</span></button>':'<button class="btn" id="pdfDl">'+I('clipboard')+'<span>تنزيل</span></button>')+'</div></div></div>';
  const close=()=>{modal.innerHTML='';setTimeout(()=>URL.revokeObjectURL(url),60000)};
  document.getElementById('pdfX').onclick=close;
  document.getElementById('pdfOpen').onclick=()=>{const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';document.body.appendChild(a);a.click();a.remove()};
  const sh=document.getElementById('pdfShare');if(sh)sh.onclick=()=>{navigator.share({files:[res.file]}).then(close).catch(err=>{if(err&&err.name==='AbortError')return;console.warn('share pdf',err);const a=document.createElement('a');a.href=url;a.download=res.file.name;document.body.appendChild(a);a.click();a.remove()})};
  const dl=document.getElementById('pdfDl');if(dl)dl.onclick=()=>{const a=document.createElement('a');a.href=url;a.download=res.file.name;document.body.appendChild(a);a.click();a.remove();close()};
}
// v2.9.7: المعاينة بعرض A4 الحقيقي دائمًا (كالقياس وPDF) وتُصغَّر بصريًا على الشاشات الضيقة
function fitPreviewPapers(area){if(!area)return;const w=area.clientWidth-16;const z=Math.min(1,Math.max(0.3,w/794));area.querySelectorAll('.lecturePaper').forEach(p=>{p.style.zoom=z<0.999?String(z):''})}
if(!window.__niborPreviewFit){window.__niborPreviewFit=true;let rt;window.addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>fitPreviewPapers(document.getElementById('lecturePreviewArea')),120)})}
async function renderLecturePreview(){
  // المعاينة تظهر فورًا أولًا، ثم يُطبّق التقسيم الذكي في الخلفية.
  // بهذه الطريقة لا تبقى الشاشة فارغة إذا أخفق القياس على Safari/iPad.
  try{ syncMeta(); }catch(err){ console.warn('تعذر مزامنة بيانات المحاضرة قبل المعاينة.',err); }

  const lecture=normalizeLecture(clone(editorLecture||{}));
  setContent('<section class="previewShell"><div class="previewToolbar"><button class="eduGhost" id="backEditor">‹ رجوع للتحرير</button><div><b>معاينة A4</b><span id="lecturePreviewStatus">تم فتح المعاينة الآمنة — جارِ تحسين توزيع الصفحات…</span></div><div class="previewActs"><button class="eduSecondary" id="printLecture">طباعة</button><button class="eduPrimary" id="pdfLecture">'+(window.ICON?ICON('exam'):'')+'<span>حفظ PDF</span></button></div></div><div id="lecturePreviewArea"></div></section>');

  const back=document.getElementById('backEditor');
  if(back)back.onclick=renderLectureEditor;
  const area=document.getElementById('lecturePreviewArea');
  const status=document.getElementById('lecturePreviewStatus');
  const btn=document.getElementById('printLecture');
  if(!area)return;

  // عرض متزامن فوري لا يعتمد على القياس أو الخطوط أو الصور.
  try{
    area.innerHTML=lectureDocumentHTML(lecture);
    renderKatex(area);fitPreviewPapers(area);
  }catch(err){
    console.error('تعذر بناء المعاينة الأساسية',err);
    area.innerHTML='<div class="previewErrorCard"><b>تعذر عرض بعض محتوى المحاضرة.</b><p>المحتوى محفوظ. ارجع إلى التحرير وراجع آخر عنصر أُضيف.</p></div>';
    if(status)status.textContent='تعذر عرض محتوى المحاضرة.';
  }

  // تحسين التخطيط اختياري؛ لا يمنع المعاينة الأساسية.
  (async()=>{
    try{
      const paged=await paginateLectureHTML(lecture);
      if(paged&&document.getElementById('lecturePreviewArea')===area){
        area.innerHTML=paged;fitPreviewPapers(area);
        await waitLectureAssets(area);
        const count=Math.max(1,area.querySelectorAll('.lecturePaper').length);
        if(status)status.textContent='تم إنشاء المعاينة — '+count+' صفحة';
      }
    }catch(err){
      console.warn('تعذر التقسيم الذكي؛ بقيت المعاينة الآمنة ظاهرة.',err);
      try{ await waitLectureAssets(area); }catch(_){}
      if(status)status.textContent='المعاينة جاهزة — تم استخدام التخطيط الآمن';
    }
  })();

  const pdfBtn=document.getElementById('pdfLecture');
  const isAppleApp=(()=>{try{const ua=navigator.userAgent||'';const apple=/iPad|iPhone|iPod/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1);return apple&&(navigator.standalone===true||matchMedia('(display-mode: standalone)').matches)}catch(_){return false}})();
  let pdfForPrint=false;
  if(pdfBtn)pdfBtn.onclick=async()=>{
    if(pdfBtn.disabled)return;const forPrint=pdfForPrint;pdfForPrint=false;const label=pdfBtn.querySelector('span');pdfBtn.disabled=true;
    const say=t=>{if(label)label.textContent=t;if(status)status.textContent=t};
    try{
      if(!window.NiborPDF)throw new Error('PDF_MODULE_MISSING');
      const res=await window.NiborPDF.exportLecture(lecture,{paginate:paginateLectureHTML,waitAssets:waitLectureAssets,onProgress:say});
      if(status)status.textContent='ملف PDF جاهز — '+res.pages+' صفحة';
      showPdfReady(res,forPrint);
    }catch(err){
      console.error('تعذر إنشاء PDF',err);
      const offline=/LIB_LOAD_FAILED|LIBS_MISSING/.test(String(err&&err.message));
      if(status)status.textContent=offline?'تعذر تحميل أدوات PDF — افتح التطبيق مرة مع الإنترنت ثم أعد المحاولة، أو استخدم «طباعة».':'تعذر إنشاء PDF — استخدم «طباعة» مؤقتًا.';
    }finally{pdfBtn.disabled=false;if(label)label.textContent='حفظ PDF'}
  };

  // v2.9.6: الطباعة تُستدعى مباشرة داخل لمسة الزر (دون انتظار) — سفاري على iPad يتجاهل window.print() بعد عمليات غير متزامنة.
  // إذا لم تُفتح نافذة الطباعة (مثل التطبيق المثبّت على الشاشة الرئيسية) نعرض بديل «PDF ثم طباعة» من قائمة المشاركة.
  if(btn)btn.onclick=()=>{
    // v2.9.8: التطبيق المثبّت على iPad/iPhone لا يفتح نافذة الطباعة إطلاقًا — نذهب مباشرة إلى «PDF للطباعة»
    if(isAppleApp&&pdfBtn&&window.NiborPDF){pdfForPrint=true;pdfBtn.click();return}
    const print=document.getElementById('printArea');
    try{
      if(!print)throw new Error('PRINT_AREA_MISSING');
      let printHTML='';
      try{ printHTML=lectureFlowHTML(lecture); }
      catch(err){ console.warn('استخدام تخطيط الطباعة الآمن.',err); printHTML=lectureDocumentHTML(lecture); }
      print.innerHTML=printHTML||lectureDocumentHTML(lecture);
      try{renderKatex(print)}catch(err){console.warn('katex print',err)}
      document.body.classList.add('printingLecture','printFlow');
      // هوامش صفحة المحاضرة تُحقن وقت الطباعة فقط (قاعدة @page العامة بهوامش صفر مخصصة للامتحانات بعرض كامل)
      let ps=document.getElementById('lecturePageStyle');if(!ps){ps=document.createElement('style');ps.id='lecturePageStyle';document.head.appendChild(ps)}ps.textContent='@page{size:A4 portrait;margin:14mm 13mm 15mm!important}';
      let opened=false;const mark=()=>{opened=true};window.addEventListener('beforeprint',mark,{once:true});
      const t0=Date.now();
      window.print();
      // في المتصفحات التي توقف التنفيذ أثناء نافذة الطباعة، مرور وقت طويل يعني أنها فُتحت
      if(Date.now()-t0>800)opened=true;
      setTimeout(()=>{window.removeEventListener('beforeprint',mark);if(opened)return;
        document.body.classList.remove('printingLecture','printFlow');document.getElementById('lecturePageStyle')?.remove();print.innerHTML='';
        showPrintFallback();
      },1600);
    }catch(err){
      console.error('تعذر تحضير الطباعة',err);
      if(status)status.textContent='تعذر تحضير الطباعة؛ جرّب «حفظ PDF» ثم اختر «طباعة» من قائمة المشاركة.';
    }
  };
  function showPrintFallback(){
    const modal=document.getElementById('modal');if(!modal||modal.innerHTML.trim())return;
    const I=n=>(window.ICON?ICON(n):'');
    modal.innerHTML='<div class="overlay"><div class="sheet pdfSheet"><div class="sheetHead"><h3>لم تُفتح نافذة الطباعة</h3><button class="x" id="pfX">✕</button></div><div class="form"><p class="pdfHint">بعض أوضاع iPad (مثل التطبيق المثبّت على الشاشة الرئيسية) لا تسمح بفتح الطباعة من الصفحة. الحل: أنشئ ملف PDF، ثم من قائمة المشاركة اختر <b>«طباعة»</b>، أو احفظه وأرسله.</p></div><div class="sheetFoot"><button class="btn ghost" id="pfCancel">إغلاق</button><button class="btn" id="pfPdf">'+I('exam')+'<span>إنشاء PDF للطباعة</span></button></div></div></div>';
    const close=()=>{modal.innerHTML=''};
    document.getElementById('pfX').onclick=document.getElementById('pfCancel').onclick=close;
    document.getElementById('pfPdf').onclick=()=>{close();setTimeout(()=>{if(pdfBtn){pdfForPrint=true;pdfBtn.click()}},60)};
  }

}


// v2.8.13: كل الأكواد بشرطات مزدوجة صحيحة؛ ¦ يحدد موضع المؤشر بعد الإدراج.
const EQ_GROUPS={
  "أساسيات":[
    ["كسر","\\frac{}{}",6],["جذر","\\sqrt{}",6],["جذر نوني","\\sqrt[]{}",6],["أس","^{}",2],["أس سفلي","_{}",2],["قيمة مطلقة","\\left|  \\right|",7],["قوسان","\\left(  \\right)",7],["±","\\pm",3],["≠","\\ne",3],["≤","\\le",3],["≥","\\ge",3],["×","\\times",6],["÷","\\div",4],["·","\\cdot",5]
  ],
  "تفاضل وتكامل":[
    ["تكامل","\\int  \\, dx",5],["تكامل محدد","\\int_{}^{} \\, dx",6],["مشتقة","\\frac{d}{dx}\\left(  \\right)",19],["مشتقة ثانية","\\frac{d^2}{dx^2}\\left(  \\right)",23],["نهاية","\\lim_{x \\to }",12],["مجموع","\\sum_{}^{}",6],["حاصل ضرب","\\prod_{}^{}",7],["لانهاية","\\infty",6]
  ],
  "جبر وأعداد مركبة":[
    ["مرافق","\\overline{}",10],["الجزء الحقيقي","\\operatorname{Re}()",18],["الجزء التخيلي","\\operatorname{Im}()",18],["زاوية θ","\\theta",6],["ألفا α","\\alpha",6],["بيتا β","\\beta",5],["باي π","\\pi",3],["ينتمي","\\in",3],["الأعداد الحقيقية","\\mathbb{R}",10],["الأعداد المركبة","\\mathbb{C}",10]
  ],
  "مصفوفات":[
    ["مصفوفة 2×2","\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}",16],["مصفوفة 3×3","\\begin{pmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{pmatrix}",16],["محدد 2×2","\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}",16],["نظام معادلات","\\begin{cases} x+y=0 \\\\ x-y=0 \\end{cases}",14]
  ]
};
let equationTarget=null;
function ensureEquationModal(){
  if(document.getElementById("equationEditorModal"))return;
  const wrap=document.createElement("div");
  wrap.id="equationEditorModal";wrap.className="eqModal";wrap.setAttribute("aria-hidden","true");
  wrap.innerHTML='<div class="eqDialog" role="dialog" aria-modal="true" aria-labelledby="eqDialogTitle"><div class="eqHeader"><div><b id="eqDialogTitle">∑ محرر المعادلات</b><span>اختر رمزًا ليُدرج ويقف المؤشر داخله، ثم اكتب القيم — أو اكتب كود LaTeX مباشرة</span></div><button type="button" id="eqClose" aria-label="إغلاق">×</button></div><div class="eqTabs" id="eqTabs"></div><div class="eqSymbols" id="eqSymbols"></div><div class="eqModeBar"><label><input type="checkbox" id="eqDisplayMode"> عرض كسطر مستقل</label><button type="button" class="eduGhost" id="eqHistoryToggle">سجل المعادلات</button></div><div id="eqHistory" class="eqHistory" hidden></div><label class="eqInputLabel">محتوى المعادلة<textarea id="eqLatexInput" dir="ltr" rows="3" spellcheck="false" placeholder="اكتب المعادلة أو استخدم الأزرار أعلاه"></textarea></label><div class="eqPreview"><span>معاينة مباشرة</span><small id="eqValidation" class="eqValidation"></small><div id="eqLiveDiagnostics" class="mathLiveDiagnostics" hidden></div><div id="eqPreviewBox">ابدأ بكتابة المعادلة</div></div><div class="eqActions"><button type="button" class="eduGhost" id="eqClear">مسح</button><div><button type="button" class="eduSecondary" id="eqCancel">إلغاء</button><button type="button" class="eduPrimary" id="eqInsert">حفظ المعادلة</button></div></div></div>';
  document.body.appendChild(wrap);
  document.getElementById("eqClose").onclick=closeEquationEditor;document.getElementById("eqCancel").onclick=closeEquationEditor;
  wrap.onclick=e=>{if(e.target===wrap)closeEquationEditor()};
  document.getElementById("eqClear").onclick=()=>{const x=document.getElementById("eqLatexInput");x.value="";x.focus();updateEquationPreview()};
  document.getElementById("eqLatexInput").oninput=updateEquationPreview;
  document.getElementById("eqLiveDiagnostics").addEventListener("masar:math-quick-fix",e=>{const x=document.getElementById("eqLatexInput");x.value=e.detail.value;updateEquationPreview();x.focus()});
  document.getElementById("eqInsert").onclick=insertEquationIntoBlock;document.getElementById("eqHistoryToggle").onclick=toggleEquationHistory;
  const tabs=document.getElementById("eqTabs");Object.keys(EQ_GROUPS).forEach((name,i)=>{const b=document.createElement("button");b.type="button";b.textContent=name;b.dataset.group=name;b.className=i===0?"active":"";b.onpointerdown=e=>e.preventDefault();b.onclick=()=>renderEquationGroup(name);tabs.appendChild(b)});
  renderEquationGroup(Object.keys(EQ_GROUPS)[0]);
}
function renderEquationGroup(name){
  document.querySelectorAll("#eqTabs button").forEach(b=>b.classList.toggle("active",b.dataset.group===name));
  const box=document.getElementById("eqSymbols");box.innerHTML="";
  EQ_GROUPS[name].forEach(([label,code,cursor])=>{const b=document.createElement("button");b.type="button";b.title=label;const shown=code.replace(/\{\}/g,'{\\square}').replace(/\(\)/g,'(\\square)').replace(/\\left([|(])\s+\\right/g,'\\left$1 \\square \\right');b.innerHTML='<span class="eqSymbolMath" dir="ltr" data-latex="'+safe(shown)+'">'+safe(shown)+'</span><small'+(/[\u0600-\u06FF]/.test(label)?'':' dir="ltr"')+'>'+safe(label)+'</small>';b.onpointerdown=e=>e.preventDefault();b.onclick=()=>insertEquationSnippet(code,cursor);box.appendChild(b)});
  renderKatex(box);
}
function insertEquationSnippet(code,cursor){const x=document.getElementById("eqLatexInput"),start=x.selectionStart||0,end=x.selectionEnd||0;x.setRangeText(code,start,end,"end");const pos=start+Math.min(cursor==null?code.length:cursor,code.length);x.setSelectionRange(pos,pos);if(!isCoarsePointer()||document.activeElement===x)x.focus();updateEquationPreview()}
const EQ_HISTORY_KEY="masar-equation-history-v1";
function loadEquationHistory(){try{return JSON.parse(localStorage.getItem(EQ_HISTORY_KEY)||"[]")}catch(_){return []}}
function rememberEquation(code){const latex=String(code||"").trim();if(!latex)return;const list=loadEquationHistory().filter(x=>x!==latex);list.unshift(latex);localStorage.setItem(EQ_HISTORY_KEY,JSON.stringify(list.slice(0,100)))}
function toggleEquationHistory(){const box=document.getElementById("eqHistory");box.hidden=!box.hidden;if(box.hidden)return;const list=loadEquationHistory();box.innerHTML=list.length?list.map(x=>'<button type="button" data-eq-history="'+safe(x)+'"><span class="eqHistoryMath" data-latex="'+safe(x)+'">'+safe(x)+'</span></button>').join(''):'<p>لا توجد معادلات محفوظة بعد.</p>';box.querySelectorAll('[data-eq-history]').forEach(b=>b.onclick=()=>{const x=document.getElementById("eqLatexInput");x.value=b.dataset.eqHistory;updateEquationPreview();x.focus()});renderKatex(box)}
function openEquationEditor(index,field,richEditor,existingNode){ensureEquationModal();equationTarget={index,field,richEditor,existingNode:existingNode||null};const m=document.getElementById("equationEditorModal"),x=document.getElementById("eqLatexInput"),display=document.getElementById("eqDisplayMode");x.value=existingNode?(existingNode.dataset.latex||""):"";display.checked=!!existingNode&&(existingNode.dataset.display==="true"||existingNode.classList.contains("richEquationDisplay"));document.getElementById("eqDialogTitle").textContent=existingNode?"∑ تعديل المعادلة":"∑ محرر المعادلات";m.classList.add("open");m.setAttribute("aria-hidden","false");document.body.classList.add("eqModalOpen");updateEquationPreview();fitEqModal();bindEqViewport(true);if(!isCoarsePointer())setTimeout(()=>x.focus(),30)}
// v2.9.2: نافذة المعادلات تتبع المساحة المرئية فوق لوحة مفاتيح الآيباد
function isCoarsePointer(){try{return matchMedia("(pointer: coarse)").matches}catch(_){return false}}
function fitEqModal(){const m=document.getElementById("equationEditorModal");if(!m||!m.classList.contains("open"))return;const vv=window.visualViewport;const h=vv?vv.height:window.innerHeight,top=vv?vv.offsetTop:0;m.style.top=top+"px";m.style.height=h+"px";m.style.bottom="auto";m.classList.toggle("kbOpen",h<560||(!!vv&&h<window.innerHeight*0.78))}
let eqVVHandler=null;function bindEqViewport(on){const vv=window.visualViewport;if(!vv)return;if(eqVVHandler){vv.removeEventListener("resize",eqVVHandler);vv.removeEventListener("scroll",eqVVHandler);eqVVHandler=null}if(on){eqVVHandler=()=>fitEqModal();vv.addEventListener("resize",eqVVHandler);vv.addEventListener("scroll",eqVVHandler)}}
function closeEquationEditor(){bindEqViewport(false);const m=document.getElementById("equationEditorModal");if(m){m.classList.remove("open","kbOpen");m.setAttribute("aria-hidden","true");m.style.top="";m.style.height="";m.style.bottom=""}document.body.classList.remove("eqModalOpen");equationTarget=null}
// v2.8.13: رسائل KaTeX بالعربية (الأخطاء الشائعة) مع إبقاء النص الأصلي للتفاصيل.
function arabicLatexError(raw){const m=String(raw||'').replace(/^KaTeX parse error:\s*/i,'');let r;
 if(/Expected '\\right'/.test(m))return "‏\\left بدون \\right المقابل — أغلق القوس بـ \\right";
 if(/Expected & or \\\\ or \\cr or \\end|Missing \\end|Expected '\\end'|Mismatch: \\begin/.test(m))return "‏\\begin بدون \\end المقابل";
 if((r=m.match(/Undefined control sequence:\s*(\\[A-Za-z]+)/)))return "أمر غير معروف: "+r[1];
 if(/Double superscript/.test(m))return "أسّان متتاليان — ضع الأس كاملًا داخل { }";
 if(/Double subscript/.test(m))return "دليلان سفليان متتاليان — ضعهما داخل { }";
 if(/Extra \}|Expected 'EOF', got '\}'/.test(m))return "قوس } زائد";
 if(/Unexpected end of input|Expected '\}'|Expected group/.test(m))return "قوس { غير مغلق أو قيمة ناقصة — أكمل المعادلة";
 if((r=m.match(/Unexpected character: '(.)'/)))return "رمز غير مدعوم: "+r[1];
 if(/Expected 'EOF'/.test(m))return "رمز في غير موضعه";
 if(/Limit controls must follow a math operator/.test(m))return "\\limits يجب أن يأتي بعد رمز مثل \\sum أو \\int";
 return "صيغة غير صحيحة"}
function validateLatex(code){if(!code)return {ok:false,message:"اكتب المعادلة أولًا"};if(!window.katex)return {ok:true,message:""};try{window.katex.renderToString(code,{throwOnError:true,strict:"ignore"});return {ok:true,message:"الصيغة صحيحة ✓"}}catch(err){const raw=(err&&err.message?err.message:"").replace(/^KaTeX parse error:\s*/i,"");return {ok:false,message:arabicLatexError(raw),detail:raw}}}
// v2.8.13: تحقق موحّد — KaTeX هو المرجع للصياغة، والتشخيص الرياضي يعمل فقط للتعابير البسيطة الصحيحة صياغيًا.
function unifiedMathCheck(code){const k=validateLatex(code);const live=window.Masar?.resolve?.("math.liveDiagnostics");let math=null;
 if(k.ok&&live&&code&&!code.includes('\\')){try{math=live.validate(code,{semantic:true,domainWarnings:true})}catch(_){math=null}}
 return {katex:k,math,live}}
function renderUnifiedDiagnostics(box,code,check){if(!box)return;if(!code){box.hidden=true;box.innerHTML='';return}
 if(!check.katex.ok){box.hidden=false;box.innerHTML='<div class="mathDiagnosticHeader"><b>خطأ في الصياغة</b><span>'+safe(check.katex.message)+'</span></div>'+(check.katex.detail?'<details class="mathDiagnosticRaw"><summary>التفاصيل التقنية</summary><code dir="ltr">'+safe(check.katex.detail)+'</code></details>':'');return}
 if(check.math&&check.live){check.live.render(box,code,check.math,{showSource:true,quickFix:true});return}
 box.hidden=false;box.innerHTML='<div class="mathDiagnosticOk">✓ الصيغة صحيحة</div>'}
function updateEquationPreview(){
 const x=document.getElementById("eqLatexInput"),box=document.getElementById("eqPreviewBox"),status=document.getElementById("eqValidation"),diagBox=document.getElementById("eqLiveDiagnostics");
 if(!x||!box)return;
 const code=x.value.trim(),check=unifiedMathCheck(code),katexCheck=check.katex,mathResult=check.math;
 const mathInvalid=!!(mathResult&&mathResult.hasErrors);
 if(status){status.textContent=!katexCheck.ok?katexCheck.message:(mathInvalid?"توجد ملاحظة رياضية":katexCheck.message);status.classList.toggle("invalid",!katexCheck.ok||mathInvalid)}
 renderUnifiedDiagnostics(diagBox,code,check);
 if(!code){box.textContent="ابدأ بكتابة المعادلة";box.classList.add("empty");return}
 box.classList.remove("empty");
 // v2.9.2: المعاينة تُظهر الخانات الفارغة □ (لا تُحفظ)
 const shown=code.replace(/\{\s*\}/g,"{\\square}");
 if(window.katex){try{window.katex.render(shown,box,{throwOnError:false,displayMode:true,strict:"ignore"})}catch(_){box.textContent=code}}else box.textContent=code
}
function insertEquationIntoBlock(){if(!equationTarget)return;const code=document.getElementById("eqLatexInput").value.trim(),check=validateLatex(code);if(!check.ok){alert("تعذر حفظ المعادلة: "+check.message);return}rememberEquation(code);if(equationTarget.mathBlockIndex!=null){const i=equationTarget.mathBlockIndex,b=editorLecture.blocks[i];b.latex=code;b.content=code;b.equation=b.equation||{id:'eq_'+uid()};b.equation.latex=code;b.equation.updatedAt=new Date().toISOString();closeEquationEditor();renderLectureEditor();scheduleDraft();return}const {index,field,richEditor,existingNode}=equationTarget,display=document.getElementById("eqDisplayMode").checked;if(richEditor){if(existingNode){existingNode.dataset.latex=code;existingNode.dataset.display=display?"true":"false";existingNode.classList.toggle("richEquationDisplay",display);existingNode.textContent=code;existingNode.dataset.rendered="false";syncRichEditor(richEditor);renderKatex(richEditor)}else{insertHTMLAtRich(richEditor,'<span class="richEquation'+(display?' richEquationDisplay':'')+'" contenteditable="false" tabindex="0" title="انقر مرتين لتعديل المعادلة" data-equation-id="eq_'+uid()+'" data-display="'+(display?'true':'false')+'" data-latex="'+safe(code)+'">'+safe(code)+'</span>&nbsp;');renderKatex(richEditor)}closeEquationEditor();return}const area=document.querySelector('.blockEditor[data-index="'+index+'"] [data-field="'+field+'"]');if(!area)return;const start=area.selectionStart??area.value.length,end=area.selectionEnd??start,mark=display?"$$":"$";area.setRangeText(mark+code+mark,start,end,"end");editorLecture.blocks[index][field]=area.value;scheduleDraft();closeEquationEditor()}

window.addEventListener("afterprint",()=>{document.body.classList.remove("printingLecture","printFlow");document.getElementById("lecturePageStyle")?.remove();const p=document.getElementById("printArea");if(p)p.innerHTML=""});
})();
