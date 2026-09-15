'use client';
import {useRouter} from 'next/navigation'; import {useStylingStore} from './styling-store'; import type {Occasion,Vibe} from '@/domain/styling/model';
export function useStylingFlow(){const router=useRouter(); const store=useStylingStore(); return {
 ...store,
 selectPhoto:(f:File)=>store.setImage(f), nextFromPhoto:()=>store.image&&router.push('/occasion'),
 selectOccasion:(o:Occasion)=>{store.chooseOccasion(o);router.push('/vibe')}, selectVibe:(v:Vibe)=>{store.chooseVibe(v);router.push('/generating')},
 retry:()=>{store.setError(null);router.replace('/generating')}, changeVibe:()=>{store.clearResult();router.push('/vibe')}, restart:()=>{store.reset();router.replace('/photo')},
 download:()=>{if(!store.resultUrl)return;const a=document.createElement('a');a.href=store.resultUrl;a.download=`chugumi-${store.occasion}-${store.vibe}.png`;a.click()}
}}
