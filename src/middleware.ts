import { withClerkMiddleware } from "@clerk/nextjs";
import { NextResponse } from "next/server";

// This example protects all routes including api/trpc routes
// Please edit this to allow other routes to be public as needed.
// See https://clerk.com/docs/references/nextjs/auth-middleware for more information about configuring your Middleware
export default withClerkMiddleware(() => {
    return NextResponse.next();
});

// Stop Middleware running on static files
export const config = {
    matcher: "/((?!_next/image|_next/static|favicon.ico).*)",
};
