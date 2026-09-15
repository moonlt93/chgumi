import { InvalidStylingRequestError } from '@/domain/styling/errors';
import { isOccasion, isVibe } from '@/domain/styling/model';
export function parseGenerateRequest(form: FormData){
 const image=form.get('image'), occasion=form.get('occasion'), vibe=form.get('vibe');
 if(!(image instanceof File)) throw new InvalidStylingRequestError('이미지가 필요합니다.');
 if(!image.type.startsWith('image/')) throw new InvalidStylingRequestError('이미지 파일만 업로드할 수 있습니다.');
 if(image.size > 15*1024*1024) throw new InvalidStylingRequestError('이미지는 15MB 이하여야 합니다.');
 if(!isOccasion(occasion)||!isVibe(vibe)) throw new InvalidStylingRequestError('상황 또는 추구미 값이 올바르지 않습니다.');
 return {image, selection:{occasion,vibe} as const};
}
