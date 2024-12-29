import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

interface SpotifyTrack {
  track: {
    id: string;
    name: string;
    album: { name: string; images: { url: string }[] };
    artists: { name: string }[];
  };
}

interface SpotifyPlaylistTracksResponse {
  items: SpotifyTrack[];
  next: string | null;
}

const tracksHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { playlistId } = req.query;

  if (!playlistId || typeof playlistId !== 'string') {
    res.status(400).json({ error: 'Invalid playlist ID' });
    return;
  }

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
    const tracks: SpotifyTrack[] = [];
    let nextUrl: string | null = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;

    while (nextUrl) {
      const response = await axios.get<SpotifyPlaylistTracksResponse>(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });
      tracks.push(...response.data.items);
      nextUrl = response.data.next;
    }

    res.status(200).json({ tracks });
  } catch (error) {
    console.error('Error fetching tracks:', error);
    res.status(500).json({ error: 'Failed to fetch tracks' });
  }
};

export default tracksHandler;
