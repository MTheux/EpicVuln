import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const token = request.cookies.get('vulncontrol_token')?.value
    const isAuth = !!token

    // Redireciona usuários não autenticados para o /login
    if (!isAuth && !request.nextUrl.pathname.startsWith('/login')) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // Se já estiver logado e tentar acessar o /login, manda para a Home
    if (isAuth && request.nextUrl.pathname.startsWith('/login')) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Funciona em todas as rotas exceto as de sistema/estáticas
         */
        '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
    ],
}
