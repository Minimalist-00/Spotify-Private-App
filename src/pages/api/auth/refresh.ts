import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import cookie from 'cookie';

const refreshHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  const refresh_token = cookies.spotify_refresh_token;

  if (!refresh_token) {
    res.status(401).json({ error: 'Refresh token missing' });
    return;
  }

  try {
    const response = await axios.post<SpotifyTokenResponse>(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token,
        client_id: process.env.SPOTIFY_CLIENT_ID!,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET!,
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    const { access_token, expires_in } = response.data;

    if (!access_token || !refresh_token) {
      throw new Error('Invalid tokens');
    }

    const expiresAt = Date.now() + expires_in * 1000;
    const expiresDate = new Date(expiresAt);

    res.setHeader('Set-Cookie', [
      `spotify_access_token=${access_token}; Path=/; HttpOnly; SameSite=None; ${
        process.env.NODE_ENV === 'production' ? 'Secure;' : ''
      } Expires=${expiresDate.toUTCString()}`,
    ]);

    res.status(200).json({ access_token });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
};

export default refreshHandler;
