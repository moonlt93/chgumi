import type { StylingSelection } from '@/domain/styling/model'; import type { PromptVariant } from '@/domain/learning/model';
const occasion:any={WORK:'a professional office workday',DATE:'a first date',WALK:'a relaxed city walk',WORKOUT:'a stylish workout'};
const vibe:any={MINIMAL:'minimal, clean, neutral and restrained',DANDY:'modern Korean dandy, refined smart casual',CITY_BOY:'relaxed Korean city-boy, oversized and contemporary',CASUAL:'effortless casual, approachable and comfortable',SPORTY:'modern sporty athleisure',GORPCORE:'functional urban gorpcore outdoor'};
export function buildAdaptivePrompt(s:StylingSelection,variant:PromptVariant){
 const common=[`Edit the provided photo for ${occasion[s.occasion]}.`,`Target aesthetic: ${vibe[s.vibe]}.`];
 const preserve='Preserve the exact same identity, facial features, hairstyle, skin tone, body shape, body proportions, pose, camera angle, crop, lighting and background. Do not beautify, age, reshape or replace the person.';
 const style='Create a coherent, practical, wearable, photorealistic outfit with intentional layering, fit, shoes and subtle accessories. Only change fashion-related elements.';
 if(variant==='PRESERVE_FIRST') return [...common,preserve,style].join('\n\n');
 if(variant==='STYLE_FIRST') return [...common,style,preserve].join('\n\n');
 return [...common,'Only change clothing, shoes and subtle fashion accessories.',preserve,'The outfit must be coherent, practical, wearable and photorealistic.'].join('\n\n');
}
