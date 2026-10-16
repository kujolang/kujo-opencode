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
      {title:'Choose a profile',value:'profile',description:'Essentials, Review, Ship, or Full'},
      {title:'Evidence history',value:'evidence',description:'Inspect actual operation receipts'},
    ]});
    if(closed)return;
    if(choice==='status')await status();else if(choice==='profile')await profile();else if(choice==='evidence')await evidence();
  }
  const safe=fn=>async()=>{if(closed)return;try{await fn();}catch(error){await alert('Kujo needs attention',`${error.message}\n\nRun kujo-opencode doctor in this project. If the native plugin is missing, run setup or repair.`);}};
  ctx.keymap.layer(()=>({mode:'global',commands:[
    {id:'kujo.menu',title:'Open Kujo',group:'Kujo',palette:true,slash:{name:'kujo'},run:safe(menu)},
    {id:'kujo.status',title:'Kujo status',group:'Kujo',palette:true,run:safe(status)},
    {id:'kujo.profile',title:'Choose Kujo profile',group:'Kujo',palette:true,run:safe(profile)},
    {id:'kujo.evidence',title:'Kujo evidence history',group:'Kujo',palette:true,run:safe(evidence)},
  ]}));
  return ()=>{closed=true;};
}
