import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

// トップトラックのデータ型定義
interface TopTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: { name: string; images: { url: string }[] };
  popularity: number;
}

interface SpotifyTopTracksResponse {
  items: TopTrack[];
}

const topTracksHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  // Cookieからアクセストークンを取得
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
    // Spotify APIからトップトラックを取得
    const response = await axios.get<SpotifyTopTracksResponse>(
      'https://api.spotify.com/v1/me/top/tracks',
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
        params: {
          limit: 10, // 最大10件取得
          time_range: 'short_term', // 直近4週間
        },
      }
    );

    const topTracks = response.data.items;

    res.status(200).json({ topTracks });
  } catch (error) {
    console.error('Error fetching top tracks:', error);
    res.status(500).json({ error: 'Failed to fetch top tracks' });
  }
};

export default topTracksHandler;
