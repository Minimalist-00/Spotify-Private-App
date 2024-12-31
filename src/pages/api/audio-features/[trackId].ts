import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

interface AudioFeature {
  id: string;
  danceability: number;
  energy: number;
  tempo: number;
}

export default async function audioFeaturesHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { trackId } = req.query;

  if (!trackId || typeof trackId !== 'string') {
    return res.status(400).json({ error: 'Invalid track ID' });
  }

  // Cookie からアクセストークンを取得する例
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
    return res.status(401).json({ error: 'Unauthorized: No access token found' });
  }

  try {
    const response = await axios.get<AudioFeature>(
      `https://api.spotify.com/v1/audio-features/${trackId}`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );
    // 正常に取得できた場合
    return res.status(200).json(response.data);
  } catch (error: unknown) {
    // ここでは AxiosError を import せず、汎用的なエラーとして処理する
    const anyError = error as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    // ステータスコードを取得 (なければ 500)
    const statusCode = anyError?.response?.status || 500;
    // Spotify APIからのエラー内容を取得 (なければ空オブジェクト)
    const details = anyError?.response?.data || {};

    console.error('Error fetching audio features:', statusCode, details);

    return res.status(statusCode).json({
      error: `Failed to fetch audio features (status ${statusCode})`,
      details,
    });
  }
}
