// pages/api/tracks.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/utils/supabaseClient';  // あなたのSupabaseクライアントへのパス

// 受け取るデータの型
type TrackUpdateData = {
  spotify_track_id: string;
  user_id: string;           // ログイン中のユーザーID（spotify_user_id） 
  song_favorite_level?: number | null;
  can_singing?: boolean | null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'PUT') {
    try {
      // PUTリクエストで渡されるであろう JSON ボディをパース
      const { trackUpdates } = req.body as { trackUpdates: TrackUpdateData[] };

      // trackUpdatesは配列で受け取る想定
      if (!Array.isArray(trackUpdates)) {
        return res.status(400).json({ error: 'Invalid request body' });
      }

      // Supabaseの upsert で一括保存
      const { data, error } = await supabase
        .from('tracks')
        .upsert(trackUpdates, {
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

  // それ以外のメソッドは 405 を返す
  res.setHeader('Allow', ['PUT']);
  return res.status(405).json({ error: 'Method not allowed' });
}
