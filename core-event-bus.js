(function(global){
  "use strict";
  const listeners=new Map();
  const bus={
    on(type,handler){
      if(typeof handler!=="function")throw new TypeError("Event handler must be a function");
      const set=listeners.get(type)||new Set();set.add(handler);listeners.set(type,set);
      return ()=>bus.off(type,handler);
    },
    once(type,handler){const off=bus.on(type,(payload)=>{off();handler(payload)});return off},
    off(type,handler){const set=listeners.get(type);if(!set)return false;const removed=set.delete(handler);if(!set.size)listeners.delete(type);return removed},
    emit(type,payload){const set=listeners.get(type);if(!set)return 0;[...set].forEach(fn=>{try{fn(payload)}catch(err){setTimeout(()=>{throw err},0)}});return set.size},
    clear(type){if(type===undefined){listeners.clear();return}listeners.delete(type)}
  };
  global.Masar.register("core.events",bus);
  global.Masar.events=bus;
})(window);
