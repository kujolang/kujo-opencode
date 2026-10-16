// Host callbacks outlive setup. Explicitly bind each callback to its own data
// root; changing process.env would mix simultaneous project/plugin instances.
export function scopedHostContext(ctx, scope) {
  const domains = {
    session:{hook:(name,callback)=>ctx.session.hook(name,scope(callback))},
    tool:{hook:(name,callback)=>ctx.tool.hook(name,scope(callback)),transform: callback => ctx.tool.transform(editor => newEditor(editor, callback))},
    command:{transform: callback => ctx.command.transform(editor => newEditor(editor, callback))},
    permission:{hook:(name,callback)=>ctx.permission.hook(name,scope(callback))},
    rpc:{register:(definition,handlers)=>ctx.rpc.register(definition,Object.fromEntries(Object.entries(handlers).map(([name,handler])=>[name,scope(handler)])))},
  };
  function newEditor(editor,callback) {
    return scope(callback)(new Proxy(editor,{get(target,key){
      if(key==='add') return definition=>target.add({...definition,...(definition.execute?{execute:scope(definition.execute)}:{})});
      const value=target[key];return typeof value==='function'?value.bind(target):value;
    }}));
  }
  return new Proxy(ctx,{get(target,key){
    if(domains[key]) return new Proxy(target[key],{get(domain,method){return domains[key][method] || (typeof domain[method]==='function'?domain[method].bind(domain):domain[method]);}});
    return target[key];
  }});
}
