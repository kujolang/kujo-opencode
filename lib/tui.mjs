import { KujoControl } from './plugin-rpc.mjs';

export default {id:'kujo.opencode.ui',setup:setupTui};
export function setupTui(ctx) {
  let closed=false;
  const location=()=>ctx.location || ctx.data.location.default();
  const call=(method,input={})=>ctx.client.rpc(KujoControl)[method](input,{location:location()});
  const alert=(title,message)=>closed?undefined:ctx.ui.dialog.alert({title,message});
  async function profile() {
    const route=ctx.ui.router.current();
    if(route.type!=='session') return alert('Open a session','Choose a project session before changing Kujo capabilities.');
    const status=await call('status');
    if(closed) return;
    const name=await ctx.ui.dialog.select({title:'Choose Kujo capabilities',current:status.profile.replace('kujo.profile.',''),options:status.profiles.map(item=>({title:item.label,value:item.id.replace('kujo.profile.',''),description:item.description}))});
    if(!name || closed) return;
    // The server requests native host permission. This client never issues or
    // replies to permission requests and never manufactures Ability approval.
    const result=await call('profile',{sessionID:route.sessionID,profile:name});
    if(!closed) ctx.ui.toast.show({message:`${name}: ${result.abilities} tools ready`,variant:'success'});
  }
  async function capabilities() {
    const route=ctx.ui.router.current();
    if(route.type!=='session')return alert('Open a session','Choose a project session before changing Kujo capabilities.');
    const state=await call('status');if(closed)return;
    const selected=await ctx.ui.dialog.select({title:'Manage individual capabilities',options:state.capabilities.map(item=>({title:`${item.active?'On':'Off'} · ${item.name}`,value:item.id,description:`${item.mode==='profile'?'From profile':'Override: '+item.mode} · ${item.description}`}))});
    if(!selected||closed)return;
    const item=state.capabilities.find(item=>item.id===selected);if(!item)return;
    const mode=await ctx.ui.dialog.select({title:`${item.name} · ${item.active?'on':'off'}`,current:item.mode,options:[
      {title:'Enable',value:'enabled',description:'Expose this tool. Its effects still require normal approval.'},
      {title:'Disable',value:'disabled',description:'Hide this tool from model requests.'},
      {title:'Use profile default',value:'profile',description:`Remove the override. Current profile default: ${item.inherited?'on':'off'}.`},
    ]});
    if(!mode||closed||mode===item.mode)return;
    const result=await call('capability',{sessionID:route.sessionID,ability:item.id,mode});
    if(!closed)ctx.ui.toast.show({message:`${item.name}: ${result.active?'on':'off'} · tools refreshed`,variant:'success'});
  }
  async function status() {
    const state=await call('status');
    if(closed) return;
    const selected=await ctx.ui.dialog.select({title:`Kujo: ${state.profile.replace('kujo.profile.','')} · ${state.tools.length} tools`,options:[
      {title:'Installation details',value:'installation',description:`Version ${state.version} · ${state.project}`},
      ...state.tools.map(tool=>({title:tool.name,value:tool.name,description:tool.description})),
    ]});
    if(selected==='installation') return alert('Kujo installation',`${state.project}\nVersion ${state.version}\nProfile: ${state.profile.replace('kujo.profile.','')}\n${state.tools.length} available tools`);
    const tool=state.tools.find(item=>item.name===selected);
    if(tool) await alert(tool.name,`${tool.description}\n\nEffects: ${JSON.stringify(tool.effects || [])}`);
  }
  async function specialist() {
    const route=ctx.ui.router.current();
    if(route.type!=='session')return alert('Choose a specialist','Use OpenCode’s agent selector before starting a session, or open a session and choose a Kujo specialist here.');
    const state=await call('status');if(closed)return;
    const selected=await ctx.ui.dialog.select({title:'Choose a Kujo specialist',options:(state.specialists||[]).map(item=>({title:item.title,value:item.id,description:`${item.available.length}/${item.abilities.length} capabilities available · ${item.description}`}))});
    if(!selected||closed)return;
    const chosen=state.specialists.find(item=>item.id===selected);
    await call('specialist',{sessionID:route.sessionID,agent:selected});
    if(closed)return;
    if(chosen.missing.length)await alert(`${chosen.title} selected`,`${chosen.missing.length} capabilities are unavailable in this profile. Use Choose a profile in /kujo when needed. Suggested starting profile: ${chosen.profile}.\n\nMissing: ${chosen.missing.join(', ')}`);
    else ctx.ui.toast.show({message:`${chosen.title} selected`,variant:'success'});
  }
  async function evidence() {
    const route=ctx.ui.router.current();
    const scope=await ctx.ui.dialog.select({title:'Kujo evidence scope',options:[
      {title:'This project',value:'project',description:'Receipts recorded for this workspace'},
      ...(route.type==='session'?[{title:'This session',value:'session',description:'Only this project and current session'}]:[]),
      {title:'Older unscoped receipts',value:'legacy',description:'Project attribution is unavailable; shared local history'},
    ]});
    if(!scope||closed)return;
    const result=await call('evidence',{scope,...(scope==='session'?{sessionID:route.sessionID}:{})});
    if(closed)return;
    if(!result.receipts.length)return alert('Kujo evidence',`No receipts in this scope. Older unscoped receipts are available separately.\n\n${result.coverage}`);
    const id=await ctx.ui.dialog.select({title:`Kujo evidence · ${scope}`,options:[...(scope!=='legacy'&&result.receipts.length>1?[{title:'Compare two receipts',value:'compare',description:'Compare recorded outcomes, duration and result equality'}]:[]),...result.receipts.map(item=>({title:`${item.status}: ${item.ability_id}`,value:item.receipt_id,description:`${(Number.isFinite(item.completed_at_ms)?new Date(item.completed_at_ms).toISOString():'Unknown time')} · ${item.receipt_id}`}))]});
    if(!id||closed)return;
    if(id==='compare'){
      const choices=result.receipts.map(item=>({title:`${item.status}: ${item.ability_id}`,value:item.receipt_id,description:item.receipt_id}));
      const left=await ctx.ui.dialog.select({title:'Choose earlier/baseline receipt',options:choices});if(!left||closed)return;
      const right=await ctx.ui.dialog.select({title:'Choose comparison receipt',options:choices.filter(item=>item.value!==left)});if(!right||closed)return;
      return alert('Receipt comparison',JSON.stringify(await call('compare',{left,right}),null,2));
    }
    const detail=await call('evidenceDetail',{receiptID:id,scope:scope==='legacy'?'legacy':'project'});if(closed)return;
    const choice=await ctx.ui.dialog.select({title:'Receipt details',options:[
      {title:'Outcome and provenance',value:'metadata',description:id},
      {title:'Recorded result',value:'result',description:'Bounded preview of the original recorded result'},
      ...detail.artifacts.map((path,index)=>({title:path,value:`artifact:${index}`,description:'Preview current artifact; files may have changed since the run'})),
    ]});
    if(!choice||closed)return;
    if(choice==='metadata'){
      const {result:ignored,...metadata}=detail.receipt;
      return alert(detail.unscoped?'Unscoped receipt':'Kujo receipt',JSON.stringify(metadata,null,2));
    }
    const value=choice==='result'?detail.receipt.result:await call('artifact',{receiptID:id,index:Number(choice.slice(9))});
    const text=JSON.stringify(value,null,2);
    await alert(choice==='result'?'Recorded result':'Current artifact',text.slice(0,16000)+(text.length>16000?'\n[Preview truncated]':''));
  }
  async function lifecycle() {
    const route=ctx.ui.router.current();
    if(route.type!=='session')return alert('Open a session','Choose a project session before managing lifecycle delivery.');
    const input={sessionID:route.sessionID};
    const state=await call('lifecycle',{...input,action:'status'});if(closed)return;
    const action=await ctx.ui.dialog.select({title:`Lifecycle delivery · ${state.enabled?'on':'off'}`,options:[
      {title:state.enabled?'Disable delivery':'Enable local Watchdog delivery',value:state.enabled?'disable':'enable',description:'Metadata only. No prompts, tool content or credentials are stored.'},
      {title:'Queue status',value:'status',description:'Pending deliveries, discarded events and last delivery status'},
      ...(state.enabled?[
        {title:'Retry delivery now',value:'retry',description:'Try one eligible pending event; retry limits still apply'},
        {title:'Recover interrupted queue',value:'recover',description:'Recover a stopped writer; never take over a live writer'},
        {title:'Discard pending events',value:'discard',description:'Remove queued metadata for this project after approval'},
      ]:[]),
    ]});if(!action||closed)return;
    const result=action==='status'?state:await call('lifecycle',{...input,action});
    if(!closed)await alert('Lifecycle delivery',JSON.stringify(result,null,2));
  }
  async function menu() {
    const choice=await ctx.ui.dialog.select({title:'Kujo',options:[
      {title:'Status and capabilities',value:'status',description:'See what is installed and available'},
      {title:'Choose a profile',value:'profile',description:'Essentials, Build, Review, Ship, or Full'},
      {title:'Manage individual capabilities',value:'capabilities',description:'Enable, disable, or restore profile defaults'},
      {title:'Choose a specialist',value:'specialist',description:'Understand, Build, Review, Browser, Workflow, or Ship'},
      {title:'Lifecycle delivery',value:'lifecycle',description:'Opt in to local Watchdog metadata and manage pending delivery'},
      {title:'Evidence history',value:'evidence',description:'Inspect actual operation receipts'},
    ]});
    if(closed)return;
    if(choice==='lifecycle')await lifecycle();else if(choice==='capabilities')await capabilities();else if(choice==='status')await status();else if(choice==='profile')await profile();else if(choice==='evidence')await evidence();else if(choice==='specialist')await specialist();
  }
  const safe=fn=>async()=>{if(closed)return;try{await fn();}catch(error){await alert('Kujo needs attention',`${error.message}\n\nRun kujo-opencode doctor in this project. If the native plugin is missing, run setup or repair.`);}};
  ctx.keymap.layer(()=>({mode:'global',commands:[
    {id:'kujo.menu',title:'Open Kujo',group:'Kujo',palette:true,slash:{name:'kujo'},run:safe(menu)},
    {id:'kujo.status',title:'Kujo status',group:'Kujo',palette:true,run:safe(status)},
    {id:'kujo.profile',title:'Choose Kujo profile',group:'Kujo',palette:true,run:safe(profile)},
    {id:'kujo.capabilities',title:'Manage Kujo capabilities',group:'Kujo',palette:true,run:safe(capabilities)},
    {id:'kujo.specialist',title:'Choose Kujo specialist',group:'Kujo',palette:true,run:safe(specialist)},
    {id:'kujo.lifecycle',title:'Kujo lifecycle delivery',group:'Kujo',palette:true,run:safe(lifecycle)},
    {id:'kujo.evidence',title:'Kujo evidence history',group:'Kujo',palette:true,run:safe(evidence)},
  ]}));
  return ()=>{closed=true;};
}
