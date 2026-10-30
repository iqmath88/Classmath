(function(global){
  "use strict";
  const root=global.Masar=global.Masar||{};
  root.version=root.version||"2.6.0";
  root.architecture=root.architecture||{stage:"sprint1-step3",mode:"hybrid-modular"};
  root.modules=root.modules||Object.create(null);
  root.register=function(name,api){
    if(!name||typeof name!=="string")throw new TypeError("Module name is required");
    if(root.modules[name])return root.modules[name];
    root.modules[name]=Object.freeze(api||{});
    return root.modules[name];
  };
  root.resolve=function(name){return root.modules[name]||null};
  root.has=function(name){return !!root.modules[name]};
})(window);
