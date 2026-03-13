import { auth } from "@/lib/auth"

export default auth((req) => {
  if (!req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin)
    return Response.redirect(loginUrl)
  }
})

export const config = {
  // /api/auth, /_next, /favicon.ico, /login は除外
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon\\.ico|login).*)",
  ],
}
