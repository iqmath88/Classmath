(function(global){
  "use strict";
  const components=new Map();
  const api={
    register(name,factory){if(!name||typeof factory!=="function")throw new TypeError("Invalid component");components.set(name,factory);return factory},
    create(name,props){const factory=components.get(name);if(!factory)throw new Error("Unknown component: "+name);return factory(props||{})},
    has(name){return components.has(name)},
    names(){return [...components.keys()]}
  };
  global.Masar.register("ui.components",api);
  global.Masar.ui=global.Masar.ui||{};
  global.Masar.ui.components=api;
})(window);
