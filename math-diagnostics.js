(function(global){
  "use strict";
  const errorCodes=global.Masar.resolve("math.errorCodes");
  if(!errorCodes)throw new Error("math.errorCodes must load before math.diagnostics");

  const SEVERITY=Object.freeze({ERROR:"error",WARNING:"warning",INFO:"info"});
  function integerOrNull(value){return Number.isInteger(value)?value:null}
  function freeze(value){return Object.freeze(value)}

  function createDiagnostic(input){
    const data=input||{};
    const code=data.code||errorCodes.CODES.INTERNAL_ERROR;
    const start=integerOrNull(data.start);
    const end=integerOrNull(data.end);
    return freeze({
      code,
      severity:data.severity||SEVERITY.ERROR,
      message:String(data.message||errorCodes.DEFAULT_MESSAGES[code]||"Mathematics diagnostic."),
      start,
      end:end==null?(start==null?null:start+1):end,
      length:start==null?0:Math.max(0,(end==null?start+1:end)-start),
      token:data.token||null,
      suggestion:data.suggestion?String(data.suggestion):null,
      source:data.source||"validator",
      recoverable:data.recoverable!==false,
      metadata:freeze(Object.assign({},data.metadata||{}))
    });
  }

  function createBag(){
    const items=[];
    return {
      add(diagnostic){items.push(createDiagnostic(diagnostic));return this},
      addMany(list){(list||[]).forEach(item=>this.add(item));return this},
      all(){return items.slice()},
      errors(){return items.filter(item=>item.severity===SEVERITY.ERROR)},
      warnings(){return items.filter(item=>item.severity===SEVERITY.WARNING)},
      hasErrors(){return items.some(item=>item.severity===SEVERITY.ERROR)},
      clear(){items.length=0;return this},
      get size(){return items.length}
    };
  }

  global.Masar.register("math.diagnostics",Object.freeze({version:"1.0.0",SEVERITY,createDiagnostic,createBag}));
})(window);
