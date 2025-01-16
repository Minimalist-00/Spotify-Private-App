// 例: src/lib/supabase.ts などに置く
import { supabase } from '@/utils/supabaseClient';

type TrackToSave = {
  spotify_track_id: string;
  user_id: string;
  name: string;
  artist_name: string;
  album_name: string;
  image_url?: string;
  popularity: number;
  song_favorite_level?: number | null; // 特定カラム
  can_singing?: number | null;        // 特定カラム
};

export async function saveTracksToSupabase(
  tracks: TrackToSave[]
): Promise<void> {
  if (tracks.length === 0) return;

  const trackIds = tracks.map((track) => track.spotify_track_id);

  // 既存のレコードを取得
  const { data: existingTracks, error: fetchError } = await supabase
    .from('tracks')
    .select('spotify_track_id, song_favorite_level, can_singing')
    .in('spotify_track_id', trackIds);

  if (fetchError) {
    console.error('Error fetching existing tracks:', fetchError);
    throw fetchError;
  }

  // 新規データと既存データをマージ
  const existingTracksMap = new Map(
    existingTracks?.map((track) => [track.spotify_track_id, track])
  );

  const mergedTracks = tracks.map((track) => {
    const existingTrack = existingTracksMap.get(track.spotify_track_id);
    return {
      ...track,
      ...(existingTrack
        ? {
            song_favorite_level: existingTrack.song_favorite_level,
            can_singing: existingTrack.can_singing,
          }
        : {}),
    };
  });

  // マージ後のデータをアップサート
  const { data, error } = await supabase
    .from('tracks')
    .upsert(mergedTracks, {
      onConflict: 'spotify_track_id',
    });

  if (error) {
    console.error('Error saving tracks to Supabase:', error);
    throw error;
  }

  console.log('Tracks saved to Supabase:', data);
}
