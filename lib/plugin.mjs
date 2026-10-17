import {assertToolPermission} from './tool-permission.mjs';
import {serviceStatus} from './service-status.mjs';
import {SessionCorrelation} from './session-correlation.mjs';
import {manageKnowledge} from './knowledge-control.mjs';
import {BrowserSetup} from './browser-setup.mjs';
import {manageSessionLedger} from './session-runledger.mjs';
import {startLifecycle,lifecycleConfig} from './lifecycle-host.mjs';
import {compareReceipts,queryEvidence,evidenceSummary,artifactReferences,previewArtifact} from './evidence.mjs';
import { assertSpecialistAbility, specialistStatus, specialists, scopeSpecialistTools } from "./specialists.mjs";
import { KujoControl } from "./plugin-rpc.mjs";
import { scopedHostContext } from "./plugin-scope.mjs";
import { homePaths, withDataRoot } from "./paths.mjs";
import { randomUUID } from 'node:crypto';
import { realpath } from 'node:fs/promises';
import { createApp, loadProjectConfig } from './app.mjs';
import { principal } from './approvals.mjs';
import { profileAbilities } from './catalog.mjs';
import { activateProject } from './install.mjs';

const APPROVE = 'kujo.ability.approve';
const PROFILE = 'kujo.profile.change';
const BROWSER = 'kujo.browser.setup';
const SESSION_LEDGER = 'kujo.runledger.session';
const LIFECYCLE = 'kujo.lifecycle.change';
const CAPABILITY = 'kujo.capability.change';

// Plugin.define in @opencode/plugin@2.0.31 is an identity helper. A plain
// definition avoids shipping the host SDK and its dependency tree at runtime.
/** @type {import('@opencode/plugin').Plugin.Plugin} */
export default { id:'kujo.opencode', setup:setupPlugin };

export async function setupPlugin(ctx, { openApp = createApp, dataRoot = homePaths().root } = {}) {
  const scope = callback => (...args) => withDataRoot(dataRoot, () => callback(...args));
  return scope(() => setupScopedPlugin(scopedHostContext(ctx, scope), openApp))();
}

