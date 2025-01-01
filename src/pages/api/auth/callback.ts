// src/pages/api/auth/callback.ts
import { NextApiRequest, NextApiResponse } from 'next';

export default async function callback(req: NextApiRequest, res: NextApiResponse) {
  // Spotify から返ってきたクエリパラメータを取得
  const code = req.query.code as string | undefined; // "code" が無ければ undefined
  const error = req.query.error as string | undefined; // ユーザーが拒否した場合など

  console.log('Authorization code:', code);
  console.log('Error (if any):', error);


  if (error) {
    // ユーザーが拒否した、あるいはSpotifyからのエラー
    return res.status(400).json({ error: `Spotify returned error: ${error}` });
  }

  if (!code) {
    return res.status(400).json({ error: 'Authorization code is missing' });
  }

  // Token を取りに行く
  try {
    const tokenUrl = 'https://accounts.spotify.com/api/token';

    // client_id, client_secret を Basic認証ヘッダにセット
    const clientId = process.env.SPOTIFY_CLIENT_ID!;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
    const authHeader = Buffer.from(clientId + ':' + clientSecret).toString('base64');

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${authHeader}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI!
    })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const { access_token, refresh_token, expires_in } = data;

    console.log('Token exchange response:', data);

    // アクセストークンを使ってSpotify APIにリクエストを送る (3)
    // ここではアクセストークンを表示するだけ
    res.send(`Access Token: ${access_token}<br>Refresh Token: ${refresh_token}<br>Expires In: ${expires_in}`);
    // ここでCookieをセットしてもOK (HttpOnly Cookie にする等)
    // あるいは、サーバーサイドセッションに保存してもOK
    // ※ SameSite, Secure, HttpOnly 等の設定は用途に応じて調整してください

  } catch (err) {
    console.error('Error exchanging code for tokens:', err);
    return res.status(500).json({ error: 'Failed to exchange code for tokens' });
  }
}
