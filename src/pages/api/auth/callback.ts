import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

// Spotifyトークンレスポンスの型定義
interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

// Axiosエラー型を具体的に定義
interface AxiosErrorResponse<T = unknown> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

// Axiosエラー型
interface AxiosError<T = unknown> extends Error {
  config: unknown;
  code?: string;
  request?: unknown;
  response?: AxiosErrorResponse<T>;
  isAxiosError: boolean;
  toJSON: () => object;
}

// Axiosエラーを判定する型ガード
const isAxiosError = <T = unknown>(error: unknown): error is AxiosError<T> => {
  return typeof error === 'object' && error !== null && (error as AxiosError<T>).isAxiosError !== undefined;
};

const callback = async (req: NextApiRequest, res: NextApiResponse) => {
  const code = req.query.code as string;

  if (!code) {
    res.status(400).json({ error: 'Authorization code is missing' });
    return;
  }

  try {
    // Spotify APIにリクエストを送信してアクセストークンを取得
    const response = await axios.post<SpotifyTokenResponse>(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({
        code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
        grant_type: 'authorization_code',
        client_id: process.env.SPOTIFY_CLIENT_ID!,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET!,
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, refresh_token, expires_in } = response.data;

    if (!access_token || !refresh_token) {
      throw new Error('Invalid tokens');
    }

    // トークンの有効期限を計算
    const expiresAt = Date.now() + expires_in * 1000;

    // Cookie設定
    res.setHeader('Set-Cookie', [
      `spotify_access_token=${access_token}; Path=/; HttpOnly; Secure; SameSite=None; Expires=${new Date(expiresAt).toUTCString()}`,
      `spotify_refresh_token=${refresh_token}; Path=/; HttpOnly; Secure; SameSite=None; Expires=${new Date(expiresAt).toUTCString()}`,
      `spotify_expires_at=${expiresAt}; Path=/; HttpOnly; Secure; SameSite=None; Expires=${new Date(expiresAt).toUTCString()}`,
    ]);

    console.log('Set-Cookie headers:', res.getHeader('Set-Cookie'));

    // リダイレクト
    res.redirect('/dashboard');
  } catch (error: unknown) {
    console.error('Error retrieving tokens:', error);

    // Spotify APIのエラーレスポンスをキャッチ
    if (isAxiosError(error) && error.response) {
      console.error('Spotify API error response:', error.response.data);
    }

    res.status(500).json({ error: 'Failed to retrieve access token' });
  }
};

export default callback;
