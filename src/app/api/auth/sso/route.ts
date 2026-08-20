import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { encode } from 'next-auth/jwt';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';

const SSO_SECRET = new TextEncoder().encode(
  process.env.SSO_SHARED_SECRET || 'hw-sso-master-shared-cryptographic-token-3849204910'
);

function mapRoleToAppRole(ssoRole?: string): string {
  if (!ssoRole) return 'admin';
  const normalized = ssoRole.toUpperCase().trim();
  if (['SUPER_ADMIN', 'SUPERADMIN', 'ADMIN', 'MANAGER', 'DIRECTOR'].includes(normalized)) {
    return 'admin';
  }
  return 'user';
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=sso_token_missing', req.url));
  }

  try {
    // 1. Verify token signature and expiration
    const { payload } = await jwtVerify(token, SSO_SECRET, {
      issuer: 'hw-central-sso',
    });

    const email = (payload.email as string)?.trim().toLowerCase();
    const name = (payload.name as string)?.trim() || email.split('@')[0];
    const ssoRole = payload.role as string;
    const targetRole = mapRoleToAppRole(ssoRole);

    if (!email) {
      console.error('SSO payload missing email');
      return NextResponse.redirect(new URL('/login?error=sso_invalid_payload', req.url));
    }

    // 2. Link or create user in local database
    let userResult = await query(
      'SELECT id, name, email, role, allowed_tiktok_shops, allowed_shopee_shops, allowed_features FROM credentials.users WHERE email = $1',
      [email]
    );

    let user = userResult.rows[0];

    if (!user) {
      // Auto-provision user on first SSO login
      const randomPassword = await bcrypt.hash(crypto.randomUUID(), 10);
      const defaultFeatures = targetRole === 'admin'
        ? ['overview', 'tiktok', 'shopee', 'ads', 'analytics', 'feedback', 'settings', 'debug', 'refresh_token']
        : ['overview', 'tiktok', 'shopee', 'ads', 'analytics', 'feedback'];

      const insertResult = await query(
        `INSERT INTO credentials.users (name, email, password, role, allowed_tiktok_shops, allowed_shopee_shops, allowed_features)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, name, email, role, allowed_tiktok_shops, allowed_shopee_shops, allowed_features`,
        [name, email, randomPassword, targetRole, [1, 2, 3, 4], [1, 2, 3, 4], defaultFeatures]
      );
      user = insertResult.rows[0];
    }

    const allowedFeatures = Array.isArray(user.allowed_features) && user.allowed_features.length > 0
      ? (user.allowed_features.includes('feedback') ? user.allowed_features : [...user.allowed_features, 'feedback'])
      : (user.role === 'admin'
          ? ['overview', 'tiktok', 'shopee', 'ads', 'analytics', 'feedback', 'settings', 'debug', 'refresh_token']
          : ['overview', 'tiktok', 'shopee', 'ads', 'analytics', 'feedback']);

    // 3. Generate NextAuth session token
    const nextAuthSecret = process.env.NEXTAUTH_SECRET || 'fallback-secret-for-development-only';
    const sessionMaxAge = 30 * 24 * 60 * 60; // 30 days

    const sessionJwt = await encode({
      token: {
        id: user.id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        allowed_tiktok_shops: user.allowed_tiktok_shops || [1, 2, 3, 4],
        allowed_shopee_shops: user.allowed_shopee_shops || [1, 2, 3, 4],
        allowed_features: allowedFeatures,
        sub: user.id.toString(),
      },
      secret: nextAuthSecret,
      maxAge: sessionMaxAge,
    });

    // 4. Redirect to home dashboard with session cookies established
    const isProduction = process.env.NODE_ENV === 'production' || req.url.startsWith('https:');
    const response = NextResponse.redirect(new URL('/', req.url));

    // Standard session cookie
    response.cookies.set('user_session', JSON.stringify({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    }), {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: sessionMaxAge,
    });

    // NextAuth session token cookie for standard/dev
    response.cookies.set('next-auth.session-token', sessionJwt, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: sessionMaxAge,
    });

    // NextAuth secure session token cookie for HTTPS/production
    if (isProduction) {
      response.cookies.set('__Secure-next-auth.session-token', sessionJwt, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: sessionMaxAge,
      });
    }

    return response;
  } catch (error) {
    console.error('SSO verification failed:', error);
    return NextResponse.redirect(new URL('/login?error=sso_invalid', req.url));
  }
}
