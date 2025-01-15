// pages/api/calculateSelfDisclosureConsole.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/utils/supabaseClient';

type TrackData = {
  spotify_track_id: string;
  user_id: string;
  song_favorite_level?: number | null;
  can_singing?: number | null;
  popularity?: number | null;
};

function computeSelfDisclosureLevel(
  songFavorite?: number | null,
  canSinging?: number | null,
  popularity?: number | null
): number {
  const hasAffection = songFavorite && songFavorite >= 3; // 'ある'
  const hasConfidence = canSinging && canSinging >= 3;    // 'ある'
  const isHighPopularity = popularity && popularity > 50; // '高い'

  if (!hasAffection && !hasConfidence && !isHighPopularity || hasConfidence === 0) {
    return 0;
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
  if (req.method === 'POST') {
    // ★ プログラム内でユーザーIDを直接指定
    const userId = '31eylccdphivi2srtmhvchcmglxa'; // 該当するユーザーIDをここで指定

    if (!userId) {
      return res.status(400).json({ error: 'ユーザーIDが指定されていません。' });
    }

    try {
      // 指定されたユーザーの楽曲データを取得
      const { data: tracks, error: fetchError } = await supabase
        .from('tracks')
        .select('*')
        .eq('user_id', userId);

      if (fetchError) {
        console.error('Fetch tracks error:', fetchError);
        return res.status(500).json({ error: '楽曲データの取得に失敗しました。' });
      }

      if (!tracks || tracks.length === 0) {
        return res.status(404).json({ error: '該当する楽曲が見つかりません。' });
      }

      // 楽曲ごとにself_disclosure_levelを計算
      const updatesWithDisclosure = tracks.map((track: TrackData) => {
        const { song_favorite_level, can_singing, popularity } = track;
        const selfDisclosure = computeSelfDisclosureLevel(
          song_favorite_level,
          can_singing,
          popularity
        );

        return {
          ...track,
          self_disclosure_level: selfDisclosure,
        };
      });

      // Supabaseのupsertで更新
      const { error: upsertError } = await supabase
        .from('tracks')
        .upsert(updatesWithDisclosure, {
          onConflict: 'spotify_track_id',
        });

      if (upsertError) {
        console.error('Upsert error:', upsertError);
        return res.status(500).json({ error: '楽曲データの更新に失敗しました。' });
      }

      return res.status(200).json({ message: '自己開示度Lv.を再計算し保存しました！' });
    } catch (error) {
      console.error('Server error:', error);
      return res.status(500).json({ error: 'サーバーエラーが発生しました。' });
    }
  }

  res.setHeader('Allow', ['POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}
