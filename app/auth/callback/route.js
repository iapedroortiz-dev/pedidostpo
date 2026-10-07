import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

function loginWithError(request) {
  const url = new URL('/login', request.url);
  url.searchParams.set(
    'error',
    'No se pudo validar el enlace. Solicita uno nuevo.'
  );
  return NextResponse.redirect(url);
}

export async function GET(request) {
  const code = request.nextUrl.searchParams.get('code');
  if (!code) return loginWithError(request);

  const response = NextResponse.redirect(new URL('/set-password', request.url));
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        }
      }
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return loginWithError(request);

  return response;
}
