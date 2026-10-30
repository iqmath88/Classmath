(function(global){
  "use strict";
  const Masar=global.Masar;
  if(!Masar)throw new Error("Masar namespace must load before editor.autoDirection");

  const BLOCK_SELECTOR="p,div,h1,h2,h3,h4,h5,h6,li,blockquote,td,th";
  const RTL_RE=/[\u0590-\u08FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;
  const LTR_RE=/[A-Za-z\u00C0-\u02AF\u0370-\u052F]/;
  const LEADING_IGNORABLE_RE=/^[\s\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]+/;
  const MATH_START_RE=/^(?:\$\$?|\\\(|\\\[)/;
  const MATH_TRIGGER_RE=/^\s*\$/;

  function startsMathTyping(value){
    const text=String(value==null?"":value);
    return MATH_START_RE.test(text.replace(LEADING_IGNORABLE_RE,""));
  }

  function firstStrongDirection(value){
    const text=String(value==null?"":value).replace(LEADING_IGNORABLE_RE,"");
    if(!text)return null;
    if(MATH_START_RE.test(text))return "ltr";
    for(const ch of text){
      if(RTL_RE.test(ch))return "rtl";
      if(LTR_RE.test(ch))return "ltr";
    }
    return null;
  }

  function meaningfulText(element){
    if(!element)return "";
    if(element.matches&&element.matches("input,textarea"))return element.value||"";
    return element.textContent||"";
  }

  function isVisuallyEmpty(element){
    const text=meaningfulText(element).replace(/[\s\u200B-\u200F\uFEFF]/g,"");
    if(text)return false;
    return !(element&&element.querySelector&&element.querySelector("img,table,.richEquation,.eduMath,.katex"));
  }

  function emit(element,dir,mode){
    if(!element||typeof CustomEvent!=="function")return;
    element.dispatchEvent(new CustomEvent("masar:directionchange",{bubbles:true,detail:{direction:dir,mode:mode||"auto",element}}));
  }

  /*
   * Word-like behaviour:
   * - The first strong character chooses the paragraph base direction once.
   * - Switching the keyboard later does NOT flip the whole paragraph.
   * - Unicode BiDi renders English/math LTR inside Arabic paragraphs automatically.
   */
  // v2.8.16: لا نلغي محاذاة اختارها المستخدم (توسيط/يمين/يسار) — نضبط "start" فقط إن لم توجد محاذاة صريحة.
  function keepAlign(element){
    if(!element||!element.style)return;
    const chosen=(element.dataset&&element.dataset.align)||"";
    const cur=element.style.textAlign;
    if(chosen){element.style.textAlign=chosen;return;}
    if(!cur||cur==="start"||cur==="end")element.style.textAlign="start";
  }

  function setVisualDirection(element,dir,mode,lock){
    if(!element||!dir)return null;
    element.setAttribute("dir",dir);
    element.style.direction=dir;
    keepAlign(element);
    element.style.unicodeBidi="plaintext";
    if(element.dataset){
      element.dataset.dirMode=mode||"auto";
      element.dataset.dirLocked=lock===false?"false":"true";
    }
    emit(element,dir,mode||"auto");
    return dir;
  }

  function resetAuto(element){
    if(!element)return;
    element.setAttribute("dir","auto");
    element.style.removeProperty("direction");
    keepAlign(element);
    element.style.unicodeBidi="plaintext";
    if(element.dataset){
      element.dataset.dirMode="auto";
      element.dataset.dirLocked="false";
    }
    emit(element,"auto","auto");
  }

  function isLocked(element){
    return !!(element&&element.dataset&&element.dataset.dirLocked==="true");
  }

  function apply(element,options){
    if(!element)return null;
    const opts=Object.assign({force:false,emptyDirection:null},options||{});
    if(element.dataset&&element.dataset.dirMode==="manual")return element.getAttribute("dir")||null;
    if(!opts.force&&isLocked(element)&&!isVisuallyEmpty(element))return element.getAttribute("dir")||null;

    const detected=firstStrongDirection(meaningfulText(element));
    if(detected)return setVisualDirection(element,detected,"auto",true);
    if(opts.emptyDirection)return setVisualDirection(element,opts.emptyDirection,"auto",false);
    if(isVisuallyEmpty(element))resetAuto(element);
    return null;
  }

  function setMode(element,mode){
    if(!element)return;
    if(mode==="auto"){
      resetAuto(element);
      apply(element,{force:true});
      return;
    }
    setVisualDirection(element,mode==="ltr"?"ltr":"rtl","manual",true);
  }

  function targetBlock(editor,node){
    let current=node;
    if(current&&current.nodeType===Node.TEXT_NODE)current=current.parentElement;
    const block=current&&current.closest?current.closest(BLOCK_SELECTOR):null;
    return block&&editor.contains(block)?block:editor;
  }

  function activeBlock(editor,eventTarget){
    const selection=global.getSelection&&global.getSelection();
    const anchor=selection&&selection.rangeCount?selection.anchorNode:null;
    return targetBlock(editor,anchor||eventTarget||editor);
  }

  function eventText(event){
    if(!event)return "";
    if(typeof event.data==="string"&&event.data)return event.data;
    if(event.dataTransfer&&typeof event.dataTransfer.getData==="function")return event.dataTransfer.getData("text/plain")||"";
    if(event.clipboardData&&typeof event.clipboardData.getData==="function")return event.clipboardData.getData("text/plain")||"";
    if(typeof event.key==="string"&&event.key.length===1)return event.key;
    return "";
  }

  function forceMathDirection(element){
    if(!element||element.dataset&&element.dataset.dirMode==="manual")return null;
    if(element.dataset)element.dataset.mathTyping="true";
    return setVisualDirection(element,"ltr","auto",true);
  }

  function prepareMathTrigger(element,data){
    if(!element||element.dataset&&element.dataset.dirMode==="manual")return null;
    const incoming=String(data==null?"":data);
    if(!MATH_TRIGGER_RE.test(incoming)&&!startsMathTyping(incoming))return null;
    // The $ trigger is intentionally stronger than the normal first-character rule.
    // If the paragraph is empty (or only whitespace), switch to LTR BEFORE Safari inserts it.
    if(isVisuallyEmpty(element)||!meaningfulText(element).trim())return forceMathDirection(element);
    return null;
  }

  function prepareFirstInput(element,data){
    if(!element||element.dataset&&element.dataset.dirMode==="manual")return null;
    const mathDir=prepareMathTrigger(element,data);
    if(mathDir)return mathDir;
    if(!isVisuallyEmpty(element)||isLocked(element))return null;
    const dir=firstStrongDirection(data);
    return dir?setVisualDirection(element,dir,"auto",true):null;
  }

  function normalizeNewBlocks(editor){
    editor.querySelectorAll(BLOCK_SELECTOR).forEach(block=>{
      if(block.closest(".katex,.richEquation,.eduMath"))return;
      if(!block.dataset.dirMode)block.dataset.dirMode="auto";
      block.style.unicodeBidi="plaintext";
      keepAlign(block);
      if(isVisuallyEmpty(block)&&block.dataset.dirMode!=="manual")resetAuto(block);
      else apply(block);
    });
  }

  function scan(editor){
    if(!editor)return;
    const blocks=editor.querySelectorAll(BLOCK_SELECTOR);
    if(!blocks.length){apply(editor,{force:true});return;}
    blocks.forEach(block=>{
      if(block.closest(".katex,.richEquation,.eduMath"))return;
      apply(block,{force:true});
    });
  }

  function bindEditor(editor){
    if(!editor||editor.dataset.autoDirectionBound==="true")return editor;
    editor.dataset.autoDirectionBound="true";
    editor.dataset.dirMode=editor.dataset.dirMode||"auto";
    editor.dataset.dirLocked=editor.dataset.dirLocked||"false";
    editor.setAttribute("dir",editor.getAttribute("dir")||"auto");
    editor.style.unicodeBidi="plaintext";
    keepAlign(editor);

    const observer=new MutationObserver(()=>normalizeNewBlocks(editor));
    observer.observe(editor,{childList:true,subtree:true});

    editor.addEventListener("keydown",e=>{
      if(e.ctrlKey||e.metaKey||e.altKey)return;
      const block=activeBlock(editor,e.target);
      if(e.key==="Enter"){
        setTimeout(()=>{
          const next=activeBlock(editor);
          if(next&&next.dataset?.dirMode!=="manual")resetAuto(next);
        },0);
        return;
      }
      prepareFirstInput(block,eventText(e));
    });

    editor.addEventListener("compositionstart",e=>prepareFirstInput(activeBlock(editor,e.target),eventText(e)));
    editor.addEventListener("compositionupdate",e=>prepareFirstInput(activeBlock(editor,e.target),eventText(e)));
    editor.addEventListener("compositionend",e=>{
      const block=activeBlock(editor,e.target);
      prepareFirstInput(block,eventText(e));
      setTimeout(()=>apply(activeBlock(editor,e.target)),0);
    });

    editor.addEventListener("beforeinput",e=>{
      const block=activeBlock(editor,e.target);
      if(["insertText","insertCompositionText","insertFromPaste"].includes(e.inputType))prepareFirstInput(block,eventText(e));
      if(["insertParagraph","insertLineBreak"].includes(e.inputType)){
        setTimeout(()=>{
          const next=activeBlock(editor);
          if(next&&next.dataset?.dirMode!=="manual")resetAuto(next);
        },0);
      }
    });

    editor.addEventListener("input",e=>{
      const block=activeBlock(editor,e.target);
      if(isVisuallyEmpty(block)&&block.dataset?.dirMode!=="manual")resetAuto(block);
      else if(block?.dataset?.dirMode!=="manual"&&startsMathTyping(meaningfulText(block)))forceMathDirection(block);
      else apply(block);
      setTimeout(()=>normalizeNewBlocks(editor),0);
    });

    editor.addEventListener("paste",e=>{
      prepareFirstInput(activeBlock(editor,e.target),eventText(e));
      setTimeout(()=>scan(editor),0);
    });
    editor.addEventListener("focusin",e=>apply(activeBlock(editor,e.target)));
    scan(editor);
    return editor;
  }

  function bindInput(input){
    if(!input||input.dataset.autoDirectionBound==="true")return input;
    input.dataset.autoDirectionBound="true";
    input.dataset.dirMode=input.dataset.dirMode||"auto";
    input.dataset.dirLocked=input.dataset.dirLocked||"false";
    input.setAttribute("dir",input.getAttribute("dir")||"auto");
    input.style.unicodeBidi="plaintext";
    keepAlign(input);
    input.addEventListener("keydown",e=>{if(!e.ctrlKey&&!e.metaKey&&!e.altKey&&!input.value)prepareFirstInput(input,eventText(e));});
    input.addEventListener("compositionupdate",e=>{if(!input.value)prepareFirstInput(input,eventText(e));});
    input.addEventListener("beforeinput",e=>{
      if(["insertText","insertCompositionText","insertFromPaste"].includes(e.inputType)&&!input.value)prepareFirstInput(input,eventText(e));
    });
    const update=()=>{
      if(!input.value&&input.dataset.dirMode!=="manual")resetAuto(input);
      else if(input.dataset.dirMode!=="manual"&&startsMathTyping(input.value))forceMathDirection(input);
      else apply(input);
    };
    input.addEventListener("input",update);
    input.addEventListener("focus",update);
    update();
    return input;
  }

  const api=Object.freeze({
    version:"3.2.0",
    firstStrongDirection,
    startsMathTyping,
    isVisuallyEmpty,
    prepareMathTrigger,
    prepareFirstInput,
    apply,
    setMode,
    activeBlock,
    scan,
    bindEditor,
    bindInput
  });
  Masar.register("editor.autoDirection",api);
  global.MasarAutoDirection=api;
})(window);
