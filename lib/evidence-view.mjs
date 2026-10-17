import {reviewPages} from './approval-review.mjs';

export function outcomePages(receipt) {
  const fields=[['Outcome',receipt.status||'Not recorded'],['Operation',receipt.ability_id||'Not recorded'],['Approval',receipt.approval_id?'Recorded':'Not recorded'],['Model',receipt.metadata?.model_id||'Not recorded']];
  const lines=fields.flatMap(([label,value])=>reviewPages(`${label}: ${value}`).flatMap(page=>page.split('\n')));
  const pages=[];for(let i=0;i<lines.length;i+=6)pages.push(lines.slice(i,i+6).join('\n'));
  return [...pages,...reviewPages('This is not a verdict on the whole task. It records one tool outcome.')];
}
export async function showEvidencePages(ctx,title,pages,current) {
  let index=0;
  while(current()) {
    await ctx.ui.dialog.alert({title:`${title} · ${index+1}/${pages.length}`,message:pages[index]});
    if(!current()||pages.length===1)return;
    let next;
    do {
      next=await ctx.ui.dialog.select({title:`${title} pages`,options:[
        ...(index+1<pages.length?[{title:'Next page',value:'next'},{title:'Last page',value:'last'}]:[]),
        ...(index>0?[{title:'Previous page',value:'previous'},{title:'First page',value:'first'}]:[]),
        {title:'Find text',value:'find',description:'Search the complete retained value'},
        {title:'Close preview',value:'close'},
      ]});
      if(!current()||!next||next==='close')return;
      if(next==='find') {
        const query=await ctx.ui.dialog.prompt({title:'Find text in this record'});
        if(!current())return;
        if(!query)continue;
        // Search without display wrapping, including matches spanning pages.
        const values=pages.map(page=>page.replaceAll('\n','').toLowerCase());
        const position=values.join('').indexOf(query.toLowerCase());
        if(position<0){await ctx.ui.dialog.alert({title:'Text not found',message:'No match in this retained value. Try a shorter phrase or field name.'});continue;}
        let start=0;index=values.findIndex(value=>{const end=start+value.length;const found=position<end;start=end;return found;});
        break;
      }
      index=next==='last'?pages.length-1:next==='first'?0:index+(next==='next'?1:-1);
      break;
    }while(current());
  }
}
export function showEvidenceValue(ctx,title,value,current) {
  return showEvidencePages(ctx,title,reviewPages(JSON.stringify(value??null)),current);
}
