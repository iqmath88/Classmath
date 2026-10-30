(function(global){
  "use strict";
  const tokenizer=global.Masar.resolve("math.tokenizer");
  const parser=global.Masar.resolve("math.parser");
  const visitors=global.Masar.resolve("math.visitors");
  const errorCodes=global.Masar.resolve("math.errorCodes");
  const diagnostics=global.Masar.resolve("math.diagnostics");
  const recovery=global.Masar.resolve("math.recovery");
  const semanticRules=global.Masar.resolve("math.semanticRules");
  if(!tokenizer||!parser||!visitors||!errorCodes||!diagnostics||!recovery||!semanticRules){
    throw new Error("Tokenizer, parser, visitors, error codes, diagnostics, recovery and semantic rules must load before math.validator");
  }
  const C=errorCodes.CODES;

  function classifyError(err){
    const message=String(err&&err.message||"");
    if(err&&err.name==="MasarMathTokenizeError"){
      if(/عدد عشري|النقطة/.test(message))return C.INVALID_NUMBER;
      if(/رمز غير معروف/.test(message))return C.UNKNOWN_SYMBOL;
      return C.TOKENIZE_ERROR;
    }
    if(/التعبير فارغ/.test(message))return C.EMPTY_EXPRESSION;
    if(/قوس غير مغلق|قوس الدالة غير مغلق/.test(message))return C.MISSING_CLOSING_BRACKET;
    if(/القوس الفارغ/.test(message))return C.EMPTY_GROUP;
    if(/الدالة تحتاج إلى وسيط/.test(message))return C.EMPTY_FUNCTION_ARGUMENT;
    if(/رمز زائد أو غير متوقع|بداية تعبير غير صالحة/.test(message))return C.UNEXPECTED_TOKEN;
    if(err&&err.name==="MasarMathParseError")return C.PARSE_ERROR;
    return C.INTERNAL_ERROR;
  }

  function diagnosticFromError(err,source){
    const code=classifyError(err);
    const start=Number.isInteger(err&&err.index)?err.index:null;
    const token=err&&err.token||null;
    const diagnostic=diagnostics.createDiagnostic({
      code,
      message:errorCodes.DEFAULT_MESSAGES[code],
      start,
      end:token&&Number.isInteger(token.end)?token.end:(start==null?null:start+1),
      token,
      source:err&&err.name==="MasarMathTokenizeError"?"tokenizer":"parser",
      metadata:{originalMessage:String(err&&err.message||"")}
    });
    const fix=recovery.suggestionFor(diagnostic,source);
    return fix?diagnostics.createDiagnostic(Object.assign({},diagnostic,{suggestion:fix.label,metadata:Object.assign({},diagnostic.metadata,{replacement:fix.text})})):diagnostic;
  }

  function validate(input,options){
    const expression=String(input==null?"":input);
    const opts=Object.assign({includeTokens:true,includeAst:true,semantic:true,domainWarnings:true},options||{});
    const bag=diagnostics.createBag();
    let tokens=null,ast=null;
    try{
      tokens=tokenizer.tokenize(expression);
      ast=parser.parse(expression);
      const structure=visitors.validate(ast);
      if(!structure.ok){
        (structure.errors||[]).forEach(message=>bag.add({code:C.INVALID_AST,message,start:0,end:expression.length,source:"ast"}));
      }
      if(opts.semantic!==false){
        bag.addMany(semanticRules.run(ast,{domainWarnings:opts.domainWarnings!==false}));
      }
    }catch(err){bag.add(diagnosticFromError(err,expression));}
    const allDiagnostics=bag.all();
    const errorItems=bag.errors();
    const warningItems=bag.warnings();
    const first=errorItems[0]||null;
    const result={
      ok:!bag.hasErrors(),
      expression,
      diagnostics:allDiagnostics,
      errors:errorItems,
      warnings:warningItems,
      hasErrors:bag.hasErrors(),
      ast:opts.includeAst?ast:null,
      tokens:opts.includeTokens?tokens:null,
      error:first?first.message:null,
      index:first?first.start:null,
      token:first?first.token:null
    };
    return Object.freeze(result);
  }

  function getDiagnostics(input,options){return validate(input,options).diagnostics}
  function hasErrors(input,options){return validate(input,options).hasErrors}

  global.Masar.register("math.validator",Object.freeze({version:"1.1.0-semantic-rules",validate,getDiagnostics,hasErrors,diagnosticFromError,classifyError}));
})(window);
