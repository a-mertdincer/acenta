import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
  ],
  secret: process.env.AUTH_SECRET,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== 'google') return true;
      const email = user.email?.trim().toLowerCase();
      if (!email) return false;
      const existing = await prisma.user.findUnique({ where: { email } });
      if (!existing) {
        await prisma.user.create({
          data: {
            email,
            name: user.name?.trim() || email.split('@')[0],
            passwordHash: hashPassword(crypto.randomUUID()),
            role: 'CUSTOMER',
          },
        });
      }
      return true;
    },
    async session({ session }) {
      const email = session.user?.email?.trim().toLowerCase();
      if (email && session.user) {
        const dbUser = await prisma.user.findUnique({
          where: { email },
          select: { id: true, role: true, name: true },
        });
        if (dbUser) {
          (session.user as { id?: string; role?: string }).id = dbUser.id;
          (session.user as { id?: string; role?: string }).role = dbUser.role;
          session.user.name = dbUser.name;
        }
      }
      return session;
    },
  },
};
