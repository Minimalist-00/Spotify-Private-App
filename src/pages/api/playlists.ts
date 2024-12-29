import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

interface SpotifyPlaylist {
  id: string;
  name: string;
  tracks: { total: number };
}

interface SpotifyPlaylistsResponse {
  items: SpotifyPlaylist[];
  next: string | null;
}

const playlistsHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  const parseCookies = (cookieHeader: string | undefined): Record<string, string> => {
    if (!cookieHeader) return {};
    return cookieHeader.split(';').reduce((cookies, cookie) => {
      const [name, ...valueParts] = cookie.trim().split('=');
      cookies[name] = decodeURIComponent(valueParts.join('='));
      return cookies;
    }, {} as Record<string, string>);
  };

  const cookies = parseCookies(req.headers.cookie);
  const access_token = cookies.spotify_access_token;

  if (!access_token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const playlists: SpotifyPlaylist[] = [];
    let nextUrl: string | null = 'https://api.spotify.com/v1/me/playlists';

    while (nextUrl) {
      const response = await axios.get<SpotifyPlaylistsResponse>('https://api.spotify.com/v1/me/playlists', {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });
      playlists.push(...response.data.items);
      nextUrl = response.data.next;
    }

    res.status(200).json({ playlists });
  } catch (error) {
    console.error('Error fetching playlists:', error);
    res.status(500).json({ error: 'Failed to fetch playlists' });
  }
};

export default playlistsHandler;
