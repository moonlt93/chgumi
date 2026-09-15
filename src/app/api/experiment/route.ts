import { NextResponse } from 'next/server'; import { stylingContainer } from '@/infrastructure/composition/styling-container';
export const runtime='nodejs';
export async function GET(req:Request){const u=new URL(req.url);const occasion=u.searchParams.get('occasion') as any;const vibe=u.searchParams.get('vibe') as any;if(!occasion||!vibe)return NextResponse.json({message:'occasion and vibe required'},{status:400});return NextResponse.json({occasion,vibe,stats:await stylingContainer.experiments.stats({occasion,vibe})});}
