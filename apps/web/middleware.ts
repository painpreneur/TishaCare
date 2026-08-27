import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/sessionCookie";
import { PATIENT_SESSION_COOKIE } from "@/lib/patientSessionCookie";

// Cheap "is a cookie present" gate. The real auth checks (valid, unexpired
// session row) live in getCurrentDoctor / getCurrentPatient.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/app" || pathname.startsWith("/app/")) {
    if (pathname === "/app/login" || pathname === "/app/register") {
      return NextResponse.next();
    }
    if (!req.cookies.has(PATIENT_SESSION_COOKIE)) {
      return NextResponse.redirect(new URL("/app/login", req.url));
    }
    return NextResponse.next();
  }

  // /dashboard/*
  if (!req.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/app", "/app/:path*"],
};
