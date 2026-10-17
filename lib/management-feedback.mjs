import {randomUUID} from 'node:crypto';

const actions={profile:'kujo.profile.change',capability:'kujo.capability.change',lifecycle:'kujo.lifecycle.change',runledger:'kujo.runledger.session',browser:'kujo.browser.setup',knowledge:'kujo.ability.approve'};
export class ManagementDeclined extends Error {}
export class ManagementDismissed extends Error {}

// Display correlation only. This never replies to a permission or changes the
// server assertion. A missing event remains an error, never an inferred decline.
export function managementFeedback() {
  const pending=new Map();
  return {
    begin(method,input,{directory,project,current}) {
      if(!actions[method])return;
      const id=randomUUID();
      let wake;
      const decision=new Promise(resolve=>{wake=resolve;});
      const item={id,sessionID:input.sessionID,action:actions[method],directory,project,current,wake};
      pending.set(id,item);
      return {id,async failure(error) {
        if(!current())throw new ManagementDismissed();
        // Host permission and RPC transports can settle in either order.
        if(!item.reply){let timer;try{await Promise.race([decision,new Promise(resolve=>{timer=setTimeout(resolve,250);})]);}finally{clearTimeout(timer);}}
        if(!current())throw new ManagementDismissed();
        if(item.reply==='reject')throw new ManagementDeclined('No permission was granted for this request.');
        throw error;
      },finish(){pending.delete(id);wake();}};
    },
    asked(event) {
      const request=event.data,item=pending.get(request.metadata?.ui_request_id);
      if(!item||!item.current()||item.requestID||request.sessionID!==item.sessionID||request.action!==item.action||typeof request.metadata?.project!=='string'||(item.project&&request.metadata.project!==item.project))return false;
      if(event.location&&![item.directory,item.project||request.metadata.project].includes(event.location.directory))return false;
      item.project=request.metadata.project;
      item.requestID=request.id;return true;
    },
    replied(event) {
      for(const item of pending.values()) {
        if(!item.current()||!item.requestID||item.requestID!==event.data.requestID||item.sessionID!==event.data.sessionID)continue;
        if(event.location&&![item.directory,item.project].includes(event.location.directory))continue;
        if(!item.reply){item.reply=event.data.reply;item.wake();}
      }
    },
    clear(){for(const item of pending.values())item.wake();pending.clear();},
  };
}
