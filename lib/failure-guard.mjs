// A deliberately small host intervention policy, never an execution/retry engine.
// All retained values are tool/session IDs, call IDs, counts and timestamps.
export class FailureGuard {
 constructor({enabled=false,interrupt,notify,now=Date.now}){this.enabled=enabled;this.interrupt=interrupt;this.notify=notify;this.now=now;this.sessions=new Map();this.dropped=0;this.closed=false;}
 async observe(event){
  if(!this.enabled||this.closed||!['tool.completed','tool.error'].includes(event.phase)||typeof event.sessionID!=='string'||typeof event.tool!=='string'||typeof event.callID!=='string')return;
  let entry=this.sessions.get(event.sessionID);
  if(!entry){if(this.sessions.size>=128){this.dropped++;return;}entry={tool:null,count:0,last:0,calls:[],intervened:false};this.sessions.set(event.sessionID,entry);}
  if(entry.intervened||entry.calls.includes(event.callID))return;
  entry.calls.push(event.callID);if(entry.calls.length>16)entry.calls.shift();
  if(event.phase==='tool.completed'){entry.count=0;entry.tool=null;return;}
  const now=this.now();entry.count=entry.tool===event.tool&&now-entry.first<=300000?entry.count+1:1;if(entry.count===1)entry.first=now;entry.tool=event.tool;entry.last=now;
  if(entry.count<3)return;
  // Claim once before awaiting the host so overlapping callbacks cannot pause twice.
  entry.intervened=true;entry.outcome='pending';
  try{const result=await this.interrupt(event.sessionID);if(result===false){entry.outcome='cancelled';return;}entry.outcome='paused';if(!this.closed)await this.notify(event.sessionID,'Kujo paused this session after three consecutive failures from the same tool. Inspect /kujo → Evidence history and Session RunLedger before deciding how to continue. No tool was retried and no approval was granted.');}
  catch{entry.outcome='attention';}
 }
 status(){return {enabled:this.enabled,tracked_sessions:this.sessions.size,interventions:[...this.sessions.values()].filter(entry=>entry.intervened).length,attention:[...this.sessions.values()].filter(entry=>entry.outcome==='attention').length,dropped:this.dropped};}
 close(){this.closed=true;}
}
