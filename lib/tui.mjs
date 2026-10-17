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
  async function knowledge() {
    const route=ctx.ui.router.current();if(route.type!=='session')return alert('Open a session','Choose a project session before managing local knowledge.');
    const name=await ctx.ui.dialog.prompt({title:'Knowledge index name',value:'default'});if(!name||closed)return;
    const input={sessionID:route.sessionID,name};
    const action=await ctx.ui.dialog.select({title:'Offline project knowledge',options:[
      {title:'Check freshness',value:'status',description:'Compare reviewed corpus files with the current project'},
      {title:'Preview and rebuild',value:'preview',description:'Review Markdown, text and Kujo files; index locally after approval'},
      {title:'Ask a question',value:'query',description:'Query a current index and inspect canonical citations'},
      {title:'Recover interrupted indexing',value:'recover',description:'Restore a stopped installation after approval; refuses live owners'},
    ]});if(!action||closed)return;
    let result;
    if(action==='preview'){
      const path=await ctx.ui.dialog.prompt({title:'Corpus directory within this project',value:'docs'});if(!path||closed)return;
      const preview=await call('knowledge',{...input,action,path});if(closed)return;
      await alert('Review knowledge corpus',`${preview.files.length} files · ${preview.bytes} bytes\nOffline hash embeddings; no model provider.\nExcluded: ${preview.exclusions.join(', ')}\n\n${preview.files.map(file=>file.path).join('\n')}\n\nDigest: ${preview.digest}`);if(closed)return;
      const choice=await ctx.ui.dialog.select({title:'Build this reviewed index?',options:[{title:'Build after permission',value:'index',description:'Replaces this named managed index; preserves the old index on failure'},{title:'Keep preview only',value:'cancel'}]});if(choice!=='index'||closed)return;
      result=await call('knowledge',{sessionID:route.sessionID,action:'index',...preview.index_input});
    }else if(action==='query'){
      const question=await ctx.ui.dialog.prompt({title:'Question for this corpus'});if(!question||closed)return;result=await call('knowledge',{...input,action,question});
    }else result=await call('knowledge',{...input,action});
    if(closed)return;
    const receipt=result.receipt_id?`\n\nReceipt: ${result.receipt_id}`:'';
    if(action==='query'){
      const answer=result.result||{};
      const citations=(answer.citations||[]).slice(0,12).map(c=>`${result.citation_root}/${String(c.path||'').replace(/^corpus\//,'')}:${c.line_start||1}\n${c.snippet||''}`).join('\n\n');
      return alert('Knowledge answer',`${answer.answer||'No answer returned.'}\n\n${citations||'No citations returned.'}${receipt}`.slice(0,16000));
    }
    const messages={missing:'No index exists. Choose Preview and rebuild.',current:'The reviewed corpus is current at this check.',stale:'The corpus has changed or is unavailable. Review a new preview before rebuilding.',indexed:'The reviewed corpus was indexed locally.'};
    await alert('Knowledge result',`${messages[result.state]||'Recovery finished. Check freshness before querying.'}${result.summary?`\n${result.summary.documents} documents · ${result.summary.chunks} chunks`:''}${receipt}`);
  }
  async function browser() {
    const route=ctx.ui.router.current();
    if(route.type!=='session')return alert('Open a session','Choose a project session before checking browser readiness.');
    const input={sessionID:route.sessionID};const state=await call('browser',{...input,action:'status'});if(closed)return;
    const labels={setup_busy_or_interrupted:'Another browser setup is active or needs recovery',ready:'Chromium launched successfully',dependencies_missing:'Lens bridge dependencies are missing',launch_failed:'Chromium could not launch',probe_failed:'Readiness check failed; verify Node is available',installing:`Installing: ${state.phase||'starting'}`,cancelled:'Installation was cancelled',failed:'Installation failed; check connectivity or operating-system dependencies'};
    const action=await ctx.ui.dialog.select({title:labels[state.state]||'Browser readiness',options:[
      {title:'Check readiness again',value:'refresh',description:'Launch and close Chromium without opening a website'},
      ...(state.state==='installing'?[{title:'Cancel installation',value:'cancel',description:'Stop this installation; inspect readiness before retrying'}]:[{title:state.ready?'Repair browser dependencies':'Install browser dependencies',value:'install',description:'Install pinned Lens packages and download Chromium after approval'}]),
      ...(state.state!=='installing'?[{title:'Recover interrupted setup',value:'recover',description:'Restore prior dependencies after a stopped installer; live owners are never taken over'}]:[]),
      ...(state.ready&&!(state.capabilities||[]).includes('kujo.lens.page.check')?[{title:'Enable page verification',value:'enable',description:'Expose the canonical Lens page check; verification still requires approval'}]:[]),
      ...(state.ready?[{title:'Choose Browser specialist',value:'specialist',description:'Use the guided Lens verification agent'}]:[]),
    ]});if(!action||closed)return;
    if(action==='enable'){
      await call('capability',{sessionID:route.sessionID,ability:'kujo.lens.page.check',mode:'enabled'});
      return alert('Page verification enabled','Choose the Browser specialist in /kujo and provide a running local URL.');
    }
    if(action==='specialist'){
      await call('specialist',{sessionID:route.sessionID,agent:'kujo-browser'});
      return alert('Browser specialist selected','Provide a running local URL and describe what to verify. Use the Ship profile for flow validation and failure evidence. Browser readiness does not certify your page.');
    }
    const result=await call('browser',{...input,action});if(closed)return;
    await alert('Browser readiness',action==='recover'?'Recovery finished. Check readiness before deciding whether to install again.':result.state==='installing'?'Installation started. Reopen Browser readiness to see progress or cancel.':result.ready?'Chromium launched successfully. Choose the Browser specialist and provide a running local URL.':result.state==='cancelled'?'Installation stopped. Check readiness before retrying.':'Chromium is not ready. Check Node/npm availability, download connectivity and operating-system browser dependencies.');
  }
  async function runledger() {
    const route=ctx.ui.router.current();
    if(route.type!=='session')return alert('Open a session','Choose a project session before managing its RunLedger record.');
    const input={sessionID:route.sessionID};
    const state=await call('runledger',{...input,action:'status'});if(closed)return;
    const action=await ctx.ui.dialog.select({title:`Session RunLedger · ${state.state}`,options:[
      {title:'Inspect record',value:'status',description:'Canonical record, selected model, git snapshots and human verdict'},
      ...(state.state==='not_started'?[{title:'Start tracking this session',value:'start',description:'Capture initial git state after approval; no prompt text is stored'}]:[]),
      ...(state.run_id?[{title:'Link this session’s Watchdog trace',value:'correlate',description:'Record the stable trace identifier after approval; does not enable telemetry'}]:[]),
      ...(state.state==='in_progress'?[{title:'Finish this session run',value:'finish',description:'Choose your verdict and approve the final git snapshot'}]:[]),
    ]});if(!action||closed)return;
    let status;
    if(action==='finish'){
      status=await ctx.ui.dialog.select({title:'Your verdict for this session',options:[
        {title:'Partial',value:'partial',description:'Useful progress, with work still remaining'},
        {title:'Pass',value:'pass',description:'You verified the intended result'},
        {title:'Fail',value:'fail',description:'The intended result was not achieved'},
        {title:'Abandoned',value:'abandoned',description:'The attempt was stopped without completion'},
      ]});if(!status||closed)return;
    }
    const result=action==='status'?state:await call('runledger',{...input,action,...(status?{status}:{})});
    if(!closed)await alert('Session RunLedger',JSON.stringify(result,null,2).slice(0,16000));
  }
  async function lifecycle() {
    const route=ctx.ui.router.current();
    if(route.type!=='session')return alert('Open a session','Choose a project session before managing lifecycle delivery.');
    const input={sessionID:route.sessionID};
    const state=await call('lifecycle',{...input,action:'status'});if(closed)return;
    const action=await ctx.ui.dialog.select({title:`Lifecycle delivery · ${state.enabled?'on':'off'}`,options:[
      {title:state.enabled?'Disable delivery':'Enable local Watchdog delivery',value:state.enabled?'disable':'enable',description:'Metadata only. No prompts, tool content or credentials are stored.'},
      {title:state.intervention?.enabled?'Disable failure guard':'Enable failure guard',value:state.intervention?.enabled?'disable_guard':'enable_guard',description:'Pause once after three consecutive same-tool failures in five minutes; no automatic retry'},
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
      {title:'Local knowledge',value:'knowledge',description:'Preview, index, check freshness and query an offline corpus'},
      {title:'Browser readiness',value:'browser',description:'Verify Chromium, install dependencies or choose the Browser specialist'},
      {title:'Session RunLedger',value:'runledger',description:'Start, inspect and finish a session-linked canonical run'},
      {title:'Lifecycle delivery',value:'lifecycle',description:'Opt in to local Watchdog metadata and manage pending delivery'},
      {title:'Evidence history',value:'evidence',description:'Inspect actual operation receipts'},
    ]});
    if(closed)return;
    if(choice==='knowledge')await knowledge();else if(choice==='browser')await browser();else if(choice==='runledger')await runledger();else if(choice==='lifecycle')await lifecycle();else if(choice==='capabilities')await capabilities();else if(choice==='status')await status();else if(choice==='profile')await profile();else if(choice==='evidence')await evidence();else if(choice==='specialist')await specialist();
  }
  const safe=fn=>async()=>{if(closed)return;try{await fn();}catch(error){await alert('Kujo needs attention',`${error.message}\n\nRun kujo-opencode doctor in this project. If the native plugin is missing, run setup or repair.`);}};
  ctx.keymap.layer(()=>({mode:'global',commands:[
    {id:'kujo.menu',title:'Open Kujo',group:'Kujo',palette:true,slash:{name:'kujo'},run:safe(menu)},
    {id:'kujo.status',title:'Kujo status',group:'Kujo',palette:true,run:safe(status)},
    {id:'kujo.profile',title:'Choose Kujo profile',group:'Kujo',palette:true,run:safe(profile)},
    {id:'kujo.capabilities',title:'Manage Kujo capabilities',group:'Kujo',palette:true,run:safe(capabilities)},
    {id:'kujo.specialist',title:'Choose Kujo specialist',group:'Kujo',palette:true,run:safe(specialist)},
    {id:'kujo.knowledge',title:'Kujo local knowledge',group:'Kujo',palette:true,run:safe(knowledge)},
    {id:'kujo.browser',title:'Kujo browser readiness',group:'Kujo',palette:true,run:safe(browser)},
    {id:'kujo.runledger',title:'Kujo session RunLedger',group:'Kujo',palette:true,run:safe(runledger)},
    {id:'kujo.lifecycle',title:'Kujo lifecycle delivery',group:'Kujo',palette:true,run:safe(lifecycle)},
    {id:'kujo.evidence',title:'Kujo evidence history',group:'Kujo',palette:true,run:safe(evidence)},
  ]}));
  return ()=>{closed=true;};
}
