// src/pages/ipad/phaseB/player.tsx

import SharedPlayer from '@/components/SharedPlayer';
import SpotifyPlayerControls from '@/components/SpotifyPlayerControls';
import { supabase } from '@/utils/supabaseClient';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function PlayerPage() {
  const router = useRouter();
  const { phase_id } = router.query;
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

  // phasesテーブルから `select_tracks` を取得
  useEffect(() => {
    if (!phase_id) return;
    const fetchPhase = async () => {
      const { data, error } = await supabase
        .from('phases2')
        .select('select_tracks')
        .eq('id', phase_id)
        .single();

      if (error || !data) {
        console.error('Failed to fetch phases:', error);
        return;
      }
      setSelectedTrackId(data.select_tracks);
    };
    fetchPhase();
  }, [phase_id]);

  return (
    <SharedPlayer
      phaseType="B"
      title="楽曲の再生"
      dialogueButtonDelay={30}
    >
      <SpotifyPlayerControls selectedTrackId={selectedTrackId} />
    </SharedPlayer>
  );
}
