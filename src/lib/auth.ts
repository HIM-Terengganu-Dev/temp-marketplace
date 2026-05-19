import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { query } from './db';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: "Email", type: "email", placeholder: "you@example.com" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                try {
                    const result = await query(
                        'SELECT * FROM credentials.users WHERE email = $1',
                        [credentials.email]
                    );

                    const user = result.rows[0];

                    if (!user) {
                        return null; // No user found
                    }

                    const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

                    if (!isPasswordValid) {
                        return null; // Invalid password
                    }

                    return {
                        id: user.id.toString(),
                        email: user.email,
                        name: user.name,
                        role: user.role, // Attach custom role
                        allowed_tiktok_shops: user.allowed_tiktok_shops || [],
                        allowed_shopee_shops: user.allowed_shopee_shops || [],
                        allowed_features: user.allowed_features || ["overview", "tiktok", "shopee", "ads", "analytics"]
                    };
                } catch (error) {
                    console.error('Error in authorize:', error);
                    return null;
                }
            }
        })
    ],
    session: {
        strategy: 'jwt',
    },
    callbacks: {
        async jwt({ token, user }) {
            // Initial sign in
            if (user) {
                token.id = user.id;
                token.role = (user as any).role;
                token.allowed_tiktok_shops = (user as any).allowed_tiktok_shops;
                token.allowed_shopee_shops = (user as any).allowed_shopee_shops;
                token.allowed_features = (user as any).allowed_features;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id;
                (session.user as any).role = token.role;
                (session.user as any).allowed_tiktok_shops = token.allowed_tiktok_shops;
                (session.user as any).allowed_shopee_shops = token.allowed_shopee_shops;
                (session.user as any).allowed_features = token.allowed_features;
            }
            return session;
        }
    },
    pages: {
        signIn: '/login', // Custom login page
    },
    secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-development-only', // Remember to set NEXTAUTH_SECRET in .env
};
