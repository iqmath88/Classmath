(function(global){
  "use strict";
  const blocks=new Map();
  const api={
    register(type,definition){if(!type||!definition)throw new TypeError("Invalid block definition");blocks.set(type,Object.freeze(Object.assign({},definition)));return blocks.get(type)},
    get(type){return blocks.get(type)||null},
    has(type){return blocks.has(type)},
    list(){return [...blocks.entries()].map(([type,definition])=>({type,definition}))}
  };
  global.Masar.register("editor.blocks",api);
  global.Masar.editor=global.Masar.editor||{};
  global.Masar.editor.blocks=api;
})(window);
