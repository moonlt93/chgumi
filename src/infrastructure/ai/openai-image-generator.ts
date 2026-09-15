import type { ImageGenerationPort } from '@/domain/styling/ports';
import type { GeneratedImage } from '@/domain/styling/model';
import { GenerationFailedError, GenerationUnavailableError } from '@/domain/styling/errors';
const URL='https://api.openai.com/v1/images/edits';
export class OpenAIImageGenerator implements ImageGenerationPort {
 async edit(input:{image:File|Blob;prompt:string;filename?:string;mimeType?:string;signal?:AbortSignal}):Promise<GeneratedImage>{
  const key=process.env.OPENAI_API_KEY; if(!key) throw new GenerationUnavailableError('OPENAI_API_KEY가 설정되지 않았습니다.');
  const form=new FormData(); const mime=input.mimeType||input.image.type||'image/png';
  form.append('image',input.image,input.filename||'input.png'); form.append('model',process.env.IMAGE_MODEL||'gpt-image-2'); form.append('prompt',input.prompt); form.append('size',process.env.IMAGE_SIZE||'1024x1536'); form.append('quality',process.env.IMAGE_QUALITY||'medium');
  let response:Response;
  try { response=await fetch(URL,{method:'POST',headers:{Authorization:`Bearer ${key}`},body:form,signal:input.signal}); }
  catch(e){ if(e instanceof DOMException && e.name==='AbortError') throw e; throw new GenerationUnavailableError(); }
  if(!response.ok){ const detail=(await response.text()).slice(0,500); console.error('image provider error',response.status,detail); if(response.status===429||response.status>=500) throw new GenerationUnavailableError(); throw new GenerationFailedError(); }
  const json=await response.json() as {data?:Array<{b64_json?:string;url?:string}>}; const item=json.data?.[0]; if(!item) throw new GenerationFailedError('생성 결과가 비어 있습니다.');
  if(item.b64_json) return {bytes:new Uint8Array(Buffer.from(item.b64_json,'base64')),contentType:'image/png'};
  if(item.url){const r=await fetch(item.url,{signal:input.signal}); if(!r.ok) throw new GenerationFailedError(); return {bytes:new Uint8Array(await r.arrayBuffer()),contentType:r.headers.get('content-type')||'image/png'};}
  throw new GenerationFailedError();
 }
}
