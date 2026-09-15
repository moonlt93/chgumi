import fs from 'node:fs/promises'; import path from 'node:path';
import type { ExperimentRepositoryPort } from '@/domain/learning/ports';
import type { ExperimentContext, PromptVariant, StylingFeedback, VariantStats } from '@/domain/learning/model';
const VARIANTS: PromptVariant[]=['CONTROL','PRESERVE_FIRST','STYLE_FIRST'];
export class FileExperimentRepository implements ExperimentRepositoryPort {
  private file=path.join(process.cwd(),'data','feedback.jsonl');
  async append(f:StylingFeedback){ await fs.mkdir(path.dirname(this.file),{recursive:true}); await fs.appendFile(this.file,JSON.stringify(f)+'\n'); }
  async stats(c:ExperimentContext):Promise<VariantStats[]>{
    let text=''; try{text=await fs.readFile(this.file,'utf8')}catch{}
    const rows=text.split('\n').filter(Boolean).map(x=>JSON.parse(x) as StylingFeedback).filter(x=>x.context.occasion===c.occasion&&x.context.vibe===c.vibe);
    return VARIANTS.map(variant=>{const xs=rows.filter(x=>x.variant===variant);const rewards=xs.reduce((s,x)=>s+x.reward,0);return{variant,impressions:xs.length,rewards,rewardRate:xs.length?rewards/xs.length:0.5}});
  }
}
