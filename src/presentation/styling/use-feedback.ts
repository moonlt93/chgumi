'use client';
import {useStylingStore} from './styling-store';
export function useFeedback(){const generationId=useStylingStore(s=>s.generationId),variant=useStylingStore(s=>s.variant),occasion=useStylingStore(s=>s.occasion),vibe=useStylingStore(s=>s.vibe);
 return async(signal:'DOWNLOAD'|'REGENERATE'|'LIKE'|'DISLIKE')=>{if(!generationId||!variant||!occasion||!vibe)return;await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({generationId,variant,context:{occasion,vibe},signal})}).catch(()=>{});};}
