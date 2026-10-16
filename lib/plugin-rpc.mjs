import { specialists } from "./specialists.mjs";
// Portable JSON Schema definition; no SDK runtime dependency is required.
export const KujoControl = {
  id:'kujo.control',
  methods:{
    specialist:{input:{type:"object",properties:{sessionID:{type:"string",minLength:1},agent:{type:"string",enum:specialists.map(item=>item.id)}},required:["sessionID","agent"],additionalProperties:false},output:{type:"object",additionalProperties:true}},
    status:{input:{type:'object',properties:{},additionalProperties:false},output:{type:'object',additionalProperties:true}},
    evidence:{input:{type:'object',properties:{},additionalProperties:false},output:{type:'object',additionalProperties:true}},
    profile:{input:{type:'object',properties:{sessionID:{type:'string',minLength:1},profile:{type:'string',enum:['essentials','review','ship','full','build']}},required:['sessionID','profile'],additionalProperties:false},output:{type:'object',additionalProperties:true}},
  },
  events:{},
};
