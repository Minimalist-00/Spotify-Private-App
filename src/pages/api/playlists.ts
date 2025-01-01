// src/pages/api/playlists.ts

import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { getToken } from 'next-auth/jwt';

interface Playlist {
  id: string;
  name: string;
  images: Array<{ url: string }>;
  tracks: { total: number };
}

interface PlaylistsResponse {
  items: Playlist[];
  next: string | null;
}

/**
 * GET /api/playlists
 */
export default async function playlistsHandler(
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

    // Spotify API: ユーザーのプレイリストをページング取得
    const playlists: Playlist[] = [];
    let nextUrl: string | null = 'https://api.spotify.com/v1/me/playlists';

    while (nextUrl) {
      const response = await axios.get<PlaylistsResponse>(
        'https://api.spotify.com/v1/me/playlists', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      playlists.push(...response.data.items);
      nextUrl = response.data.next; // 次のページのURL or null
    }

    return res.status(200).json({ playlists });
  } catch (error) {
    console.error('Error fetching playlists:', error);
    return res.status(500).json({ error: 'Failed to fetch playlists' });
  }
}
