import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Un enlace con porcentajes rotos (por ejemplo /autos/%E0%A4%A) hacía caer la ruta
// con un error 500. Se corta antes con un 400 claro.
export function proxy(request: NextRequest) {
  try {
    decodeURIComponent(request.nextUrl.pathname);
  } catch {
    return new NextResponse("Enlace no válido", { status: 400 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/autos/:path*",
};
