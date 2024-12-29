import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import cookie from 'cookie';

// Spotify APIからのレスポンスの型定義
interface SpotifyTrack {
  track: {
    id: string;
    name: string;
    album: {
      name: string;
      images: { url: string }[];
    };
    artists: { name: string }[];
  };
}

interface SpotifyApiResponse {
  items: SpotifyTrack[];
  total: number;
}

const libraryHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  const parseCookies = (cookieHeader: string | undefined): Record<string, string> => {
    if (!cookieHeader) return {};
    return cookieHeader.split(';').reduce((cookies, cookie) => {
      const [name, ...valueParts] = cookie.trim().split('=');
      cookies[name] = decodeURIComponent(valueParts.join('='));
      return cookies;
    }, {} as Record<string, string>);
  };

  const cookies = parseCookies(req.headers.cookie);
  let access_token = cookies.spotify_access_token;
  const refresh_token = cookies.spotify_refresh_token;
  const expires_at = parseInt(cookies.spotify_expires_at || '0');

  // トークンの有効期限をチェック
  if (!access_token || Date.now() > expires_at) {
    if (!refresh_token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      const { access_token: newAccessToken, expires_in } = await axios.post<{
        access_token: string;
        expires_in: number;
      }>(
        'https://accounts.spotify.com/api/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token,
          client_id: process.env.SPOTIFY_CLIENT_ID!,
          client_secret: process.env.SPOTIFY_CLIENT_SECRET!,
        }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      ).then((res) => res.data);

      access_token = newAccessToken;
      const newExpiresAt = Date.now() + expires_in * 1000;

      res.setHeader('Set-Cookie', [
        cookie.serialize('spotify_access_token', access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: expires_in,
        }),
        cookie.serialize('spotify_expires_at', newExpiresAt.toString(), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
        }),
      ]);
    } catch (error) {
      console.error('Error refreshing token:', error);
      res.status(500).json({ error: 'Failed to refresh token' });
      return;
    }
  }

  try {
    const allTracks: SpotifyTrack[] = [];
    let offset = 0;
    const limit = 50; // 最大50件ずつ取得
    let total = 0;

    do {
      const response = await axios.get<SpotifyApiResponse>('https://api.spotify.com/v1/me/tracks', {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
        params: {
          limit,
          offset,
        },
      });

      const data = response.data; // 型がSpotifyApiResponseとして推論される
      allTracks.push(...data.items);
      total = data.total;
      offset += limit;
    } while (offset < total);

    res.status(200).json({ items: allTracks });
  } catch (error) {
    console.error('Error fetching library:', error);
    res.status(500).json({ error: 'Failed to fetch library' });
  }
};

export default libraryHandler;
