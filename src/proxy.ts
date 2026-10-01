import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, expectedToken } from "@/lib/auth";
export async function proxy(request:NextRequest){
  const pathname=request.nextUrl.pathname;
  if(pathname.startsWith("/_next/") || pathname === "/favicon.ico") return NextResponse.next();
  if(["/login","/api/health","/manifest.webmanifest","/sw.js","/offline.html"].includes(pathname) || pathname.startsWith("/icons/") || pathname.startsWith("/api/auth/"))return NextResponse.next();
  const cookie=request.cookies.get(AUTH_COOKIE)?.value;
  try {if(cookie && cookie===await expectedToken())return protect(request);}catch {return NextResponse.json({error:"Configure as credenciais do servidor."},{status:503});}
  if(pathname==="/api/timing"&&request.method==="POST"){
    const key=process.env.TIMING_API_KEY;
    if(key&&request.headers.get("authorization")===`Bearer ${key}`)return NextResponse.next();
  }
  if(pathname.startsWith("/api/"))return NextResponse.json({error:"Autenticação necessária."},{status:401});
  const url=request.nextUrl.clone();url.pathname="/login";url.search="";url.searchParams.set("from",pathname);return NextResponse.redirect(url);
}
function protect(request:NextRequest){
  if(["POST","PUT","PATCH","DELETE"].includes(request.method)){
    const origin=request.headers.get("origin");const host=request.headers.get("x-forwarded-host")??request.headers.get("host");
    if(origin&&new URL(origin).host!==host)return NextResponse.json({error:"Origem não permitida."},{status:403});
  }
  return NextResponse.next();
}
