import {realpath} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';

// Keep the canonical runtime untouched. Separate execution state while retaining
// its shared receipt writer/lock so rotation is serialized across all projects.
export async function projectState(FileAbilityState,{project,home}) {
 const root=await realpath(project);
 const key=createHash('sha256').update(root).digest('hex');
 const shared=new FileAbilityState({statePath:home.state,receiptsPath:home.receipts});
 class ProjectState extends FileAbilityState {
  async appendReceipt(receipt){
   receipt.metadata={...receipt.metadata,project_root:root};
   return shared.appendReceipt(receipt);
  }
  async executionGate(options){
   // Existing keys must not become fresh work simply because storage changed.
   // Read under the legacy writer's lock; never copy approval grants across.
   return shared.idempotencyTransaction(options.scope,async legacy=>{
    const existing=await super.idempotencyTransaction(options.scope,record=>({value:Boolean(record)}));
    if(existing)return {value:await super.executionGate(options)};
    if(legacy){
     const owner=legacy.receipt?.metadata?.project_root;
     if(!owner||legacy.state!=='completed')throw Object.assign(new Error('Legacy idempotency outcome is unresolved or has no project attribution. Inspect retained evidence before deliberately starting a new operation with a new key.'),{code:'kujo_legacy_outcome_unresolved'});
     if(owner===root)return {value:legacy.requestDigest!==options.requestDigest?{state:'conflict'}:{state:'replay',receipt:legacy.receipt}};
    }
    return {value:await super.executionGate(options)};
   });
  }
 }
 return new ProjectState({statePath:join(home.root,'projects',key,'state.json'),receiptsPath:home.receipts});
}
