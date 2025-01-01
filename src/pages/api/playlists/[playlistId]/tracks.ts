// src/pages/api/playlists/[playlistId]/tracks.ts

import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { getToken } from 'next-auth/jwt';

// プレイリストのトラック型定義例 (必要に応じて拡張してください)
interface PlaylistTrackItem {
  track: {
    id: string;
    name: string;
    is_local?: boolean;
    type?: string;  // 例: 'track' / 'episode' / 'local'
  };
}

interface TracksResponse {
  items: PlaylistTrackItem[];
  next: string | null;
}

/**
 * GET /api/playlists/[playlistId]/tracks
 *
 * プレイリストの全トラックを取得し、JSONで返す
 * (Audio Featuresの取得は行わない)
 */
export default async function tracksHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { playlistId } = req.query;

    // playlistId のバリデーション
    if (!playlistId || typeof playlistId !== 'string') {
      return res.status(400).json({ error: 'Invalid playlist ID' });
    }

    // NextAuth で管理しているトークンを取得
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: No token found' });
    }

    // jwt コールバックで格納されたアクセストークンを使用
    const accessToken = token.accessToken as string | undefined;
    if (!accessToken) {
      return res.status(401).json({ error: 'No access token in token' });
    }

    // Spotify API: プレイリスト内の全トラックをページングで取得
    const tracks: PlaylistTrackItem[] = [];
    let nextUrl: string | null = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;

    while (nextUrl) {
      const response = await axios.get<TracksResponse>(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      tracks.push(...response.data.items);
      nextUrl = response.data.next; // 次ページが無ければ null
    }

    // 今回は Audio Features 等を取得せず、
    // 単純にプレイリストの全トラックデータを返す
    return res.status(200).json({ tracks });
  } catch (error) {
    console.error('Error fetching tracks:', error);
    return res.status(500).json({ error: 'Failed to fetch tracks' });
  }
}
