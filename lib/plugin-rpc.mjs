import { specialists } from "./specialists.mjs";
// Portable JSON Schema definition; no SDK runtime dependency is required.
export const KujoControl = {
  id:'kujo.control',
  methods:{
    runledger:{input:{type:'object',properties:{sessionID:{type:'string',minLength:1},action:{type:'string',enum:['status','start','finish']},status:{type:'string',enum:['pass','partial','fail','abandoned']}},required:['sessionID','action'],additionalProperties:false},output:{type:'object',additionalProperties:true}},
    lifecycle:{input:{type:'object',properties:{sessionID:{type:'string',minLength:1},action:{type:'string',enum:['status','enable','disable','enable_guard','disable_guard','retry','recover','discard']},url:{type:'string'}},required:['sessionID','action'],additionalProperties:false},output:{type:'object',additionalProperties:true}},
    compare:{input:{type:'object',properties:{left:{type:'string',minLength:1},right:{type:'string',minLength:1}},required:['left','right'],additionalProperties:false},output:{type:'object',additionalProperties:true}},
    evidenceDetail:{input:{type:'object',properties:{receiptID:{type:'string',minLength:1},scope:{type:'string',enum:['project','legacy']}},required:['receiptID'],additionalProperties:false},output:{type:'object',additionalProperties:true}},
    artifact:{input:{type:'object',properties:{receiptID:{type:'string',minLength:1},index:{type:'integer',minimum:0}},required:['receiptID','index'],additionalProperties:false},output:{type:'object',additionalProperties:true}},
    capability:{input:{type:'object',properties:{sessionID:{type:'string',minLength:1},ability:{type:'string',minLength:1},mode:{type:'string',enum:['enabled','disabled','profile']}},required:['sessionID','ability','mode'],additionalProperties:false},output:{type:'object',additionalProperties:true}},
    specialist:{input:{type:"object",properties:{sessionID:{type:"string",minLength:1},agent:{type:"string",enum:specialists.map(item=>item.id)}},required:["sessionID","agent"],additionalProperties:false},output:{type:"object",additionalProperties:true}},
    status:{input:{type:'object',properties:{},additionalProperties:false},output:{type:'object',additionalProperties:true}},
    evidence:{input:{type:'object',properties:{scope:{type:'string',enum:['project','session','legacy']},sessionID:{type:'string',minLength:1}},additionalProperties:false},output:{type:'object',additionalProperties:true}},
    profile:{input:{type:'object',properties:{sessionID:{type:'string',minLength:1},profile:{type:'string',enum:['essentials','review','ship','full','build']}},required:['sessionID','profile'],additionalProperties:false},output:{type:'object',additionalProperties:true}},
  },
  events:{},
};
