import { NextApiRequest, NextApiResponse } from 'next';

const login = (req: NextApiRequest, res: NextApiResponse) => {
  const scope = 'user-library-read user-top-read playlist-read-private playlist-read-collaborative';
  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI!;

  if (!clientId || !redirectUri) {
    throw new Error('Missing SPOTIFY_CLIENT_ID or SPOTIFY_REDIRECT_URI in environment variables');
  }

  const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${clientId}&scope=${encodeURIComponent(
    scope
  )}&redirect_uri=${encodeURIComponent(redirectUri)}`;

  res.redirect(authUrl);
};


export default login;