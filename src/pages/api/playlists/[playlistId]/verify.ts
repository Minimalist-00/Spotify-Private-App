// src/pages/api/playlists/[playlistId]/verify.ts
import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

interface SpotifyTrack {
  track: {
    id: string | null;
    is_local?: boolean;
    type?: string; // 'track' | 'episode' など
    name: string;
    album: { name: string; images: { url: string }[] };
    artists: { name: string }[];
  };
}

interface SpotifyPlaylistTracksResponse {
  items: SpotifyTrack[];
  next: string | null;
}

/** Audio Feature の例 */
interface AudioFeature {
  id: string;
  danceability: number;
  energy: number;
  tempo: number;
}

const verifyHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { playlistId } = req.query;

  // バリデーション
  if (!playlistId || typeof playlistId !== 'string') {
    return res.status(400).json({ error: 'Invalid playlist ID' });
  }

  // Cookie から access_token を読み取るロジック (任意の実装)
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
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 1) プレイリストの全トラックIDを取得
    const allTracks: SpotifyTrack[] = [];
    let nextUrl: string | null = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;

    while (nextUrl) {
      const resp = await axios.get<SpotifyPlaylistTracksResponse>(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      allTracks.push(...resp.data.items);
      nextUrl = resp.data.next;
    }

    // 2) ローカルファイル or Podcast を除外: 取得不可とみなす
    const unavailableLocalOrPodcastIds: string[] = [];
    const validTrackIds: string[] = [];

    for (const item of allTracks) {
      const t = item.track;
      if (!t.id) {
        // ID が null のもの (実態がない場合)
        unavailableLocalOrPodcastIds.push('(null ID)');
        continue;
      }
      // local track or episode/podcast
      if (t.is_local || (t.type && t.type !== 'track')) {
        unavailableLocalOrPodcastIds.push(t.id);
      } else {
        // Audio Features取得の可能性がある曲
        validTrackIds.push(t.id);
      }
    }

    // 3) Audio Features の取得検証
    const successIds: string[] = [];
    const failedIds: string[] = [];

    const chunkSize = 100;
    for (let i = 0; i < validTrackIds.length; i += chunkSize) {
      const chunk = validTrackIds.slice(i, i + chunkSize);

      try {
        // chunk まとめて取得
        const featuresResponse = await axios.get<{ audio_features: AudioFeature[] }>(
          'https://api.spotify.com/v1/audio-features',
          {
            headers: { Authorization: `Bearer ${access_token}` },
            params: { ids: chunk.join(',') },
          }
        );

        // AudioFeatures配列をチェック
        for (let idx = 0; idx < featuresResponse.data.audio_features.length; idx++) {
          const f = featuresResponse.data.audio_features[idx];
          if (f && f.id) {
            // 取得成功
            successIds.push(f.id);
          } else {
            // f が null or undefined
            // chunk の対応する trackId を failedIds に入れる
            const failId = chunk[idx];
            failedIds.push(failId);
            console.warn('Audio feature is null for ID:', failId);
          }
        }
      } catch (error: unknown) {
        // chunk 取得失敗 → 個別に呼んでみて原因を特定
        console.error('Error fetching audio features for chunk:', (error as Error).message);

        // chunk 内の各トラックIDを個別に呼び出して検証
        for (const singleId of chunk) {
          try {
            const singleResp = await axios.get<AudioFeature>(
              `https://api.spotify.com/v1/audio-features/${singleId}`,
              {
                headers: { Authorization: `Bearer ${access_token}` },
              }
            );
            if (singleResp.data && singleResp.data.id) {
              // 取得成功
              successIds.push(singleResp.data.id);
            } else {
              failedIds.push(singleId);
              console.warn('Audio feature is null for ID:', singleId);
            }
          } catch (singleErr: unknown) {
            failedIds.push(singleId);

            if (singleErr) {
              console.warn(
                'Audio feature request failed for track:',
                singleId,
                'Status code:',
                singleErr
              );
            } else {
              console.warn(
                'Audio feature request failed for track:',
                singleId,
                singleErr
              );
            }
          }
        }
      }
    }

    // 4) 結果をまとめて返却
    console.log('--- Verify Results ---');
    console.log('Total tracks from playlist:', allTracks.length);
    console.log('Local/Podcast/unavailable IDs:', unavailableLocalOrPodcastIds);
    console.log('AudioFeatures Success:', successIds.length);
    console.log('AudioFeatures Fail:', failedIds.length);

    // 重複IDを整理 (万が一、何度か登録されてしまった場合に備えて)
    const uniqueSuccess = Array.from(new Set(successIds));
    const uniqueFail = Array.from(new Set(failedIds));
    const uniqueLocalOrPodcast = Array.from(new Set(unavailableLocalOrPodcastIds));

    res.status(200).json({
      playlistId,
      totalTracks: allTracks.length,
      successIds: uniqueSuccess,
      failedIds: uniqueFail,
      unavailableLocalOrPodcastIds: uniqueLocalOrPodcast,
    });
  } catch (err: unknown) {
    console.error('Error verifying tracks for playlist:', err);
    return res.status(500).json({ error: 'Failed to verify tracks' });
  }
};

export default verifyHandler;
