import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Prisma を含まない Edge 対応 config だけを使う
export default NextAuth(authConfig).auth((req) => {
  if (!req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    return Response.redirect(loginUrl);
  }
});

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon\\.ico|login).*)",
  ],
};
