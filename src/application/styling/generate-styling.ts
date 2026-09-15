import crypto from 'node:crypto';
import type { ImageGenerationPort } from '@/domain/styling/ports'; import type { GeneratedImage, StylingSelection } from '@/domain/styling/model'; import type { ExperimentRepositoryPort, VariantPolicyPort } from '@/domain/learning/ports'; import { buildAdaptivePrompt } from '@/infrastructure/ai/adaptive-prompt';
export class GenerateStyling {
 constructor(private imageGenerator:ImageGenerationPort,private experiments:ExperimentRepositoryPort,private policy:VariantPolicyPort){}
 async execute(input:{image:File;selection:StylingSelection;signal?:AbortSignal}):Promise<{image:GeneratedImage;generationId:string;variant:string}>{
  const stats=await this.experiments.stats(input.selection); const variant=this.policy.choose(input.selection,stats); const prompt=buildAdaptivePrompt(input.selection,variant);
  const image=await this.imageGenerator.edit({image:input.image,prompt,filename:input.image.name,mimeType:input.image.type,signal:input.signal});
  return {image,generationId:crypto.randomUUID(),variant};
 }
}
