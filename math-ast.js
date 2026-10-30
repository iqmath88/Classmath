(function(global){
  "use strict";

  function freezeNode(node){
    return Object.freeze(node);
  }
  function withSpan(node,start,end){
    node.start=Number.isInteger(start)?start:null;
    node.end=Number.isInteger(end)?end:null;
    return freezeNode(node);
  }
  const AST={
    number(value,start,end){return withSpan({type:"NumberLiteral",value:Number(value)},start,end)},
    variable(name,start,end){return withSpan({type:"Variable",name:String(name)},start,end)},
    constant(name,start,end){return withSpan({type:"Constant",name:String(name)},start,end)},
    infinity(start,end){return withSpan({type:"InfinityLiteral",value:Infinity},start,end)},
    unary(operator,argument,start,end){return withSpan({type:"UnaryExpression",operator,argument},start,end)},
    binary(operator,left,right,start,end,implicit){return withSpan({type:"BinaryExpression",operator,left,right,implicit:Boolean(implicit)},start,end)},
    relation(operator,left,right,start,end){return withSpan({type:"RelationExpression",operator,left,right},start,end)},
    power(base,exponent,start,end){return withSpan({type:"PowerExpression",base,exponent},start,end)},
    call(name,args,start,end){return withSpan({type:"FunctionCall",name:String(name),arguments:Object.freeze(args.slice())},start,end)},
    group(expression,bracket,start,end){return withSpan({type:"GroupExpression",expression,bracket:bracket||"()"},start,end)},
    program(body,start,end){return withSpan({type:"MathExpression",body},start,end)}
  };

  function visit(node,visitor,parent){
    if(!node||typeof node!=="object")return node;
    const fn=visitor[node.type]||visitor.visitNode;
    if(typeof fn==="function")return fn.call(visitor,node,parent,(child)=>visit(child,visitor,node));
    switch(node.type){
      case "MathExpression": return visit(node.body,visitor,node);
      case "UnaryExpression": return visit(node.argument,visitor,node);
      case "BinaryExpression":
      case "RelationExpression": visit(node.left,visitor,node); return visit(node.right,visitor,node);
      case "PowerExpression": visit(node.base,visitor,node); return visit(node.exponent,visitor,node);
      case "FunctionCall": node.arguments.forEach(arg=>visit(arg,visitor,node)); return node;
      case "GroupExpression": return visit(node.expression,visitor,node);
      default:return node;
    }
  }

  global.Masar.register("math.ast",Object.freeze({version:"1.0.0",AST,visit}));
})(window);
