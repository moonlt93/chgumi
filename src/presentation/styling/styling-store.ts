'use client';
import {create} from 'zustand'; import type {Occasion,Vibe} from '@/domain/styling/model';
type State={image:File|null;previewUrl:string|null;occasion:Occasion|null;vibe:Vibe|null;resultUrl:string|null;generationId:string|null;variant:string|null;error:string|null;setImage:(f:File)=>void;chooseOccasion:(o:Occasion)=>void;chooseVibe:(v:Vibe)=>void;setResult:(blob:Blob,generationId:string,variant:string)=>void;setError:(m:string|null)=>void;clearResult:()=>void;reset:()=>void};
const revoke=(u:string|null)=>{if(u?.startsWith('blob:'))URL.revokeObjectURL(u)};
export const useStylingStore=create<State>((set,get)=>({image:null,previewUrl:null,occasion:null,vibe:null,resultUrl:null,generationId:null,variant:null,error:null,
 setImage:(image)=>{revoke(get().previewUrl);revoke(get().resultUrl);set({image,previewUrl:URL.createObjectURL(image),resultUrl:null,generationId:null,variant:null,error:null})},
 chooseOccasion:(occasion)=>set({occasion,error:null}), chooseVibe:(vibe)=>set({vibe,error:null}),
 setResult:(blob,generationId,variant)=>{revoke(get().resultUrl);set({resultUrl:URL.createObjectURL(blob),generationId,variant,error:null})}, setError:(error)=>set({error}),
 clearResult:()=>{revoke(get().resultUrl);set({resultUrl:null})}, reset:()=>{revoke(get().previewUrl);revoke(get().resultUrl);set({image:null,previewUrl:null,occasion:null,vibe:null,resultUrl:null,generationId:null,variant:null,error:null})}
}));
