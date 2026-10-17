const invalid=message=>Object.assign(Error(message),{code:'ability_input_invalid'});
export function dispatchDecision(input,control){
 const id=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,255}$/.test(value);
 if(!['run_id','step_id','event_id','decision_id'].every(key=>id(input[key]))||!Number.isSafeInteger(input.expected_revision)||input.expected_revision<1||!['approve','reject','request_changes'].includes(input.decision)||typeof input.response!=='string'||input.response.length>4000)throw invalid('Provide the exact inspected checkpoint identifiers, positive revision, decision and bounded review response');
 if(!control?.available||control.schema!=='kujo.control-view/v1')throw Object.assign(Error('Canonical Dispatch control view unavailable; inspect with a supported installed Dispatch version'),{code:'ability_dependency_missing'});
 const event=control.human_intervention;
 if(control.run_id!==input.run_id||control.state_revision!==input.expected_revision||!['paused','needs_changes'].includes(control.run_status)||event?.event_id!==input.event_id||event?.run?.run_id!==input.run_id||event?.run?.step_id!==input.step_id||event?.security?.decision_id!==input.decision_id||!event?.allowed_actions?.includes(input.decision))throw Object.assign(Error('Checkpoint changed or decision is not allowed; inspect again before requesting a new approval'),{code:'dispatch_checkpoint_changed'});
 return {run_id:input.run_id,step_id:input.step_id,event_id:input.event_id,decision_id:input.decision_id,expected_state_revision:input.expected_revision,decision:input.decision,response:input.response};
}
