import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

function withSessionCookies(response, sessionResponse) {
  sessionResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie);
  });

  return response;
}

export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        }
      }
    }
  );

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims ?? null;

  const pathname = request.nextUrl.pathname;
  const isAuthRoute = pathname === '/login'
    || pathname === '/forgot-password'
    || pathname.startsWith('/auth/');

  if (!claims?.sub && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', `${pathname}${request.nextUrl.search}`);

    return withSessionCookies(NextResponse.redirect(url), supabaseResponse);
  }

  if (claims?.sub && pathname === '/login') {
    return withSessionCookies(
      NextResponse.redirect(new URL('/dashboard', request.url)),
      supabaseResponse
    );
  }

  return supabaseResponse;
}
