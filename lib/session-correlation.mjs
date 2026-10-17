import {sessionLedgerStatus} from './session-runledger.mjs';
import {lifecycleTraceID} from './lifecycle-outbox.mjs';
// This cache retains identifiers only. Canonical RunLedger remains authoritative;
// no record is created, linked, or finalized by telemetry observation.
export class SessionCorrelation {
 constructor({project,openApp,inspect=sessionLedgerStatus,now=Date.now,ttl=5000}){Object.assign(this,{project,openApp,inspect,now,ttl});this.entries=new Map();}
 invalidate(sessionID){this.entries.delete(sessionID);}
 async resolve(sessionID,signal){
  signal?.throwIfAborted();const cached=this.entries.get(sessionID);if(cached&&cached.until>this.now())return cached.promise;
  if(this.entries.size>=128&&!this.entries.has(sessionID))this.entries.delete(this.entries.keys().next().value);
  const entry={until:this.now()+this.ttl};
  entry.promise=(async()=>{try{const app=await this.openApp(this.project);const lookupSignal=AbortSignal.any([signal,AbortSignal.timeout(1500)].filter(Boolean));const record=await this.inspect({app,project:this.project,sessionID,signal:lookupSignal});signal?.throwIfAborted();return record.record?.correlation?.watchdog_trace_id===lifecycleTraceID(this.project,sessionID)?record.run_id:undefined;}catch{return undefined;}})();
  this.entries.set(sessionID,entry);return entry.promise;
 }
 clear(){this.entries.clear();}
}
