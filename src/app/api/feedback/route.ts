import { NextResponse } from 'next/server'; import { stylingContainer } from '@/infrastructure/composition/styling-container';
export const runtime='nodejs';
export async function POST(req:Request){try{const body=await req.json();await stylingContainer.recordFeedback.execute(body);return NextResponse.json({ok:true})}catch(e){console.error(e);return NextResponse.json({ok:false},{status:400})}}
