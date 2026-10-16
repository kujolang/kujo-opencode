const common=['kujo.ability.catalog.list','kujo.ability.receipts.list'];
export const specialists=[
 {id:'kujo-understand',title:'Understand',profile:'review',description:'Map a repository and assemble scoped context with evidence.',abilities:['kujo.scout.repository.inspect','kujo.scent.context.pack','kujo.spec.contract.validate'],workflow:'Discover the active catalog. Inspect the smallest relevant repository scope with Scout, then build a task-specific Scent context pack if needed. Cite artifacts and receipts. Distinguish measured facts, heuristics and missing coverage.'},
 {id:'kujo-build',title:'Build',profile:'build',description:'Check Kujo source, preview formatting and validate package declarations.',abilities:['kujo.opencode.source.inspect','kujo.opencode.source.format','kujo.kennel.project.validate','kujo.spec.contract.validate'],workflow:'Clarify the target file and acceptance criteria. Inspect source and preview formatting with the native source tools. Report file diagnostics and the inspected digest. Single-file checks do not establish import or runtime correctness. Do not imply source run/test or starter creation exists until those capabilities appear in the active catalog.'},
 {id:'kujo-review',title:'Review',profile:'review',description:'Review changes, architecture, contracts and artifact drift.',abilities:['kujo.patchbrief.changes.summarize','kujo.changebucket.changes.measure','kujo.fence.architecture.check','kujo.spec.contract.validate','kujo.concord.artifacts.scan','kujo.dossier.records.validate','kujo.dossier.records.report'],workflow:'Start with PatchBrief and ChangeBucket to identify the changed scope. Apply only relevant Fence, Spec, Concord or Dossier checks. Rank actionable findings, cite supporting evidence and state checks not run. Do not change source or manufacture review approval.'},
 {id:'kujo-browser',title:'Browser verification',profile:'ship',description:'Validate Lens flows and verify a requested page with retained browser evidence.',abilities:['kujo.lens.flow.validate','kujo.lens.page.check','kujo.casefile.failure.capture'],workflow:'Establish the requested URL and flow. Validate the flow, then use Lens page verification when browser dependencies are ready. If missing, tell the human to run kujo-opencode browser install. External URLs need explicit allow_external and normal approval. Report actual browser artifacts and failures; never substitute static reasoning for a browser pass.'},
 {id:'kujo-workflow',title:'Workflow operation',profile:'full',description:'Validate and operate explicit Dispatch or Muzzle workflows.',abilities:['kujo.dispatch.workflow.validate','kujo.dispatch.workflow.run','kujo.muzzle.workflow.run','kujo.runledger.runs.start','kujo.runledger.runs.finish','kujo.runledger.runs.report','kujo.casefile.failure.capture'],workflow:'Identify the explicit workflow and task. Validate first where supported. Request normal approval for execution, retain run identifiers and receipts, and report failures precisely. After an uncertain or lost response inspect evidence before considering retry. Never automatically repeat a mutating workflow or approve its checkpoints.'},
 {id:'kujo-ship',title:'Ship readiness',profile:'ship',description:'Gather release-readiness and evaluation evidence without publishing.',abilities:['kujo.shipcheck.repository.scan','kujo.eval.suite.run','kujo.runledger.runs.start','kujo.runledger.runs.finish','kujo.runledger.runs.report','kujo.versionseal.records.validate','kujo.casefile.failure.capture'],workflow:'Run the informational ShipCheck scan, then only the explicitly requested Eval suite with normal approval. Correlate available RunLedger evidence. Distinguish a metadata scan from executed checks. Report unverified requirements and failing gates. This specialist cannot publish, push, release or silently approve shipping.'},
].map(item=>({...item,abilities:[...common,...item.abilities]}));

export function assertSpecialistAbility(agent,ability){
 const specialist=specialists.find(item=>item.id===agent);
 if(specialist&&!specialist.abilities.includes(ability))throw Object.assign(new Error(`${specialist.title} cannot use ${ability}; choose the appropriate Kujo specialist.`),{code:'kujo_specialist_scope'});
}
export function specialistStatus(catalog,active){
 const visible=new Set(active.map(item=>item.definition.id));
 return specialists.map(item=>({...item,available:item.abilities.filter(id=>visible.has(id)),missing:item.abilities.filter(id=>!visible.has(id))}));
}
export function specialistMarkdown(specialist,catalog){
 const tools=catalog.abilities.filter(item=>specialist.abilities.includes(item.definition.id)).map(item=>item.tool.name);
 const permissions=[{action:'*',resource:'*',effect:'deny'},...tools.map(action=>({action,resource:'*',effect:'allow'})),{action:'skill',resource:'kujo-*',effect:'allow'},{action:'question',resource:'*',effect:'allow'},{action:'kujo.profile.change',resource:'*',effect:'ask'},{action:'kujo.capability.change',resource:'*',effect:'ask'},{action:'kujo.ability.approve',resource:'*',effect:'ask'}];
 return `---\ndescription: ${JSON.stringify(specialist.description)}\nmode: all\nsteps: 12\npermissions: ${JSON.stringify(permissions)}\n---\n\n${specialist.workflow}\n\nUse only these native Kujo tools: ${tools.join(', ')}. Their active exposure is controlled separately by the human's profile. Start with kujo_ability_catalog; do not bypass a missing capability with shell, arbitrary code, another agent, network calls or an MCP fallback. Ask the human to select the appropriate profile in /kujo when required. A declined operation is a stop, not a reason to retry with different inputs. All write, execution and external effects retain request-bound human approval. Finish with evidence, limitations and the next concrete action.\n`;
}

export function scopeSpecialistTools(event,catalog){
 const specialist=specialists.find(item=>item.id===event.agent);if(!specialist)return;
 const allowed=new Set(catalog.abilities.filter(item=>specialist.abilities.includes(item.definition.id)).map(item=>item.tool.name));
 allowed.add('question');allowed.add('skill');
 for(const name of Object.keys(event.tools))if(!allowed.has(name))delete event.tools[name];
}

export function specialistCapabilities(agent,items){
 const specialist=specialists.find(item=>item.id===agent);
 return specialist?items.filter(item=>specialist.abilities.includes(item.definition.id)):items;
}