async function setupScopedPlugin(ctx, openApp) {
  const project = await realpath(ctx.location.directory);
  let app = await openApp(project);
  const registrations = [];
  const operations=new AbortController();
  const browserSetup=new BrowserSetup();
  let disposed = false;
  let lifecycle,control;
  const correlation=new SessionCorrelation({project,openApp});
  let lifecycleChange=Promise.resolve();
  async function sessionLedger(input,{signal=operations.signal,current=async()=>true}={}) {
    correlation.invalidate(input.sessionID);
    try{return await manageSessionLedger({...input,project,openApp,sessionAtProject,signal,approve:async metadata=>{
      const session=await sessionAtProject(metadata.sessionID);
      if(!await current())throw Error('Session tracking configuration changed');
      await ctx.permission.assert({sessionID:metadata.sessionID,agent:session.agent,action:SESSION_LEDGER,resources:[randomUUID()],save:[],metadata:{project,...metadata,...(input.uiRequestID?{ui_request_id:input.uiRequestID}:{})}});
      if(!await current())throw Error('Session tracking configuration changed during approval');
    }});}finally{correlation.invalidate(input.sessionID);}
  }
  async function refreshLifecycle(config) {
    await lifecycle?.close();
    if(disposed)return;
    lifecycle=await startLifecycle({ctx,home:homePaths().root,project,version:app.config.version,config,
      onFinish:async sessionID=>{if(!disposed)await control?.events.emit('completion',{sessionID});},
      manageLedger:({signal,...input})=>sessionLedger(input,{signal,current:async()=>JSON.stringify(lifecycleConfig((await loadProjectConfig(project)).projectConfig.lifecycle))===JSON.stringify(lifecycleConfig(config))}),
      resolveRun:(sessionID,signal)=>correlation.resolve(sessionID,signal),sessionAtProject,isCurrent:async settings=>JSON.stringify(lifecycleConfig((await loadProjectConfig(project)).projectConfig.lifecycle))===JSON.stringify(settings)});
    if(disposed)await lifecycle.close();
  }
  function manageLifecycle(input) {
    const operation=async()=>{
      await sessionAtProject(input.sessionID);
      if(input.action==='status')return lifecycle.status();
      if(!['enable','disable','enable_guard','disable_guard','enable_tracking','disable_tracking','recover_tracking','reset_tracking','retry','recover','discard'].includes(input.action))throw Error('Unknown lifecycle action');
      const {config,projectConfig}=await loadProjectConfig(project);
      const current=lifecycleConfig(projectConfig.lifecycle);
      if(input.action==='enable_tracking'){const active=(await openApp(project)).runtime.describe();if(!['kujo.runledger.runs.start','kujo.runledger.runs.finish'].every(id=>active.some(item=>item.definition.id===id)))return {...await lifecycle.status(),code:'tracking_capabilities_missing',message:'Choose Ship or Full, or enable RunLedger start and finish, before automatic tracking'};}
      const changing=['enable','disable','enable_guard','disable_guard','enable_tracking','disable_tracking'].includes(input.action);
      const next=changing?lifecycleConfig({...current,...(['enable','disable'].includes(input.action)?{enabled:input.action==='enable',url:input.url??current.url}:['enable_tracking','disable_tracking'].includes(input.action)?{runledger:input.action==='enable_tracking'}:{intervention:input.action==='enable_guard'})}):current;
      await ctx.permission.assert({sessionID:input.sessionID,action:LIFECYCLE,resources:[randomUUID()],save:[],metadata:{project,...(input.uiRequestID?{ui_request_id:input.uiRequestID}:{}),action:input.action,lifecycle:next,content:'Metadata only; no prompts, tool content or credentials are stored.',retry:'Retry resumes retained events for the configured endpoint with a fresh five-attempt budget; records still expire after 24 hours.',tracking:'Opt-in: request approval before the first model request starts a RunLedger record, once per session. Remind at idle/interruption to choose a human verdict. Reset clears request markers only and permits new requests; canonical run records are preserved.',intervention:'When enabled: pause once per session after three consecutive same-tool failures within five minutes. No retry or approval. Up to 128 sessions per plugin activation.'}});
      await sessionAtProject(input.sessionID);
      if(changing){
        await activateProject(app.catalog,{...config,lifecycle:next},project,{...projectConfig,lifecycle:next},{expectedConfig:projectConfig});
        await refreshLifecycle(next);
        return lifecycle.status();
      }
      const latest=(await loadProjectConfig(project)).projectConfig;
      if(JSON.stringify(latest)!==JSON.stringify(projectConfig))throw Error('Lifecycle configuration changed during approval; retry');
      if(['recover_tracking','reset_tracking'].includes(input.action)){await lifecycle.close();try{return await lifecycle[input.action]();}finally{await refreshLifecycle(current);}}
      if(!current.enabled)throw Error('Enable lifecycle delivery before managing its queue');
      if(input.action==='retry')return lifecycle.retry();
      // Stop delivery before recovery/discard so an in-flight request cannot
      // continue after the human's queue action has returned.
      await lifecycle.close();
      try{return await lifecycle[input.action]();}finally{await refreshLifecycle(current);}
    };
    // Read-only status must remain available while a mutation awaits a human.
    if(input.action==='status')return operation();
    const result=lifecycleChange.then(operation,operation);lifecycleChange=result.catch(()=>{});return result;
  }
  async function sessionAtProject(sessionID) {
    if (disposed) throw new Error('Kujo plugin has unloaded');
    const session = await ctx.session.get({sessionID});
    if (!session.location?.directory || await realpath(session.location.directory) !== project) throw new Error('Kujo operation belongs to a different workspace');
    return session;
  }
  async function say(sessionID, text) {
    await sessionAtProject(sessionID);
    await ctx.session.synthetic({sessionID,text,resume:false});
  }
  async function changeProfile(sessionID, name, uiRequestID) {
    await sessionAtProject(sessionID);
    const profile = `kujo.profile.${name}`;
    profileAbilities(app.catalog, profile);
    await ctx.permission.assert({sessionID,action:PROFILE,resources:[randomUUID()],save:[],metadata:{project,profile,...(uiRequestID?{ui_request_id:uiRequestID}:{})}});
    await sessionAtProject(sessionID);
    const {config,projectConfig,paths}=await loadProjectConfig(project);
    await activateProject(app.catalog,{...config,profile},project,{...projectConfig,profile},{expectedConfig:projectConfig});
    app=await openApp(project);
    await ctx.tool.reload(); await ctx.skill.reload();
    return {profile,abilities:app.runtime.describe().length};
  }
  async function changeCapability(sessionID, ability, mode, uiRequestID) {
    await sessionAtProject(sessionID);
    if (!['enabled','disabled','profile'].includes(mode)) throw new Error('Unknown capability mode');
    const current=await openApp(project);
    const item=current.catalog.abilities.find(item=>item.definition.id===ability);
    if(!item)throw new Error('Unknown Kujo capability');
    const {config,projectConfig}=await loadProjectConfig(project);
    const next={...projectConfig,enabled:projectConfig.enabled.filter(id=>id!==ability),disabled:projectConfig.disabled.filter(id=>id!==ability)};
    if(mode!=='profile')next[mode].push(ability);
    await ctx.permission.assert({sessionID,action:CAPABILITY,resources:[randomUUID()],save:[],metadata:{project,...(uiRequestID?{ui_request_id:uiRequestID}:{}),ability,mode,effects:item.definition.effects,profile:projectConfig.profile}});
    await sessionAtProject(sessionID);
    await activateProject(current.catalog,{...config,...next},project,next,{expectedConfig:projectConfig});
    app=await openApp(project);
    await ctx.tool.reload();await ctx.skill.reload();
    return {ability,mode,active:app.runtime.describe().some(item=>item.definition.id===ability),abilities:app.runtime.describe().length};
  }
  async function evidence(input={}) {
    if(disposed)throw Error('Kujo plugin has unloaded');
    const scope=input.scope||'project';
    if(scope==='session')await sessionAtProject(input.sessionID);
    const result=await queryEvidence({path:homePaths().receipts,project,scope,sessionID:input.sessionID,receiptID:input.receiptID});
    return {...result,receipts:result.receipts.map(evidenceSummary)};
  }
  async function evidenceDetail({receiptID,scope='project'}) {
    if(disposed)throw Error('Kujo plugin has unloaded');
    if(!['project','legacy'].includes(scope))throw Error('Unknown receipt scope');
    const result=await queryEvidence({path:homePaths().receipts,project,scope,receiptID,limit:1});
    const receipt=result.receipts[0];if(!receipt)throw Error('Receipt is outside this scope or no longer retained');
    return {receipt,artifacts:scope==='project'?artifactReferences(receipt):[],unscoped:scope==='legacy'};
  }
  const cleanup = async () => {
    disposed = true;
    operations.abort();
    await browserSetup.close();
    await lifecycle?.close();
    for (const registration of registrations.reverse()) await registration.dispose();
  };
  try {
    await refreshLifecycle(app.config.lifecycle);
    registrations.push(await ctx.session.hook('context',event=>scopeSpecialistTools(event,app.catalog)));
    registrations.push(await ctx.permission.hook('evaluate', event => {
      if (event.action === APPROVE || event.action === PROFILE || event.action === CAPABILITY || event.action === LIFECYCLE || event.action === SESSION_LEDGER || event.action === BROWSER) {
        event.effect = 'ask';
        event.message = 'Review this exact Kujo operation. Approval applies once; no standing permission is granted.';
      }
    }));
    registrations.push(await ctx.tool.transform(editor => {
      // Capture the exposed identities for this host model-request snapshot.
      for (const item of app.runtime.describe()) editor.add({
        name:item.tool.name, description:item.tool.description,
        input:item.definition.input_schema, options:{codemode:false,permission:item.tool.name},
        execute:async (input, context) => {
          const session = await sessionAtProject(context.sessionID);
          context.signal.throwIfAborted();
          assertSpecialistAbility(context.agent,item.definition.id);
          const current = await openApp(project);
          const active = current.runtime.describe().find(candidate => candidate.definition.id === item.definition.id);
          if (!active || active.definitionDigest !== item.definitionDigest) throw new Error('Kujo capability changed; refresh tools before retrying');
          const controls = {principal,host:'opencode',surface:'plugin',invocationId:randomUUID(),idempotencyKey:randomUUID(),sessionId:context.sessionID,agentId:context.agent,...(session.model ? {modelId:`${session.model.providerID}/${session.model.id}`} : {})};
          let result = await current.runtime.execute({abilityId:item.definition.id,input,controls,signal:context.signal});
          if (result.code === 'ability_approval_required') {
            await assertToolPermission(ctx.permission,{sessionID:context.sessionID,agent:context.agent,action:APPROVE,resources:[controls.invocationId],save:[],source:{type:'tool',messageID:context.messageID,id:context.id},metadata:{project,title:item.definition.title,ability:item.definition.id,digest:item.definitionDigest,input,effects:item.definition.effects,invocation:controls.invocationId}},context.signal);
            context.signal.throwIfAborted();
            await sessionAtProject(context.sessionID);
            // Revalidate after a potentially long human decision. A profile
            // change must not authorize a now-hidden or changed operation.
            const after = await openApp(project);
            const stillActive = after.runtime.describe().find(candidate => candidate.definition.id === item.definition.id && candidate.definitionDigest === item.definitionDigest);
            if (!stillActive) throw new Error('Kujo capability changed during approval; nothing executed');
            const approval = await after.runtime.requestApproval({abilityId:item.definition.id,input,invocationId:controls.invocationId,principal});
            result = await after.runtime.execute({abilityId:item.definition.id,input,controls:{...controls,approvalId:approval.approval_id},signal:context.signal});
          }
          return {content:JSON.stringify(result),metadata:{receipt_id:result.receipt?.receipt_id,status:result.receipt?.status,ok:result.ok}};
        },
      });
    }));
    registrations.push(await ctx.command.transform(editor => {
      editor.add({name:'kujo-status',description:'Show installed Kujo profile and capabilities without a model call',execute:async ({sessionID})=>{
        await sessionAtProject(sessionID); const current = await openApp(project);
        await say(sessionID,`Kujo: ${current.config.profile}\n${current.runtime.describe().map(item=>item.tool.name).join('\n')}`);
      }});
      editor.add({name:'kujo-evidence',description:'Show recent Kujo receipt summaries',execute:async ({sessionID})=>{
        await sessionAtProject(sessionID); const current=await openApp(project);
        await say(sessionID,JSON.stringify(await evidence({scope:'session',sessionID}),null,2));
      }});
      editor.add({name:'kujo-profile',description:'Select essentials, build, review, ship or full and refresh native tools',execute:async ({sessionID,prompt})=>{
        const name=prompt.text.trim();
        await changeProfile(sessionID,name);
        await say(sessionID,`Kujo profile: ${name}. Native tools refreshed.`);
      }});
    }));
    control=await ctx.rpc.register(KujoControl, {
      completion:async({sessionID})=>{await sessionAtProject(sessionID);return lifecycle.review(sessionID);},
      status:async()=>{
        if(disposed) throw new Error('Kujo plugin has unloaded');
        const current=await openApp(project);
        const active=new Set(current.runtime.describe().map(item=>item.definition.id));
        const inherited=new Set(profileAbilities(current.catalog,current.config.profile).map(item=>item.definition.id));
        const capabilities=current.catalog.abilities.map(item=>({id:item.definition.id,name:item.tool.name,description:item.tool.description,effects:item.definition.effects,active:active.has(item.definition.id),inherited:inherited.has(item.definition.id),mode:current.config.disabled.includes(item.definition.id)?'disabled':current.config.enabled.includes(item.definition.id)?'enabled':'profile'}));
        return {project,capabilities,services:serviceStatus(current.runtime.describe()),specialists:specialistStatus(current.catalog,current.runtime.describe()),version:current.config.version,profile:current.config.profile,tools:current.runtime.describe().map(item=>({name:item.tool.name,description:item.tool.description,effects:item.definition.effects})),profiles:current.catalog.profiles.map(profile=>({id:profile.id,label:profile.metadata.label,description:profile.description}))};
      },
      knowledge:async input=>manageKnowledge({...input,project,openApp,sessionAtProject,signal:operations.signal,approve:async metadata=>{const session=await sessionAtProject(metadata.sessionID);await ctx.permission.assert({sessionID:metadata.sessionID,agent:session.agent,action:APPROVE,resources:[randomUUID()],save:[],metadata:{project,...metadata,...(input.uiRequestID?{ui_request_id:input.uiRequestID}:{})}});}}),
      browser:async({sessionID,action,uiRequestID})=>{
        await sessionAtProject(sessionID);const current=await openApp(project),source=current.config.sources.lens;
        if(!source)throw Error('Lens source is missing; run kujo-opencode repair');
        const visible=new Set(current.runtime.describe().map(item=>item.definition.id));const capabilities=current.catalog.abilities.filter(item=>item.source==='lens'&&visible.has(item.definition.id)).map(item=>item.definition.id);
        if(action==='status'||action==='refresh')return {...await (action==='refresh'?browserSetup.refresh(source.path):browserSetup.status(source.path)),capabilities,source_commit:source.commit};
        if(!['install','cancel','recover'].includes(action))throw Error('Unknown browser setup action');
        await ctx.permission.assert({sessionID,action:BROWSER,resources:[randomUUID()],save:[],metadata:{project,...(uiRequestID?{ui_request_id:uiRequestID}:{}),operation:action,source:source.path,commit:source.commit,effects:action==='install'?['Install locked Lens bridge packages with npm','Download Chromium into the browser cache','Launch and close Chromium to verify readiness','Shared browser dependencies may affect other projects']:action==='recover'?['Restore interrupted browser dependency installation; live owners are never taken over']:['Stop this plugin’s active browser installation']}});
        await sessionAtProject(sessionID);const after=await openApp(project);
        if(after.config.sources.lens.path!==source.path||after.config.sources.lens.commit!==source.commit)throw Error('Lens installation changed during approval; retry from current readiness');
        return action==='install'?browserSetup.start(source.path):action==='recover'?browserSetup.recover(source.path):browserSetup.cancel();
      },
      runledger:input=>sessionLedger(input),
      lifecycle:manageLifecycle,
      evidence,
      evidenceDetail,
      compare:async({left,right})=>compareReceipts((await evidenceDetail({receiptID:left})).receipt,(await evidenceDetail({receiptID:right})).receipt),
      artifact:async({receiptID,index})=>{
        const {artifacts}=await evidenceDetail({receiptID});
        if(!Number.isInteger(index)||index<0||index>=artifacts.length)throw Error('Unknown receipt artifact');
        return previewArtifact(project,artifacts[index]);
      },
      specialist:async({sessionID,agent})=>{
        await sessionAtProject(sessionID);
        if(!specialists.some(item=>item.id===agent))throw Error('Unknown Kujo specialist');
        await ctx.session.switchAgent({sessionID,agent});
        return {agent};
      },
      profile:async({sessionID,profile,uiRequestID})=>changeProfile(sessionID,profile,uiRequestID),
      capability:async({sessionID,ability,mode,uiRequestID})=>changeCapability(sessionID,ability,mode,uiRequestID),
    });
    registrations.push(control);
    return cleanup;
  } catch(error) { await cleanup(); throw error; }
}
