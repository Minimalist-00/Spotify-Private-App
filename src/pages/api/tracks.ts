import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/utils/supabaseClient';

// 受け取るデータの型
type TrackUpdateData = {
  spotify_track_id: string;
  user_id: string;           // ログイン中のユーザーID（spotify_user_id）
  song_favorite_level?: number | null; // 1~4
  can_singing?: number | null;         // 0~4
};

// ★ self_disclosure_level を計算する関数
function computeSelfDisclosureLevel(
  songFavorite?: number | null,
  canSinging?: number | null,
  popularity?: number
): number {
  const hasAffection = songFavorite && songFavorite >= 3; // true => 'ある', false => 'ない'
  const hasConfidence = (canSinging && canSinging >= 3);
  const isHighPopularity = (popularity && popularity > 50);

  if (!hasAffection && !hasConfidence && !isHighPopularity) {
    return 0; // 歌うべきではない
  } else if (!hasAffection && hasConfidence && isHighPopularity) {
    return 1;
  } else if (!hasAffection && !hasConfidence && isHighPopularity) {
    return 1;
  } else if (!hasAffection && hasConfidence && !isHighPopularity) {
    return 2;
  } else if (hasAffection && hasConfidence && isHighPopularity) {
    return 2;
  } else if (hasAffection && !hasConfidence && isHighPopularity) {
    return 3;
  } else if (hasAffection && hasConfidence && !isHighPopularity) {
    return 3;
  } else if (hasAffection && !hasConfidence && !isHighPopularity) {
    return 4;
  } else {
    return 0;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'PUT') {
    try {
      const { trackUpdates } = req.body as { trackUpdates: TrackUpdateData[] };
      if (!Array.isArray(trackUpdates)) {
        return res.status(400).json({ error: 'Invalid request body' });
      }

      // Spotify Track IDリストを抽出
      const spotifyTrackIds = trackUpdates.map((track) => track.spotify_track_id);

      // DBから関連するtracksデータをfetch
      const { data: trackData, error: fetchError } = await supabase
        .from('tracks')
        .select('spotify_track_id, popularity') // 必要なカラムだけ取得
        .in('spotify_track_id', spotifyTrackIds);

      if (fetchError || !trackData) {
        console.error('[tracks API] fetch error:', fetchError);
        return res.status(500).json({ error: 'Failed to fetch track data' });
      }

      // spotify_track_idをキーにしたMapを作成
      const trackPopularityMap = new Map(
        trackData.map((track) => [track.spotify_track_id, track.popularity])
      );

      // trackUpdatesにself_disclosure_levelを追加
      const updatesWithDisclosure = trackUpdates.map((track) => {
        const { song_favorite_level, can_singing, spotify_track_id } = track;
        const popularity = trackPopularityMap.get(spotify_track_id) || 0; // 人気度を取得
        const selfDisclosure = computeSelfDisclosureLevel(
          song_favorite_level,
          can_singing,
          popularity
        );

        return {
          ...track,
          self_disclosure_level: selfDisclosure, // ★ new column
        };
      });

      // Supabaseの upsert で一括保存
      const { data, error } = await supabase
        .from('tracks')
        .upsert(updatesWithDisclosure, {
          onConflict: 'spotify_track_id',
        });

      if (error) {
        console.error('[tracks API] upsert error:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ data });
    } catch (err) {
      console.error('[tracks API] error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  res.setHeader('Allow', ['PUT']);
  return res.status(405).json({ error: 'Method not allowed' });
}
