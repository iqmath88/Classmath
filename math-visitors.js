(function(global){
  "use strict";
  const astModule=global.Masar.resolve("math.ast");
  if(!astModule)throw new Error("math.ast must load before math.visitors");

  const PRECEDENCE={RelationExpression:10,BinaryExpression:20,PowerExpression:50,UnaryExpression:40,FunctionCall:60,GroupExpression:70,NumberLiteral:80,Variable:80,Constant:80,InfinityLiteral:80,MathExpression:0};
  function binaryPrec(node){return node.type==="BinaryExpression"?(node.operator==="*"||node.operator==="/"?30:20):(PRECEDENCE[node.type]||0)}
  function print(node,parentPrec){
    if(!node)return "";
    switch(node.type){
      case "MathExpression":return print(node.body,0);
      case "NumberLiteral":return String(node.value);
      case "Variable":return node.name;
      case "Constant":return node.name==="pi"?"π":node.name;
      case "InfinityLiteral":return "∞";
      case "GroupExpression":return node.bracket[0]+print(node.expression,0)+node.bracket[1];
      case "FunctionCall":return node.name+"("+node.arguments.map(x=>print(x,0)).join(", ")+")";
      case "UnaryExpression":return node.operator+print(node.argument,40);
      case "PowerExpression":{
        const text=print(node.base,50)+"^"+print(node.exponent,49);
        return 50<(parentPrec||0)?"("+text+")":text;
      }
      case "RelationExpression":{
        const text=print(node.left,10)+" "+node.operator+" "+print(node.right,11);
        return 10<(parentPrec||0)?"("+text+")":text;
      }
      case "BinaryExpression":{
        const p=binaryPrec(node),rightP=node.operator==="/"?p+1:p;
        const marker=node.operator==="*"&&node.implicit?"":" "+node.operator+" ";
        const text=print(node.left,p)+marker+print(node.right,rightP);
        return p<(parentPrec||0)?"("+text+")":text;
      }
      default:throw new Error("Unknown AST node: "+node.type);
    }
  }
  function debug(node){return JSON.stringify(node,null,2)}
  function validate(node){
    const errors=[];
    astModule.visit(node,{visitNode(current){if(!current.type)errors.push("AST node without type");return current}});
    return {ok:errors.length===0,errors};
  }
  global.Masar.register("math.visitors",Object.freeze({version:"1.0.0",print,debug,validate}));
})(window);
