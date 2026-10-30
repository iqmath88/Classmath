(function(global){
  "use strict";
  const bridge={
    stage:"sprint1-step3",
    legacyGlobals:{
      state:()=>global.S||null,
      save:()=>global.save||null,
      render:()=>global.render||null,
      element:()=>global.el||null
    },
    verify(){
      const checks={
        storage:!!global.MasarStorage,
        coreState:typeof global.S!=="undefined",
        saveApi:typeof global.save!=="undefined",
        render:typeof global.render==="function",
        elementHelper:typeof global.el==="function"
      };
      const ok=Object.values(checks).every(Boolean);
      global.Masar.events&&global.Masar.events.emit("compatibility:verified",{ok,checks});
      return {ok,checks};
    }
  };
  global.Masar.register("compatibility.legacy",bridge);
  global.Masar.legacy=bridge;
  document.addEventListener("DOMContentLoaded",()=>bridge.verify(),{once:true});
})(window);
