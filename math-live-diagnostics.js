(function(global){
  "use strict";
  const Masar=global.Masar;
  if(!Masar)throw new Error("Masar namespace must load before math.liveDiagnostics");
  const validator=Masar.resolve("math.validator");
  if(!validator)throw new Error("math.validator must load before math.liveDiagnostics");

  function escapeHtml(value){
    return String(value==null?"":value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  }

  function debounce(fn,wait){
    let timer=null;
    return function(){
      const args=arguments,ctx=this;
      clearTimeout(timer);
      timer=setTimeout(()=>fn.apply(ctx,args),wait||220);
    };
  }

  function primary(result){
    if(!result||!Array.isArray(result.diagnostics))return null;
    return result.diagnostics.find(d=>d.severity==="error")||result.diagnostics[0]||null;
  }

  function highlightSource(source,diagnostic){
    const text=String(source||"");
    if(!diagnostic||!Number.isInteger(diagnostic.start))return escapeHtml(text);
    const start=Math.max(0,Math.min(text.length,diagnostic.start));
    const rawEnd=Number.isInteger(diagnostic.end)?diagnostic.end:start+1;
    const end=Math.max(start+1,Math.min(text.length,rawEnd));
    return escapeHtml(text.slice(0,start))+
      '<mark class="mathDiagnosticMark" data-code="'+escapeHtml(diagnostic.code)+'">'+
      escapeHtml(text.slice(start,end)||" ")+'</mark>'+escapeHtml(text.slice(end));
  }

  function applyReplacement(source,diagnostic){
    const text=String(source||"");
    if(!diagnostic)return text;
    const replacement=diagnostic.metadata&&typeof diagnostic.metadata.replacement==="string"
      ?diagnostic.metadata.replacement:null;
    if(replacement==null)return text;
    const start=Number.isInteger(diagnostic.start)?diagnostic.start:text.length;
    const end=Number.isInteger(diagnostic.end)?diagnostic.end:start;
    return text.slice(0,start)+replacement+text.slice(Math.max(start,end));
  }

  function render(container,source,result,options){
    if(!container)return;
    const opts=Object.assign({showSource:true,quickFix:true},options||{});
    const diagnostic=primary(result);
    container.innerHTML="";
    container.classList.toggle("hasErrors",!!(result&&result.hasErrors));
    container.classList.toggle("hasWarnings",!!(!result?.hasErrors&&result?.warnings?.length));
    if(!source){container.hidden=true;return}
    container.hidden=false;
    if(!diagnostic){
      container.innerHTML='<div class="mathDiagnosticOk">✓ التعبير صالح رياضيًا</div>';
      return;
    }
    const severity=diagnostic.severity||"error";
    const title=severity==="warning"?"تحذير":"خطأ";
    const sourceHtml=opts.showSource?'<pre class="mathDiagnosticSource" dir="ltr">'+highlightSource(source,diagnostic)+'</pre>':"";
    const fixable=opts.quickFix&&diagnostic.suggestion&&diagnostic.metadata&&typeof diagnostic.metadata.replacement==="string";
    container.innerHTML='<div class="mathDiagnosticHeader"><b>'+title+' · '+escapeHtml(diagnostic.code)+'</b><span>'+escapeHtml(diagnostic.message)+'</span></div>'+sourceHtml+
      (diagnostic.suggestion?'<div class="mathDiagnosticSuggestion">اقتراح: '+escapeHtml(diagnostic.suggestion)+'</div>':"")+
      (fixable?'<button type="button" class="mathQuickFix">تطبيق الإصلاح</button>':"");
    const btn=container.querySelector(".mathQuickFix");
    if(btn)btn.onclick=()=>{
      const next=applyReplacement(source,diagnostic);
      container.dispatchEvent(new CustomEvent("masar:math-quick-fix",{bubbles:true,detail:{value:next,diagnostic}}));
    };
  }

  function validate(source,options){return validator.validate(source,options)}

  Masar.register("math.liveDiagnostics",Object.freeze({
    version:"1.0.0",
    debounce,
    validate,
    primary,
    highlightSource,
    applyReplacement,
    render
  }));
})(window);
