// src/pages/api/library.ts

import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
// ★ NextAuthのトークンを取得するための関数
import { getToken } from 'next-auth/jwt';

/**
 * Spotify APIの型定義例 (必要に応じて拡張してください)
 */
interface Track {
  id: string;
  name: string;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
  artists: Array<{ name: string }>;
}

interface TracksResponse {
  items: Array<{ track: Track }>;
  total: number;
}

export default async function libraryHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // ★ NextAuthのJWTを取得
    // NEXTAUTH_SECRET が必要なので、.env.local等で設定してください
    // e.g. NEXTAUTH_SECRET="some_long_random_string"
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    // ログインしていなければtokenはnull
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized (no token)' });
    }

    // コールバックで設定した token.accessToken があるはず
    const accessToken = token.accessToken as string | undefined;
    if (!accessToken) {
      return res.status(401).json({ error: 'No access token in token' });
    }

    // ここからSpotify APIにリクエスト
    const allTracks: Track[] = [];
    let offset = 0;
    const limit = 50; // 一度に取得する件数 (最大50)
    let total = 0;

    do {
      // https://api.spotify.com/v1/me/tracks から最大50件ずつ取得
      const response = await axios.get<TracksResponse>(
        'https://api.spotify.com/v1/me/tracks',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            limit,
            offset,
          },
        }
      );

      const data = response.data;
      // data.items は { track: Track }[] の配列
      allTracks.push(...data.items.map((item) => item.track));
      total = data.total;
      offset += limit;
    } while (offset < total);

    return res.status(200).json({ items: allTracks });
  } catch (error) {
    console.error('Error fetching library:', error);
    return res.status(500).json({ error: 'Failed to fetch library' });
  }
}
