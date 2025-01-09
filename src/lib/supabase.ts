// 例: src/lib/supabase.ts などに置く
import { supabase } from '@/utils/supabaseClient';

type TrackToSave = {
  spotify_track_id: string;
  user_id: string;  // このトラックを取得したユーザーのID
  name: string;
  artist_name: string;
  album_name: string;
  image_url?: string;
};

export async function saveTracksToSupabase(
  tracks: TrackToSave[]
): Promise<void> {
  if (tracks.length === 0) return;

  // 大量のレコードを都度1件ずつ upsert するとパフォーマンスが低下する可能性があるため、
  // まとめて upsert する方法を推奨。
  // Supabase の from(...).upsert([...]) で配列を一括 upsert できます。
  const { data, error } = await supabase
    .from('tracks')
    .upsert(tracks, {
      onConflict: 'spotify_track_id',
    });

  if (error) {
    console.error('Error saving tracks to Supabase:', error);
    throw error;
  }

  console.log('Tracks saved to Supabase:', data);
}
