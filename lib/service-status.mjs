import {watchdogReadStatus} from './watchdog-read.mjs';
import {leashStatus} from './leash.mjs';
import {gatewayStatus} from './gateway.mjs';
// Local configuration inspection only. Never contact a service or return a token.
export function serviceStatus(active=[],env=process.env){
 const entries=[
  {id:'watchdog',title:'Watchdog reads',inspect:watchdogReadStatus,capabilities:['kujo.opencode.watchdog.read'],setup:'Set KUJO_WATCHDOG_URL and, when required, KUJO_WATCHDOG_TOKEN before launching OpenCode.',use:'Use the Workflow specialist to read API telemetry. This does not start Watchdog, enable lifecycle delivery or proxy model calls.'},
  {id:'leash',title:'Leash',inspect:leashStatus,capabilities:['kujo.opencode.leash.status','kujo.opencode.leash.deliver'],setup:'Set KUJO_LEASH_URL and KUJO_LEASH_TOKEN (registered-device JWT) before launching OpenCode.',use:'Use the Workflow specialist to submit a reviewed intervention. Delivery requires one-time native approval; a delivery receipt is not a human decision.'},
  {id:'gateway',title:'Application gateway',inspect:gatewayStatus,capabilities:['kujo.opencode.gateway.list','kujo.opencode.gateway.call'],setup:'Set KUJO_ABILITY_GATEWAY_URL and, when required, KUJO_ABILITY_GATEWAY_TOKEN before launching OpenCode.',use:'Use the Workflow specialist to discover tools, then review an invocation. Native and application approvals remain separate.'},
 ];
 const visible=new Set(active.map(a=>a.definition.id));
 return entries.map(({inspect,...entry})=>{let state;try{state=inspect(env);}catch{state={configured:false,reason:'Invalid service origin. Use HTTPS or loopback HTTP without credentials, path, query or fragment.'};}return {...entry,...state,enabled:entry.capabilities.every(id=>visible.has(id)),network_requested:false};});
}
