import { GenerationFailedError, GenerationUnavailableError } from '@/domain/styling/errors';
import type { GeneratedImage } from '@/domain/styling/model';
import type { ImageGenerationPort } from '@/domain/styling/ports';

const IMAGE_EDIT_URL = 'https://api.openai.com/v1/images/edits';

export class OpenAIImageGenerator implements ImageGenerationPort {
  async edit(input: {
    image: File | Blob;
    prompt: string;
    filename?: string;
    mimeType?: string;
    signal?: AbortSignal;
  }): Promise<GeneratedImage> {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new GenerationUnavailableError('OPENAI_API_KEY가 설정되지 않았습니다.');
    }

    const form = new FormData();

    form.append('image', input.image, input.filename || 'input.png');
    form.append('model', process.env.IMAGE_MODEL || 'gpt-image-2');
    form.append('prompt', input.prompt);
    form.append('size', process.env.IMAGE_SIZE || '1024x1536');
    form.append('quality', process.env.IMAGE_QUALITY || 'medium');

    let response: Response;

    try {
      response = await fetch(IMAGE_EDIT_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
        signal: input.signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }

      throw new GenerationUnavailableError();
    }

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);

      console.error('image provider error', response.status, detail);

      if (response.status === 429 || response.status >= 500) {
        throw new GenerationUnavailableError();
      }

      throw new GenerationFailedError();
    }

    const json = (await response.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
    const item = json.data?.[0];

    if (!item) {
      throw new GenerationFailedError('생성 결과가 비어 있습니다.');
    }

    if (item.b64_json) {
      return {
        bytes: new Uint8Array(Buffer.from(item.b64_json, 'base64')),
        contentType: 'image/png',
      };
    }

    if (item.url) {
      const imageResponse = await fetch(item.url, { signal: input.signal });

      if (!imageResponse.ok) {
        throw new GenerationFailedError();
      }

      return {
        bytes: new Uint8Array(await imageResponse.arrayBuffer()),
        contentType: imageResponse.headers.get('content-type') || 'image/png',
      };
    }

    throw new GenerationFailedError();
  }
}
