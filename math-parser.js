(function(global){
  "use strict";
  const tokenTypes=global.Masar.resolve("math.tokenTypes");
  const tokenizer=global.Masar.resolve("math.tokenizer");
  const astModule=global.Masar.resolve("math.ast");
  if(!tokenTypes||!tokenizer||!astModule)throw new Error("math.tokenTypes, math.tokenizer and math.ast must load before math.parser");
  const T=tokenTypes.TYPES, A=astModule.AST;

  const BP=Object.freeze({RELATION:10,SUM:20,PRODUCT:30,PREFIX:40,POWER:50,FUNCTION:60});
  const RELATION_TYPES=new Set([T.EQUAL,T.LESS,T.GREATER,T.LESS_EQUAL,T.GREATER_EQUAL,T.NOT_EQUAL]);
  const OPEN_TO_CLOSE=new Map([[T.LPAREN,T.RPAREN],[T.LBRACKET,T.RBRACKET],[T.LBRACE,T.RBRACE]]);
  const BRACKETS=new Map([[T.LPAREN,"()"],[T.LBRACKET,"[]"],[T.LBRACE,"{}"]]);

  function parseError(message,token,input){
    const index=token&&Number.isInteger(token.start)?token.start:String(input||"").length;
    const err=new SyntaxError(message+" عند الموضع "+index);
    err.name="MasarMathParseError";err.index=index;err.token=token||null;err.input=String(input||"");return err;
  }
  function opValue(t){
    const map={PLUS:"+",MINUS:"-",MULTIPLY:"*",DIVIDE:"/",POWER:"^",EQUAL:"=",LESS:"<",GREATER:">",LESS_EQUAL:"<=",GREATER_EQUAL:">=",NOT_EQUAL:"!=",PLUS_MINUS:"±",MINUS_PLUS:"∓"};
    return map[t.type]||t.value;
  }

  class Parser{
    constructor(input,options){
      this.input=String(input==null?"":input);
      this.options=Object.assign({preserveGroups:true},options||{});
      this.tokens=tokenizer.tokenize(this.input,{implicitMultiplication:true,includeEOF:true});
      this.index=0;
    }
    current(){return this.tokens[this.index]}
    previous(){return this.tokens[Math.max(0,this.index-1)]}
    advance(){const t=this.current();if(t.type!==T.EOF)this.index++;return t}
    match(type){if(this.current().type===type){return this.advance()}return null}
    expect(type,message){const t=this.current();if(t.type!==type)throw parseError(message||("متوقع "+type),t,this.input);return this.advance()}
    parse(){
      if(this.current().type===T.EOF)throw parseError("التعبير فارغ",this.current(),this.input);
      const body=this.expression(0);
      if(this.current().type!==T.EOF)throw parseError("رمز زائد أو غير متوقع",this.current(),this.input);
      return A.program(body,body.start,body.end);
    }
    expression(minBP){
      let left=this.prefix();
      while(true){
        const t=this.current();
        const info=this.infixBinding(t);
        if(!info||info.left<minBP)break;
        this.advance();
        const right=this.expression(info.right);
        const start=left.start,end=right.end,operator=opValue(t);
        if(t.type===T.POWER)left=A.power(left,right,start,end);
        else if(RELATION_TYPES.has(t.type))left=A.relation(operator,left,right,start,end);
        else left=A.binary(operator,left,right,start,end,t.implicit);
      }
      return left;
    }
    prefix(){
      const t=this.advance();
      switch(t.type){
        case T.NUMBER:return A.number(t.value,t.start,t.end);
        case T.VARIABLE:return A.variable(t.value,t.start,t.end);
        case T.CONSTANT:return A.constant(t.value,t.start,t.end);
        case T.INFINITY:return A.infinity(t.start,t.end);
        case T.PLUS:
        case T.MINUS:
        case T.PLUS_MINUS:
        case T.MINUS_PLUS:{
          const argument=this.expression(BP.PREFIX);
          return A.unary(opValue(t),argument,t.start,argument.end);
        }
        case T.FUNCTION:return this.functionCall(t);
        case T.LPAREN:
        case T.LBRACKET:
        case T.LBRACE:return this.group(t);
        default:throw parseError("بداية تعبير غير صالحة",t,this.input);
      }
    }
    group(open){
      const closeType=OPEN_TO_CLOSE.get(open.type);
      if(this.current().type===closeType)throw parseError("القوس الفارغ غير مسموح",this.current(),this.input);
      const expression=this.expression(0);
      const close=this.expect(closeType,"قوس غير مغلق");
      if(this.options.preserveGroups===false)return expression;
      return A.group(expression,BRACKETS.get(open.type),open.start,close.end);
    }
    functionCall(fn){
      const args=[];let end=fn.end;
      if([T.LPAREN,T.LBRACKET,T.LBRACE].includes(this.current().type)){
        const open=this.advance(),closeType=OPEN_TO_CLOSE.get(open.type);
        if(this.current().type===closeType)throw parseError("الدالة تحتاج إلى وسيط",this.current(),this.input);
        while(true){
          args.push(this.expression(0));
          if(!this.match(T.COMMA))break;
        }
        const close=this.expect(closeType,"قوس الدالة غير مغلق");end=close.end;
      }else{
        const arg=this.expression(BP.FUNCTION);
        args.push(arg);end=arg.end;
      }
      return A.call(fn.value,args,fn.start,end);
    }
    infixBinding(t){
      switch(t.type){
        case T.EQUAL:case T.LESS:case T.GREATER:case T.LESS_EQUAL:case T.GREATER_EQUAL:case T.NOT_EQUAL:
          return {left:BP.RELATION,right:BP.RELATION+1};
        case T.PLUS:case T.MINUS:case T.PLUS_MINUS:case T.MINUS_PLUS:
          return {left:BP.SUM,right:BP.SUM+1};
        case T.MULTIPLY:case T.DIVIDE:
          return {left:BP.PRODUCT,right:BP.PRODUCT+1};
        case T.POWER:
          return {left:BP.POWER,right:BP.POWER};
        default:return null;
      }
    }
  }

  function parse(input,options){return new Parser(input,options).parse()}
  global.Masar.register("math.parser",Object.freeze({version:"1.0.0",Parser,parse,bindingPower:BP}));
})(window);
