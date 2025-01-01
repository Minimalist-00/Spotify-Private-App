// src/pages/api/recently-tracks.ts

import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { getToken } from 'next-auth/jwt';

interface SpotifyRecentlyPlayedResponse {
  items: Array<{
    track: {
      id: string;
      name: string;
      artists: Array<{ name: string }>;
      album: {
        name: string;
        images: Array<{ url: string }>;
      };
    };
    played_at: string;
  }>;
}

/**
 * GET /api/recently-tracks
 */
export default async function recentlyTracksHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // NextAuthのトークンを取得
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized (no token)' });
    }

    // JWTコールバックで設定した "token.accessToken" を使う
    const accessToken = token.accessToken as string | undefined;
    if (!accessToken) {
      return res.status(401).json({ error: 'No access token in token' });
    }

    // Spotify APIから 最近再生したトラックを取得
    const response = await axios.get<SpotifyRecentlyPlayedResponse>(
      'https://api.spotify.com/v1/me/player/recently-played',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          limit: 50,
        },
      }
    );

    // 必要な情報だけを整形
    const recentlyPlayed = response.data.items.map((item) => ({
      id: item.track.id,
      name: item.track.name,
      artists: item.track.artists.map((artist) => artist.name).join(', '),
      album: {
        name: item.track.album.name,
        image: item.track.album.images[0]?.url || '',
      },
      playedAt: item.played_at,
    }));

    return res.status(200).json({ recentlyPlayed });
  } catch (error) {
    console.error('Error fetching recently played tracks:', error);
    return res.status(500).json({ error: 'Failed to fetch recently played tracks' });
  }
}
