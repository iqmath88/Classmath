(function(global){
  "use strict";
  function backend(){return global.MasarStorage||null}
  const service={
    isReady(){return !!backend()},
    get(key,fallback){const b=backend();return b?b.get(key,fallback):fallback},
    set(key,value){const b=backend();if(!b)throw new Error("MasarStorage is not ready");return b.set(key,value)},
    remove(key){const b=backend();if(b)b.remove(key)},
    has(key){const b=backend();return !!(b&&b.has(key))},
    keys(){const b=backend();return b?b.keys():[]},
    exportBackup(){const b=backend();if(!b)throw new Error("MasarStorage is not ready");return b.exportBackup()},
    importBackup(payload,options){const b=backend();if(!b)throw new Error("MasarStorage is not ready");return b.importBackup(payload,options)}
  };
  global.Masar.register("core.storage",service);
  global.Masar.storage=service;
})(window);
