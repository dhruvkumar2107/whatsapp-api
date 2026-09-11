import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import prisma from './prisma'
import { loginSchema } from './validators'
import { ROLES } from './constants'
import type { Role } from './constants'

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            workspaceMembers: {
              include: {
                workspace: {
                  select: { id: true, name: true, slug: true, status: true },
                },
              },
              take: 1,
              orderBy: { createdAt: 'asc' },
            },
          },
        })

        if (!user || !user.passwordHash) return null

        const isValid = await bcrypt.compare(password, user.passwordHash)
        if (!isValid) return null

        const workspaceMember = user.workspaceMembers[0]

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          workspaceId: workspaceMember?.workspaceId || '',
          role: workspaceMember?.role || 'VIEWER',
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id ?? ''
        token.workspaceId = (user as { workspaceId?: string }).workspaceId || ''
        token.role = ((user as { role?: Role }).role || ROLES.VIEWER) as Role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.workspaceId = token.workspaceId as string
        session.user.role = token.role as Role
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
})
