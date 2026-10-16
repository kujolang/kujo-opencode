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
    const result=await call('evidence');
    if(!result.ok) throw new Error(result.receipt?.error?.message || 'Receipt query failed');
    if(closed) return;
    const receipts=result.receipt?.result?.receipts || [];
    if(!receipts.length) return alert('Kujo evidence','No receipts recorded yet. Run a Kujo repository check to create evidence.');
    const id=await ctx.ui.dialog.select({title:'Recent Kujo evidence (shared local ledger)',options:receipts.map(item=>({title:`${item.status}: ${item.ability_id}`,value:item.receipt_id,description:item.receipt_id}))});
    const selected=receipts.find(item=>item.receipt_id===id);
    if(selected) await alert('Kujo receipt',JSON.stringify(selected,null,2));
  }
  async function menu() {
    const choice=await ctx.ui.dialog.select({title:'Kujo',options:[
      {title:'Status and capabilities',value:'status',description:'See what is installed and available'},
      {title:'Choose a profile',value:'profile',description:'Essentials, Build, Review, Ship, or Full'},
      {title:'Manage individual capabilities',value:'capabilities',description:'Enable, disable, or restore profile defaults'},
      {title:'Choose a specialist',value:'specialist',description:'Understand, Build, Review, Browser, Workflow, or Ship'},
      {title:'Evidence history',value:'evidence',description:'Inspect actual operation receipts'},
    ]});
    if(closed)return;
    if(choice==='capabilities')await capabilities();else if(choice==='status')await status();else if(choice==='profile')await profile();else if(choice==='evidence')await evidence();else if(choice==='specialist')await specialist();
  }
  const safe=fn=>async()=>{if(closed)return;try{await fn();}catch(error){await alert('Kujo needs attention',`${error.message}\n\nRun kujo-opencode doctor in this project. If the native plugin is missing, run setup or repair.`);}};
  ctx.keymap.layer(()=>({mode:'global',commands:[
    {id:'kujo.menu',title:'Open Kujo',group:'Kujo',palette:true,slash:{name:'kujo'},run:safe(menu)},
    {id:'kujo.status',title:'Kujo status',group:'Kujo',palette:true,run:safe(status)},
    {id:'kujo.profile',title:'Choose Kujo profile',group:'Kujo',palette:true,run:safe(profile)},
    {id:'kujo.capabilities',title:'Manage Kujo capabilities',group:'Kujo',palette:true,run:safe(capabilities)},
    {id:'kujo.specialist',title:'Choose Kujo specialist',group:'Kujo',palette:true,run:safe(specialist)},
    {id:'kujo.evidence',title:'Kujo evidence history',group:'Kujo',palette:true,run:safe(evidence)},
  ]}));
  return ()=>{closed=true;};
}
