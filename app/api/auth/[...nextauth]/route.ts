import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { queryOne } from "@/lib/db";

interface DBUser {
    id: string;
    email: string;
    password_hash: string;
    role: string;
    name: string;
    is_active: number | boolean; // MySQL returns 0 or 1
}

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("البريد الإلكتروني وكلمة المرور مطلوبان");
                }

                console.log('[NextAuth] Attempting login for:', credentials.email);

                // Find user by email
                const user = await queryOne<DBUser>(
                    "SELECT * FROM users WHERE email = ?",
                    [credentials.email]
                );

                console.log('[NextAuth] User found:', user ? 'Yes' : 'No');

                if (!user) {
                    throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
                }

                // MySQL returns is_active as 0 or 1
                const isActive = user.is_active === 1 || user.is_active === true;
                console.log('[NextAuth] User is_active:', isActive);

                if (!isActive) {
                    throw new Error("حسابك معطل. يرجى التواصل مع المسؤول");
                }

                console.log('[NextAuth] Password hash exists:', !!user.password_hash);
                console.log('[NextAuth] Password hash length:', user.password_hash?.length);

                // Verify password
                const isValid = await bcrypt.compare(
                    credentials.password,
                    user.password_hash
                );

                console.log('[NextAuth] Password valid:', isValid);

                if (!isValid) {
                    throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role as "super_admin" | "admin" | "employee" | "maintenance_worker" | "accountant" | "hr_manager",
                };
            },
        }),
    ],
    session: {
        strategy: "jwt",
        maxAge: 400 * 24 * 60 * 60, // 400 days — effective max (browser cookie limit)
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = (user as any).role;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id;
                (session.user as any).role = token.role;
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
        error: "/login",
    },
    secret: process.env.NEXTAUTH_SECRET,
    debug: true,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
