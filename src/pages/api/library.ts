// src/pages/api/library.ts

import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
// ★ NextAuthのトークンを取得するための関数
import { getToken } from 'next-auth/jwt';

export default async function libraryHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // ★ NextAuthのJWTを取得
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
      const response = await axios.get<LibraryTracksResponse>(
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
