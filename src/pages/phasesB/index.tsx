import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/utils/supabaseClient';
import Link from 'next/link';

type TrackData = {
  spotify_track_id: string;
  user_id: string;
  name: string;
  artist_name?: string;
  album_name?: string;
  image_url?: string;
  self_disclosure_level?: number;
};

export default function PhasesPage() {
  const router = useRouter();
  const { session_id, phase_id, phase_numbers, directions } = router.query;

  const phaseNumbersNum = phase_numbers ? Number(phase_numbers) : 0;
  const directionNum = directions ? Number(directions) : 0;

  const [tracks, setTracks] = useState<TrackData[]>([]);
  const [selectedTrack, setSelectedTrack] = useState('');

  // ================================
  // フェーズごとのself_disclosure_level範囲を設定
  // ================================
  const getDisclosureLevelRange = (phase: number): number[] => {
    if (phase === 1 || phase === 2) return [1];
    if (phase === 3 || phase === 4) return [1, 2];
    if (phase === 5 || phase === 6) return [2, 3];
    if (phase === 7 || phase === 8) return [3, 4];
    return []; // 不正なフェーズ番号
  };

  // ================================
  // フェーズに応じた楽曲を取得
  // ================================
  useEffect(() => {
    const fetchTracksForPhase = async () => {
      const levelRange = getDisclosureLevelRange(phaseNumbersNum);

      if (levelRange.length === 0) {
        console.error('Invalid phase number');
        return;
      }

      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .in('self_disclosure_level', levelRange);

      if (error) {
        console.error('Error fetching tracks:', error);
        return;
      }

      if (data && data.length > 0) {
        // ランダムに3曲選択
        const randomTracks = data.sort(() => 0.5 - Math.random()).slice(0, 3);
        setTracks(randomTracks);
      }
    };

    fetchTracksForPhase();
  }, [phaseNumbersNum]);

  // ================================
  // 「曲を決定する」ボタン
  // ================================
  const handleSelectTrack = async () => {
    if (!phase_id || !selectedTrack) {
      alert('曲が選択されていません');
      return;
    }

    const { error } = await supabase
      .from('phases')
      .update({
        select_tracks: selectedTrack,
      })
      .eq('id', phase_id);

    if (error) {
      console.error('Error updating phase:', error);
      alert('曲の決定に失敗しました');
      return;
    }
    alert('曲を決定しました');
    router.push({
      pathname: '/phasesB/player',
      query: { session_id, phase_id, phase_numbers, directions },
    });
  };

  const handleGotoDialogue = () => {
    // ページ下部に「対話セクションに移動する」ボタン → /phases/dialog
    router.push({
      pathname: '/phasesB/dialog',
      query: {
        session_id,
        phase_id,
        phase_numbers,
        directions
      }
    });
  };

  // ================================
  // UI分岐
  // ================================
  if (phaseNumbersNum === 9) {
    return (
      <div className="p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">ご協力ありがとうございました</h1>
        <Link href="/" className="text-blue-500 underline">
          トップに戻る
        </Link>
      </div>
    );
  }

  if (directionNum === 0) {
    return (
      <div className="p-4">
        <h1>{phaseNumbersNum} フェーズ目です</h1>
        <p>相手の選択した楽曲を聴きましょう。</p>
        <button
          onClick={handleGotoDialogue}
          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
        >
          対話セクションに移動する
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1>{phaseNumbersNum} フェーズ目です</h1>
      <p>以下の推薦曲から1つ選んでください。</p>

      {tracks.length === 0 ? (
        <p>推薦曲がありません。</p>
      ) : (
        tracks.map((track) => (
          <div key={track.spotify_track_id} className="mb-2 border-b pb-2">
            <label>
              <input
                type="radio"
                name="selectedTrack"
                value={track.spotify_track_id}
                checked={selectedTrack === track.spotify_track_id}
                onChange={() => setSelectedTrack(track.spotify_track_id)}
              />
              {track.name} (ID: {track.spotify_track_id})
            </label>
            <p>{track.artist_name}</p>
          </div>
        ))
      )}

      <button
        onClick={handleSelectTrack}
        className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
      >
        曲を決定する
      </button>
    </div>
  );
}
