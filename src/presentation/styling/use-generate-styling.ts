'use client';
import {useCallback} from 'react'; import {useRouter} from 'next/navigation'; import {useStylingStore} from './styling-store';
export function useGenerateStyling(){const router=useRouter(); const image=useStylingStore(s=>s.image),occasion=useStylingStore(s=>s.occasion),vibe=useStylingStore(s=>s.vibe),setResult=useStylingStore(s=>s.setResult),setError=useStylingStore(s=>s.setError);
 return useCallback(async(signal?:AbortSignal)=>{if(!image||!occasion||!vibe){router.replace('/photo');return} const fd=new FormData();fd.append('image',image);fd.append('occasion',occasion);fd.append('vibe',vibe);
 try{const res=await fetch('/api/generate',{method:'POST',body:fd,signal});if(!res.ok){const body=await res.json().catch(()=>({}));throw new Error(body.message||'이미지 생성에 실패했습니다.')}setResult(await res.blob(),res.headers.get('X-Generation-Id')||crypto.randomUUID(),res.headers.get('X-Prompt-Variant')||'CONTROL');router.replace('/result');}catch(e){if(e instanceof DOMException&&e.name==='AbortError')return;setError(e instanceof Error?e.message:'이미지 생성에 실패했습니다.');}
 },[image,occasion,vibe,router,setResult,setError]);}
