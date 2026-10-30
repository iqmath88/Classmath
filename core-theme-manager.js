(function(global){
  "use strict";
  const api={
    current(){return document.documentElement.classList.contains("dark")?"dark":"light"},
    apply(mode){
      const dark=mode==="dark";
      document.documentElement.classList.toggle("dark",dark);
      global.Masar.events&&global.Masar.events.emit("theme:changed",{mode:dark?"dark":"light"});
      return dark?"dark":"light";
    },
    syncFromLegacy(){
      try{return api.apply(global.S&&global.S.settings&&global.S.settings.dark?"dark":"light")}catch(_){return api.current()}
    }
  };
  global.Masar.register("core.theme",api);
  global.Masar.theme=api;
})(window);
