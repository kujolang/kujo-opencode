// OpenCode's generic permission renderer omits metadata. This read-only review
// accompanies its permission dialog; it never grants or replies to permission.
const visible=value=>String(value).replace(/[\x00-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
export function approvalSections(request) {
  const m=request.metadata||{};
  const json=value=>JSON.stringify(value??null);
  return [
    {title:'Operation',text:m.title?`${m.title} (${m.ability||request.action})`:String(m.ability||request.action)},
    ...(typeof m.input?.origin==='string'?[{title:'Destination',text:m.input.origin}]:[]),
    {title:'Effects',text:json(m.effects)},
    {title:'Exact input',text:json(m.input)},
    {title:'Approval identity',text:json({project:m.project,invocation:m.invocation,digest:m.digest,request:request.id})},
  ].map(section=>({...section,text:visible(section.text)}));
}
export function reviewPages(text) {
  // Short fixed-width pages keep every character accessible at 80x24, without
  // silently truncating long inputs. Escape control/bidi characters as data.
  const chars=Array.from(visible(text));const lines=[];
  let line='',width=0;
  for(const char of chars){
    const columns=char.codePointAt(0)<128?1:2;
    if(width+columns>36){lines.push(line);line='';width=0;}
    line+=char;width+=columns;
  }
  if(line)lines.push(line);
  const pages=[];
  for(let i=0;i<lines.length;i+=6)pages.push(lines.slice(i,i+6).join('\n'));
  return pages.length?pages:['(empty)'];
}
export async function showApprovalReview(ctx,request,current) {
  const sections=approvalSections(request);
  while(current()) {
    const selected=await ctx.ui.dialog.select({title:'Review Kujo operation',options:[
      ...sections.map((section,index)=>({title:section.title,value:String(index),description:section.text.slice(0,110)})),
      {title:'Return to permission choice',value:'return',description:'Nothing approved yet. Choose Allow once or Reject in OpenCode.'},
    ]});
    if(!current()||selected===undefined||selected==='return')return;
    const section=sections[Number(selected)];if(!section)continue;
    const pages=reviewPages(section.text);
    let index=0;
    while(current()) {
      await ctx.ui.dialog.alert({title:`${section.title} · ${index+1}/${pages.length}`,message:pages[index]});
      if(!current()||pages.length===1)break;
      const next=await ctx.ui.dialog.select({title:`${section.title} pages`,options:[
        ...(index+1<pages.length?[{title:'Next page',value:'next'}]:[]),
        ...(index>0?[{title:'Previous page',value:'previous'}]:[]),
        {title:'Back to operation',value:'back'},
      ]});
      if(!current()||!next||next==='back')break;
      index+=next==='next'?1:-1;
    }
  }
}
