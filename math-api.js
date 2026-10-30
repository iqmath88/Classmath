(function(global){
  "use strict";
  const tokenizer=global.Masar.resolve("math.tokenizer");
  const parser=global.Masar.resolve("math.parser");
  const visitors=global.Masar.resolve("math.visitors");
  const validator=global.Masar.resolve("math.validator");
  if(!tokenizer||!parser||!visitors)throw new Error("math.tokenizer, math.parser and math.visitors must load before math.api");
  const api={
    version:"0.5.0-semantic-diagnostics",
    ready:true,
    capabilities(){return {tokenizer:true,parser:true,ast:true,validator:true,naturalMath:true,latex:false,visualEditor:false}},
    normalize:tokenizer.normalizeInput,
    tokenize:tokenizer.tokenize,
    parse:parser.parse,
    toAST:parser.parse,
    print(expressionOrAst){return visitors.print(typeof expressionOrAst==="string"?parser.parse(expressionOrAst):expressionOrAst)},
    debug(expressionOrAst){return visitors.debug(typeof expressionOrAst==="string"?parser.parse(expressionOrAst):expressionOrAst)},
    validate:validator?validator.validate:function(expression){
      try{
        const ast=parser.parse(expression),checked=visitors.validate(ast);
        return {ok:checked.ok,expression:String(expression||""),tokens:tokenizer.tokenize(expression),ast,errors:checked.errors,diagnostics:[],warnings:[],hasErrors:!checked.ok,error:null,index:null,token:null};
      }catch(err){return {ok:false,expression:String(expression||""),error:err.message,index:Number.isInteger(err.index)?err.index:null,token:err.token||null,errors:[err.message],diagnostics:[],warnings:[],hasErrors:true}}
    },
    getDiagnostics:validator?validator.getDiagnostics:function(){return []},
    hasErrors:validator?validator.hasErrors:function(expression){return !api.validate(expression).ok}
  };
  global.Masar.register("math.api",api);
  global.MasarMath=api;
})(window);
