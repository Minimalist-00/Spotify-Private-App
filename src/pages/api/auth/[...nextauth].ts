import NextAuth, { NextAuthOptions } from 'next-auth';
import SpotifyProvider from 'next-auth/providers/spotify';
import { MyToken } from '@/types/next-auth'; // 拡張JWT型

const scopes = [
  'user-top-read',
  'user-read-private',
  'user-library-read',
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-read-recently-played',
  'user-read-email',         // もしメールも欲しいなら
].join(' ');

// (A) Spotifyプロフィール取得ヘルパー
async function fetchSpotifyProfile(accessToken: string) {
  const response = await fetch('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch Spotify user profile');
  }
  return response.json();
}

// (B) リフレッシュ用ヘルパーはそのまま
async function refreshAccessToken(token: MyToken): Promise<MyToken> {
  try {
    const url = 'https://accounts.spotify.com/api/token';
    const clientId = process.env.SPOTIFY_CLIENT_ID!;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${authHeader}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken ?? '',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }
    const refreshedTokens = await response.json();

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
    };
  } catch (error) {
    console.error('Error refreshing Spotify token', error);
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }
}

// (C) NextAuth オプション設定
export const authOptions: NextAuthOptions = {
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: {
        url: 'https://accounts.spotify.com/authorize',
        params: {
          scope: scopes,
          show_dialog: true,
        },
      },
    }),
  ],
  session: { strategy: 'jwt' },

  callbacks: {
    async jwt({ token, account}) {
      // 初回ログイン時 (account && user があるとき)
      if (account) {
        // まずアクセストークンなどをtokenに保存
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = Date.now() + (account.expires_in as number) * 1000;

        try {
          // (1) /v1/me を呼んでSpotifyプロフィールを取得
          const me = await fetchSpotifyProfile(account.access_token!);

          // (2) 必要なプロパティをtoken.userにセット
          token.user = {
            id: me.id,
            name: me.display_name,
            email: me.email,
            image: me.images?.[0]?.url,
            country: me.country,
            // ほかにも followers.total などが欲しければ追加
          };
        } catch (err) {
          console.error('Failed to fetch user profile:', err);
        }

        return token;
      }

      // トークンが期限内ならそのまま返す
      if (Date.now() < (token as MyToken).accessTokenExpires!) {
        return token;
      }

      // 期限切れならリフレッシュ
      return await refreshAccessToken(token as MyToken);
    },

    async session({ session, token }) {
      // token.user が存在するなら session.user にコピー
      if (token.user) {
        session.user = token.user as typeof session.user;
      }
      session.accessToken = (token as MyToken).accessToken;
      session.error = (token as MyToken).error;

      // ※console.logでセッション内容を確認したい場合
      // console.log('session callback:', session);

      return session;
    },
  },
};

export default NextAuth(authOptions);
