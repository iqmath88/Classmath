(function(global){
  "use strict";

  function clampIndex(index,length){
    const n=Number.isInteger(index)?index:0;
    return Math.max(0,Math.min(n,Math.max(0,Number(length)||0)));
  }

  function insertText(source,index,text){
    const input=String(source==null?"":source);
    const at=clampIndex(index,input.length);
    return input.slice(0,at)+String(text==null?"":text)+input.slice(at);
  }

  function removeRange(source,start,end){
    const input=String(source==null?"":source);
    const a=clampIndex(start,input.length),b=clampIndex(end,input.length);
    return input.slice(0,Math.min(a,b))+input.slice(Math.max(a,b));
  }

  function suggestionFor(diagnostic,source){
    if(!diagnostic)return null;
    const input=String(source==null?"":source);
    switch(diagnostic.code){
      case "MTH005":return {label:"Insert the missing closing bracket",text:insertText(input,input.length,")")};
      case "MTH006":return {label:"Insert an expression inside the brackets",text:insertText(input,diagnostic.start==null?0:diagnostic.start+1,"x")};
      case "MTH007":return {label:"Insert a function argument",text:insertText(input,diagnostic.start==null?input.length:diagnostic.start,"x")};
      default:return null;
    }
  }

  global.Masar.register("math.recovery",Object.freeze({version:"1.0.0",clampIndex,insertText,removeRange,suggestionFor}));
})(window);
