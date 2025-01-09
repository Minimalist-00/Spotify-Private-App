import { JWT } from 'next-auth/jwt';

/**
 * JWT を拡張して、Spotify 用のフィールドを追加
 */
export interface MyToken extends JWT {
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpires?: number;
  error?: string;
}

/**
 * Session を拡張して、アクセストークンやエラーを含める
 */
declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    error?: string;
    user?: {
      id?: string | null;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      // 必要に応じて他のフィールド
    };
  }
}
