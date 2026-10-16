import { randomUUID } from 'node:crypto';
import { realpath } from 'node:fs/promises';
import { createApp, loadProjectConfig } from './app.mjs';
import { principal } from './approvals.mjs';
import { profileAbilities } from './catalog.mjs';
import { projectSkills } from './install.mjs';
import { writeJson } from './io.mjs';

const APPROVE = 'kujo.ability.approve';
const PROFILE = 'kujo.profile.change';

// Plugin.define in @opencode/plugin@2.0.31 is an identity helper. A plain
// definition avoids shipping the host SDK and its dependency tree at runtime.
/** @type {import('@opencode/plugin').Plugin.Plugin} */
export default { id:'kujo.opencode', setup:setupPlugin };

export async function setupPlugin(ctx, { openApp = createApp } = {}) {
  const project = await realpath(ctx.location.directory);
  let app = await openApp(project);
  const registrations = [];
  let disposed = false;
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
  const cleanup = async () => {
    disposed = true;
    for (const registration of registrations.reverse()) await registration.dispose();
  };
  try {
    registrations.push(await ctx.permission.hook('evaluate', event => {
      if (event.action === APPROVE || event.action === PROFILE) {
        event.effect = 'ask';
        event.message = 'Review this exact Kujo operation. Approval applies once; no standing permission is granted.';
      }
    }));
    registrations.push(await ctx.tool.transform(editor => {
      // Capture the exposed identities for this host model-request snapshot.
      for (const item of app.runtime.describe()) editor.add({
        name:item.tool.name, description:item.tool.description,
        input:item.definition.input_schema, options:{codemode:false},
        execute:async (input, context) => {
          const session = await sessionAtProject(context.sessionID);
          context.signal.throwIfAborted();
          const current = await openApp(project);
          const active = current.runtime.describe().find(candidate => candidate.definition.id === item.definition.id);
          if (!active || active.definitionDigest !== item.definitionDigest) throw new Error('Kujo capability changed; refresh tools before retrying');
          const controls = {principal,host:'opencode',surface:'plugin',invocationId:randomUUID(),idempotencyKey:randomUUID(),sessionId:context.sessionID,agentId:context.agent,...(session.model ? {modelId:`${session.model.providerID}/${session.model.id}`} : {})};
          let result = await current.runtime.execute({abilityId:item.definition.id,input,controls,signal:context.signal});
          if (result.code === 'ability_approval_required') {
            await ctx.permission.assert({sessionID:context.sessionID,agent:context.agent,action:APPROVE,resources:[controls.invocationId],save:[],source:{type:'tool',messageID:context.messageID,id:context.id},metadata:{project,ability:item.definition.id,digest:item.definitionDigest,input,effects:item.definition.effects,invocation:controls.invocationId}});
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
        const result=await current.runtime.execute({abilityId:'kujo.ability.receipts.list',input:{limit:10},controls:{principal,host:'opencode',surface:'plugin',sessionId:sessionID}});
        await say(sessionID,JSON.stringify(result,null,2));
      }});
      editor.add({name:'kujo-profile',description:'Select essentials, review, ship or full and refresh native tools',execute:async ({sessionID,prompt})=>{
        await sessionAtProject(sessionID);
        const name=prompt.text.trim(); const profile=`kujo.profile.${name}`;
        profileAbilities(app.catalog,profile);
        await ctx.permission.assert({sessionID,action:PROFILE,resources:[randomUUID()],save:[],metadata:{project,profile}});
        await sessionAtProject(sessionID);
        const {config,projectConfig,paths}=await loadProjectConfig(project);
        await writeJson(paths.config,{...projectConfig,profile});
        await projectSkills(app.catalog,{...config,profile},project);
        app=await openApp(project);
        await ctx.tool.reload(); await ctx.skill.reload();
        await say(sessionID,`Kujo profile: ${name}. Native tools refreshed.`);
      }});
    }));
    return cleanup;
  } catch(error) { await cleanup(); throw error; }
}
