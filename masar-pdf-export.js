/* =========================================================
   نيبور كلاس v2.9.5 — تصدير المحاضرة إلى PDF داخل التطبيق
   - صفحات A4 مطابقة للمعاينة، بلا رابط الصفحة والتاريخ اللذين يضيفهما سفاري.
   - المكتبات (html2canvas + jsPDF، رخصة MIT) تُحمَّل عند أول تصدير فقط.
   - الصفحة التي يفيض محتواها تُقسَّم عند سطر فارغ بدل قص النص.
   ========================================================= */
(function(global){
"use strict";
const LIBS=[["html2canvas","html2canvas.min.js"],["jspdf","jspdf.umd.min.js"]];
const A4W=210,A4H=297;
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement("script");s.src=src;s.async=true;s.onload=res;s.onerror=()=>rej(new Error("LIB_LOAD_FAILED:"+src));document.head.appendChild(s)})}
async function ensureLibs(){for(const [g,src] of LIBS){if(!global[g])await loadScript(src)}if(!global.html2canvas||!global.jspdf||!global.jspdf.jsPDF)throw new Error("LIBS_MISSING")}
const nextFrame=()=>new Promise(r=>requestAnimationFrame(()=>setTimeout(r,0)));
function safeName(t){return (String(t||"محاضرة").replace(/[\\/:*?"<>|\u0000-\u001f]+/g," ").replace(/\s+/g," ").trim().slice(0,80)||"محاضرة")}
// أفضل موضع للقطع: أقرب سطر خالٍ من النص فوق الموضع المثالي (حتى 22% من الصفحة)
function findCut(ctx,w,ideal,minY){
  const lo=Math.max(minY+1,Math.floor(ideal-(ideal-minY)*0.22));
  for(let y=Math.floor(ideal);y>=lo;y-=2){const d=ctx.getImageData(0,y,w,1).data;let dark=0;for(let i=0;i<d.length;i+=4){if(d[i]*0.3+d[i+1]*0.59+d[i+2]*0.11<150&&++dark>6)break}if(dark<=6)return y}
  return Math.floor(ideal);
}
async function renderPaper(paper,scale){
  return global.html2canvas(paper,{scale,backgroundColor:"#ffffff",useCORS:true,logging:false,imageTimeout:4000,windowWidth:Math.max(document.documentElement.clientWidth,900)});
}
async function exportLecture(lecture,opts){
  opts=opts||{};const onProgress=opts.onProgress||function(){};
  const paginate=opts.paginate,waitAssets=opts.waitAssets||(async()=>{});
  if(typeof paginate!=="function")throw new Error("PAGINATOR_MISSING");
  onProgress("تحميل أدوات PDF…");await ensureLibs();
  document.body.classList.add("pdfExporting");
  const stage=document.createElement("div");stage.className="pdfStage";stage.setAttribute("aria-hidden","true");
  try{
    onProgress("ترتيب الصفحات…");
    const html=await paginate(lecture);
    stage.innerHTML=html;document.body.appendChild(stage);
    await waitAssets(stage);await nextFrame();
    const papers=[...stage.querySelectorAll(".lecturePaper")];if(!papers.length)throw new Error("NO_PAGES");
    const {jsPDF}=global.jspdf;const pdf=new jsPDF({orientation:"portrait",unit:"mm",format:"a4",compress:true});
    pdf.setProperties({title:lecture.title||"محاضرة",author:lecture.teacher||"",creator:"نيبور كلاس"});
    let first=true;const addImg=(c,y,h)=>{if(!first)pdf.addPage();first=false;pdf.addImage(c.toDataURL("image/jpeg",0.9),"JPEG",0,y,A4W,h,undefined,"FAST")};
    for(let i=0;i<papers.length;i++){
      onProgress("إنشاء الصفحة "+(i+1)+" من "+papers.length+"…");await nextFrame();
      const p=papers[i],body=p.querySelector(".lectureDocBody");
      const tall=!p.classList.contains("lecturePagedPaper")||(body&&body.scrollHeight>body.clientHeight+2);
      if(tall)p.classList.add("pdfTall");
      const r=p.getBoundingClientRect();const scale=Math.max(1.2,Math.min(2,Math.sqrt(14e6/Math.max(1,r.width*r.height))));
      const canvas=await renderPaper(p,scale);
      const pageH=canvas.width*A4H/A4W;
      if(canvas.height<=pageH*1.01){addImg(canvas,0,A4H*Math.min(1,canvas.height/pageH));continue}
      // صفحة أطول من A4: تقسيم عند سطر فارغ، مع هامش علوي وسفلي للأجزاء التالية
      const ctx=canvas.getContext("2d",{willReadFrequently:true});const margin=Math.round(canvas.width*12/A4W);
      let y=0,part=0;
      while(y<canvas.height-4){
        const room=part===0?pageH-margin:pageH-2*margin;const ideal=y+room;
        const cut=ideal>=canvas.height?canvas.height:findCut(ctx,canvas.width,ideal,y+room*0.5);
        const h=cut-y,slice=document.createElement("canvas");slice.width=canvas.width;slice.height=Math.round(pageH);
        const sx=slice.getContext("2d");sx.fillStyle="#fff";sx.fillRect(0,0,slice.width,slice.height);sx.drawImage(canvas,0,y,canvas.width,h,0,part===0?0:margin,canvas.width,h);
        addImg(slice,0,A4H);y=cut;part++;
      }
    }
    onProgress("تجهيز الملف…");
    const blob=pdf.output("blob");
    return {blob,file:new File([blob],safeName(lecture.title)+".pdf",{type:"application/pdf"}),pages:pdf.getNumberOfPages()};
  }finally{stage.remove();document.body.classList.remove("pdfExporting")}
}
global.NiborPDF={exportLecture,ensureLibs,safeName};
})(window);
