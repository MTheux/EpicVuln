import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    // We no longer check cookies here because:
    // - The HttpOnly cookie is set by the backend (different port)
    // - Cross-port cookie visibility is inconsistent
    // - Auth checks happen client-side via localStorage + safeFetch 401 handling
    //
    // The middleware only handles static redirects now
    return NextResponse.next()
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
    ],
}
