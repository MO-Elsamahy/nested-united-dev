import NextAuth, { NextAuthOptions, DefaultSession, DefaultUser } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { queryOne } from "@/lib/db";

declare module "next-auth" {
    interface Session extends DefaultSession {
        user: {
            id: string;
            role: string;
        } & DefaultSession["user"]
    }

    interface User extends DefaultUser {
        role: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        role: string;
    }
}

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



                // Find user by email
                const user = await queryOne<DBUser>(
                    "SELECT * FROM users WHERE email = ? AND deleted_at IS NULL",
                    [credentials.email]
                );



                if (!user) {
                    throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
                }

                // MySQL returns is_active as 0 or 1
                const isActive = user.is_active === 1 || user.is_active === true;


                if (!isActive) {
                    throw new Error("حسابك معطل. يرجى التواصل مع المسؤول");
                }



                // Verify password
                const isValid = await bcrypt.compare(
                    credentials.password,
                    user.password_hash
                );



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
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
        error: "/login",
    },
    secret: process.env.NEXTAUTH_SECRET,
    debug: false,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
