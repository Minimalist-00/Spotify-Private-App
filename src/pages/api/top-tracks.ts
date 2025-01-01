// src/pages/api/top-tracks.ts

import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { getToken } from 'next-auth/jwt';

interface SpotifyTopTracksResponse {
  items: Array<{
    id: string;
    name: string;
    artists: Array<{ name: string }>;
    album: {
      name: string;
      images: Array<{ url: string }>;
    };
  }>;
}

/**
 * GET /api/top-tracks
 */
export default async function topTracksHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // NextAuthのトークン取得
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized (no token)' });
    }

    const accessToken = token.accessToken as string | undefined;
    if (!accessToken) {
      return res.status(401).json({ error: 'No access token in token' });
    }

    // Spotify APIからトップトラックを取得 (最大10件)
    const response = await axios.get<SpotifyTopTracksResponse>(
      'https://api.spotify.com/v1/me/top/tracks',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          limit: 10,
          time_range: 'short_term', // 直近4週間
        },
      }
    );

    const topTracks = response.data.items;
    return res.status(200).json({ topTracks });
  } catch (error) {
    console.error('Error fetching top tracks:', error);
    return res.status(500).json({ error: 'Failed to fetch top tracks' });
  }
}
