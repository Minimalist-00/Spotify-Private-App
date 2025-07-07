// src/pages/api/auth/login.ts
import { NextApiRequest, NextApiResponse } from 'next';

export default function login(req: NextApiRequest, res: NextApiResponse) {
  const scopes = [
    'user-top-read',
    'user-read-private',
    'user-library-read',
    'playlist-read-private',
    'playlist-read-collaborative',
    'user-read-recently-played',
  ].join(' ');

  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI!;
  // サーバーサイドコールバック先をフルパス指定するなら、例: 'http://localhost:3000/api/auth/callback'
  // (Spotify Dashboard でも同じURLを "Redirect URIs" に登録しておく)

  // 注意: redirectUri と Spotify Dashbord での登録が完全一致していること！
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: scopes,
    redirect_uri: redirectUri
  });
  const authUrl = 'https://accounts.spotify.com/authorize?'+ params.toString();

  console.log('Redirecting to:', authUrl);
  // サーバーサイドからリダイレクト
  return res.redirect(authUrl);
}
