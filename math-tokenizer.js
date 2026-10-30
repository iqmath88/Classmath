(function(global){
  "use strict";
  const tokenTypesModule=global.Masar.resolve("math.tokenTypes");
  if(!tokenTypesModule)throw new Error("math.tokenTypes must load before math.tokenizer");
  const T=tokenTypesModule.TYPES;

  const FUNCTIONS=new Set(["sin","cos","tan","cot","sec","csc","asin","acos","atan","log","ln","sqrt","abs","exp","lim","sum","prod"]);
  const CONSTANTS=new Set(["pi","e","i"]);
  const SUPERSCRIPTS=Object.freeze({"⁰":"0","¹":"1","²":"2","³":"3","⁴":"4","⁵":"5","⁶":"6","⁷":"7","⁸":"8","⁹":"9","⁻":"-","⁺":"+"});
  const NORMALIZE_CHAR=Object.freeze({"×":"*","·":"*","⋅":"*","÷":"/","−":"-","–":"-","—":"-"});

  function error(message,index,input){
    const e=new SyntaxError(message+" عند الموضع "+index);
    e.name="MasarMathTokenizeError"; e.index=index; e.input=input; return e;
  }
  function token(type,value,raw,start,end,extra){return Object.assign({type,value,raw,start,end},extra||{});}
  function isDigit(ch){return ch>="0"&&ch<="9";}
  function isLetter(ch){return /[A-Za-z]/.test(ch);}
  function isSuperscript(ch){return Object.prototype.hasOwnProperty.call(SUPERSCRIPTS,ch);}

  function normalizeInput(input){
    let s=String(input==null?"":input).normalize("NFC");
    // NFKC may already normalize some symbols; retain explicit replacements for the rest.
    s=s.replace(/[×·⋅÷−–—]/g,ch=>NORMALIZE_CHAR[ch]||ch);
    return s;
  }

  function rawTokenize(input){
    const source=normalizeInput(input); const out=[]; let i=0;
    while(i<source.length){
      const ch=source[i];
      if(/\s/.test(ch)){i++;continue;}
      const start=i;
      if(ch==="π"){out.push(token(T.CONSTANT,"pi",ch,i,i+1));i++;continue;}
      if(ch==="∞"){out.push(token(T.INFINITY,Infinity,ch,i,i+1));i++;continue;}
      if(isDigit(ch)||ch==="."){
        let dots=0;
        while(i<source.length&&(isDigit(source[i])||source[i]===".")){
          if(source[i]==="."&&++dots>1)throw error("عدد عشري غير صالح",i,source);
          i++;
        }
        const raw=source.slice(start,i);
        if(raw===".")throw error("النقطة وحدها ليست عددًا",start,source);
        out.push(token(T.NUMBER,Number(raw),raw,start,i)); continue;
      }
      if(isLetter(ch)){
        i++; while(i<source.length&&/[A-Za-z0-9_]/.test(source[i]))i++;
        const raw=source.slice(start,i); const word=raw.toLowerCase();
        if(word==="infinity"){out.push(token(T.INFINITY,Infinity,raw,start,i));continue;}
        if(FUNCTIONS.has(word)){out.push(token(T.FUNCTION,word,raw,start,i));continue;}
        if(CONSTANTS.has(word)){out.push(token(T.CONSTANT,word,raw,start,i));continue;}
        // Natural notation: xyz is interpreted as x*y*z, while names containing digits/_ stay one variable.
        if(/^[A-Za-z]+$/.test(raw)&&raw.length>1){
          for(let k=0;k<raw.length;k++)out.push(token(T.VARIABLE,raw[k],raw[k],start+k,start+k+1));
        }else out.push(token(T.VARIABLE,raw,raw,start,i));
        continue;
      }
      if(isSuperscript(ch)){
        let raw="",value="";
        while(i<source.length&&isSuperscript(source[i])){raw+=source[i];value+=SUPERSCRIPTS[source[i]];i++;}
        if(value==="+"||value==="-")throw error("أس غير مكتمل",start,source);
        out.push(token(T.POWER,"^","^",start,start,{fromSuperscript:true}));
        out.push(token(T.NUMBER,Number(value),raw,start,i,{superscript:true})); continue;
      }
      const two=source.slice(i,i+2);
      if(two==="<="){out.push(token(T.LESS_EQUAL,two,two,i,i+2));i+=2;continue;}
      if(two===">="){out.push(token(T.GREATER_EQUAL,two,two,i,i+2));i+=2;continue;}
      if(two==="!="){out.push(token(T.NOT_EQUAL,two,two,i,i+2));i+=2;continue;}
      const map={"+":T.PLUS,"-":T.MINUS,"*":T.MULTIPLY,"/":T.DIVIDE,"^":T.POWER,"=":T.EQUAL,"<":T.LESS,">":T.GREATER,"(":T.LPAREN,")":T.RPAREN,"[":T.LBRACKET,"]":T.RBRACKET,"{":T.LBRACE,"}":T.RBRACE,",":T.COMMA,"±":T.PLUS_MINUS,"∓":T.MINUS_PLUS,"√":T.FUNCTION};
      if(map[ch]){
        out.push(token(map[ch],ch==="√"?"sqrt":ch,ch,i,i+1,{prefixSymbol:ch==="√"}));i++;continue;
      }
      throw error("رمز غير معروف: "+ch,i,source);
    }
    return {source,tokens:out};
  }

  function canEndValue(t){return t&&[T.NUMBER,T.VARIABLE,T.CONSTANT,T.INFINITY,T.RPAREN,T.RBRACKET,T.RBRACE].includes(t.type);}
  function canStartValue(t){return t&&[T.NUMBER,T.VARIABLE,T.CONSTANT,T.INFINITY,T.FUNCTION,T.LPAREN,T.LBRACKET,T.LBRACE].includes(t.type);}
  function insertImplicitMultiplication(tokens){
    const out=[];
    for(let i=0;i<tokens.length;i++){
      const current=tokens[i],prev=out[out.length-1];
      if(canEndValue(prev)&&canStartValue(current)){
        out.push(token(T.MULTIPLY,"*","",current.start,current.start,{implicit:true}));
      }
      out.push(current);
    }
    return out;
  }

  function tokenize(input,options){
    const opts=Object.assign({implicitMultiplication:true,includeEOF:false},options||{});
    const result=rawTokenize(input);
    let tokens=opts.implicitMultiplication?insertImplicitMultiplication(result.tokens):result.tokens.slice();
    if(opts.includeEOF)tokens.push(token(T.EOF,null,"",result.source.length,result.source.length));
    return tokens;
  }

  const api={version:"1.0.0",FUNCTIONS:Object.freeze(Array.from(FUNCTIONS)),CONSTANTS:Object.freeze(Array.from(CONSTANTS)),normalizeInput,tokenize};
  global.Masar.register("math.tokenizer",api);
})(window);
