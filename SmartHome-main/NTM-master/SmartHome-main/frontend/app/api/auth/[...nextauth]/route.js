import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GithubProvider from 'next-auth/providers/github';
import CredentialsProvider from 'next-auth/providers/credentials';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const authOptions = {
  providers: [
    // ── Đăng nhập bằng Google ──────────────────────────
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),

    // ── Đăng nhập bằng GitHub ──────────────────────────
    GithubProvider({
      clientId:     process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),

    // ── Đăng nhập bằng tài khoản nội bộ ───────────────
    CredentialsProvider({
      name: 'Tài khoản hệ thống',
      credentials: {
        username: { label: 'Tên đăng nhập', type: 'text' },
        password: { label: 'Mật khẩu',      type: 'password' },
      },
      async authorize(credentials) {
        try {
          const res = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: credentials.username,
              password: credentials.password,
            }),
          });
          const data = await res.json();
          if (res.ok && data.token) {
            return {
              id:       data.user._id,
              name:     data.user.username,
              email:    data.user.email || null,
              token:    data.token,
              role:     data.user.role,
              provider: 'credentials',
            };
          }
          throw new Error(data.msg || 'Đăng nhập thất bại');
        } catch (err) {
          throw new Error(err.message);
        }
      },
    }),
  ],

  callbacks: {
    // Sau OAuth thành công → đồng bộ user với backend
    async signIn({ user, account }) {
      if (account?.provider === 'google' || account?.provider === 'github') {
        try {
          // Tự động tạo hoặc đăng nhập user OAuth trên backend
          const res = await fetch(`${API_URL}/api/auth/oauth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              provider:    account.provider,
              providerId:  account.providerAccountId,
              name:        user.name,
              email:       user.email,
              avatar:      user.image,
            }),
          });
          const data = await res.json();
          if (data.token) {
            user.token    = data.token;
            user.role     = data.user.role;
            user.provider = account.provider;
          }
        } catch (err) {
          console.error('[NextAuth] Lỗi đồng bộ OAuth:', err.message);
        }
      }
      return true;
    },

    // Gắn token vào JWT session
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = user.token;
        token.role        = user.role;
        token.provider    = user.provider;
      }
      return token;
    },

    // Expose token ra session cho client
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.user.role   = token.role;
      session.user.provider = token.provider;
      return session;
    },
  },

  pages: {
    signIn: '/login', // Trang đăng nhập tùy chỉnh
  },

  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
