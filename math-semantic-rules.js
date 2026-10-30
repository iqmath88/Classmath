(function(global){
  "use strict";
  const astModule=global.Masar.resolve("math.ast");
  const errorCodes=global.Masar.resolve("math.errorCodes");
  const diagnostics=global.Masar.resolve("math.diagnostics");
  if(!astModule||!errorCodes||!diagnostics)throw new Error("math.ast, math.errorCodes and math.diagnostics must load before math.semanticRules");

  const C=errorCodes.CODES;
  const S=diagnostics.SEVERITY;
  const SIGNATURES=Object.freeze({
    sin:[1,1],cos:[1,1],tan:[1,1],cot:[1,1],sec:[1,1],csc:[1,1],
    asin:[1,1],acos:[1,1],atan:[1,1],ln:[1,1],sqrt:[1,1],abs:[1,1],exp:[1,1],
    log:[1,2],lim:[1,3],sum:[1,4],prod:[1,4]
  });

  function unwrap(node){
    let current=node;
    while(current&&current.type==="GroupExpression")current=current.expression;
    return current;
  }
  function numericValue(node){
    const current=unwrap(node);
    if(!current)return null;
    if(current.type==="NumberLiteral")return current.value;
    if(current.type==="UnaryExpression"&&(current.operator==="+"||current.operator==="-")){
      const value=numericValue(current.argument);
      return value==null?null:(current.operator==="-"?-value:value);
    }
    return null;
  }
  function span(node){return {start:Number.isInteger(node&&node.start)?node.start:null,end:Number.isInteger(node&&node.end)?node.end:null}}
  function create(code,node,extra){
    const p=span(node),data=extra||{};
    return diagnostics.createDiagnostic({
      code,
      severity:data.severity||S.ERROR,
      message:data.message||errorCodes.DEFAULT_MESSAGES[code],
      start:p.start,
      end:p.end,
      suggestion:data.suggestion||null,
      source:"semantic-validator",
      recoverable:data.recoverable!==false,
      metadata:Object.assign({},data.metadata||{})
    });
  }

  function validateFunction(node,out){
    const signature=SIGNATURES[node.name];
    if(!signature)return;
    const count=node.arguments.length,min=signature[0],max=signature[1];
    if(count<min||count>max){
      const expected=min===max?String(min):(min+" to "+max);
      out.push(create(C.INVALID_FUNCTION_ARGUMENT_COUNT,node,{
        message:"Function '"+node.name+"' expects "+expected+" argument"+(expected==="1"?"":"s")+", but received "+count+".",
        suggestion:"Adjust the function arguments.",
        metadata:{functionName:node.name,expectedMin:min,expectedMax:max,actual:count}
      }));
    }
    const first=node.arguments[0];
    const value=numericValue(first);
    if(value!=null){
      if((node.name==="ln"||node.name==="log")&&value<=0){
        out.push(create(C.REAL_DOMAIN_WARNING,node,{
          severity:S.WARNING,
          message:"Function '"+node.name+"' is outside the real-number domain for this numeric argument.",
          suggestion:"Use a positive argument or evaluate in the complex domain.",
          metadata:{functionName:node.name,value,domain:"real"}
        }));
      }
      if(node.name==="sqrt"&&value<0){
        out.push(create(C.REAL_DOMAIN_WARNING,node,{
          severity:S.WARNING,
          message:"sqrt has a negative numeric argument; the result is complex, not real.",
          suggestion:"Use complex-number mode or a non-negative argument.",
          metadata:{functionName:node.name,value,domain:"real"}
        }));
      }
    }
  }

  function validateNode(node,out){
    if(!node)return;
    if(node.type==="FunctionCall")validateFunction(node,out);
    if(node.type==="BinaryExpression"&&node.operator==="/"){
      const denominator=numericValue(node.right);
      if(denominator===0){
        out.push(create(C.DIVISION_BY_ZERO,node.right,{
          message:"Division by zero is undefined.",
          suggestion:"Replace the denominator with a non-zero expression.",
          metadata:{operator:"/"}
        }));
      }
    }
    if(node.type==="PowerExpression"){
      const base=numericValue(node.base),exponent=numericValue(node.exponent);
      if(base===0&&exponent!=null&&exponent<0){
        out.push(create(C.ZERO_TO_NEGATIVE_POWER,node,{
          message:"Zero cannot be raised to a negative power.",
          suggestion:"Use a non-zero base or a non-negative exponent.",
          metadata:{base,exponent}
        }));
      }
      if(base===0&&exponent===0){
        out.push(create(C.INDETERMINATE_FORM_WARNING,node,{
          severity:S.WARNING,
          message:"The expression 0^0 is indeterminate in many mathematical contexts.",
          suggestion:"Specify the intended convention or revise the expression.",
          metadata:{base,exponent}
        }));
      }
    }
    if(node.type==="RelationExpression"&&node.left&&node.left.type==="RelationExpression"){
      out.push(create(C.CHAINED_RELATION_WARNING,node,{
        severity:S.WARNING,
        message:"Chained relations are parsed left-to-right and may not express the intended mathematical statement.",
        suggestion:"Split the relation or combine it explicitly.",
        metadata:{operator:node.operator}
      }));
    }
  }

  function walk(node,out){
    if(!node||typeof node!=="object")return;
    validateNode(node,out);
    switch(node.type){
      case "MathExpression": walk(node.body,out); break;
      case "UnaryExpression": walk(node.argument,out); break;
      case "BinaryExpression":
      case "RelationExpression": walk(node.left,out); walk(node.right,out); break;
      case "PowerExpression": walk(node.base,out); walk(node.exponent,out); break;
      case "FunctionCall": (node.arguments||[]).forEach(arg=>walk(arg,out)); break;
      case "GroupExpression": walk(node.expression,out); break;
      default: break;
    }
  }

  function run(ast,options){
    const out=[];
    const opts=Object.assign({domainWarnings:true},options||{});
    walk(ast,out);
    return opts.domainWarnings?out:out.filter(item=>item.code!==C.REAL_DOMAIN_WARNING);
  }

  global.Masar.register("math.semanticRules",Object.freeze({version:"1.0.0",SIGNATURES,numericValue,run}));
})(window);
