import type { GeneratedImage, StylingSelection } from './model';
export interface StylingPromptPort { build(selection: StylingSelection): string; }
export interface ImageGenerationPort { edit(input: { image: File | Blob; prompt: string; filename?: string; mimeType?: string; signal?: AbortSignal }): Promise<GeneratedImage>; }
export interface ObjectStoragePort { put(key:string, bytes:Uint8Array, contentType:string):Promise<void>; get(key:string):Promise<{bytes:Uint8Array;contentType:string}>; delete(key:string):Promise<void>; }
