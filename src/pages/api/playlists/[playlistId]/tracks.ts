// src/pages/api/playlists/[playlistId]/tracks.ts

import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const tracksHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { playlistId } = req.query;

  if (!playlistId || typeof playlistId !== 'string') {
    res.status(400).json({ error: 'Invalid playlist ID' });
    return;
  }

  // Cookie からアクセストークンを取得するロジック (省略可)
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
    // --- (1) プレイリストの全トラック取得 ---
    const tracks: Track[] = [];
    let nextUrl: string | null = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;

    while (nextUrl) {
      const response = await axios.get<TracksResponse>(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });
      tracks.push(...response.data.items);
      nextUrl = response.data.next;
    }

    // --- (2) ローカルトラックや Podcast を除外しておく例 ---
    // 403 の原因の大半が "local track" or "episode" など Spotify カタログに存在しないケース。
    // これらは audio_features 取得不可のため、あらかじめ弾いておく。
    const validTrackIds = tracks
      .filter((item) => {
        // is_local が true のものや、type が 'episode' のものは除外する
        if (item.track.is_local) return false;
        if (item.track.type && item.track.type !== 'track') return false; 
        if (!item.track.id) return false;
        return true;
      })
      .map((item) => item.track.id);

    // --- (3) Audio Features を取得 ---
    //     403 が出たら chunk 内の各トラックを個別に検証するロジックを追加

    const audioFeaturesMap: Record<string, AudioFeature> = {};
    const failedTrackIds: string[] = []; // ← 取得に失敗したトラックIDを格納

    const chunkSize = 100;
    for (let i = 0; i < validTrackIds.length; i += chunkSize) {
      const chunk = validTrackIds.slice(i, i + chunkSize);

      try {
        // まとめて取得 (最大100件)
        const featuresResponse = await axios.get<{ audio_features: AudioFeature[] }>(
          'https://api.spotify.com/v1/audio-features',
          {
            headers: {
              Authorization: `Bearer ${access_token}`,
            },
            params: {
              ids: chunk.join(','),
            },
          }
        );

        for (const feature of featuresResponse.data.audio_features) {
          // feature が null の場合もあるので注意 (ローカルトラックや削除済みなど)
          if (feature && feature.id) {
            audioFeaturesMap[feature.id] = feature;
          } else {
            // 取得できなかったもの
            // (feature: null の要素が返ってくる場合がある)
            // こちらに push しておく
            const unknownId = feature?.id ?? 'Unknown or Null Feature';
            failedTrackIds.push(unknownId);
            console.warn('Audio feature is null for ID: ', unknownId);
          }
        }

      } catch (error) {
        // chunk まとめての取得が失敗 (403 等) → 個別に取得してどれがダメか切り分ける
        console.error('Error fetching audio features for chunk:', error);

        // ※ chunk 内の各トラックID を個別に呼び出してみる
        for (const singleId of chunk) {
          try {
            const singleResponse = await axios.get<AudioFeature>(
              `https://api.spotify.com/v1/audio-features/${singleId}`,
              {
                headers: {
                  Authorization: `Bearer ${access_token}`,
                },
              }
            );
            // 正常に取れた場合
            if (singleResponse.data && singleResponse.data.id) {
              audioFeaturesMap[singleResponse.data.id] = singleResponse.data;
            } else {
              failedTrackIds.push(singleId);
              console.warn('Failed to get audio feature for ID: ', singleId);
            }
          } catch (singleErr: unknown) {
            // 403 / 400など → そのIDは取得不可
            failedTrackIds.push(singleId);
            console.warn(
              'Audio feature request failed for track:',
              singleId,
              singleErr
            );
          }
        }
      }
    }

    // --- (4) トラックオブジェクトに audio_features を紐付ける ---
    //     失敗した ID は audio_features: null とする
    const tracksWithFeatures = tracks.map((item) => {
      const trackId = item.track.id;
      const audio_features = trackId ? audioFeaturesMap[trackId] : null;
      return {
        ...item,
        audio_features,
      };
    });

    // (5) レスポンスに「失敗したトラックIDの配列」を含める
    //     (UI 側で通知したい場合など)
    res.status(200).json({
      tracks: tracksWithFeatures,
      failedTrackIds, // 追加
    });
  } catch (error) {
    console.error('Error fetching tracks:', error);
    res.status(500).json({ error: 'Failed to fetch tracks' });
  }
};

export default tracksHandler;
