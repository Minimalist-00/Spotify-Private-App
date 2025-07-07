import { supabase } from '@/utils/supabaseClient';
import Image from 'next/image'; // next/imageを使用
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

type TrackData = {
  spotify_track_id: string;
  user_id: string;
  name: string;
  artist_name?: string;
  album_name?: string;
  image_url?: string; // イメージURLを含む
  self_disclosure_level?: number;
};

export default function PhasesPage() {
  const router = useRouter();
  const { session_id, phase_id, phase_numbers, directions } = router.query;

  const phaseNumbersNum = phase_numbers ? Number(phase_numbers) : 0;
  const directionNum = directions ? Number(directions) : 0;

  const [userA, setUserA] = useState<string | null>(null);
  const [tracks, setTracks] = useState<TrackData[]>([]);
  const [selectedTrack, setSelectedTrack] = useState('');

  useEffect(() => {
    if (!session_id) return;

    const fetchSessionUsers = async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('user_a')
        .eq('id', session_id)
        .single();

      if (error || !data) {
        console.error('Failed to fetch session user_a', error);
        return;
      }
      setUserA(data.user_a);
    };

    fetchSessionUsers();
  }, [session_id]);

  const getDisclosureLevelRange = (phase: number): number[] => {
    if (phase === 1 || phase === 2) return [1];
    if (phase === 3 || phase === 4) return [1, 2];
    if (phase === 5 || phase === 6) return [2, 3];
    if (phase === 7 || phase === 8) return [3, 4];
    return [];
  };

  useEffect(() => {
    if (!userA) return;
    if (directionNum !== 1) return;

    const fetchTracksForPhase = async () => {
      const levelRange = getDisclosureLevelRange(phaseNumbersNum);

      if (levelRange.length === 0) {
        console.error('Invalid phase number');
        return;
      }

      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('user_id', userA)
        .in('self_disclosure_level', levelRange);

      if (error) {
        console.error('Error fetching tracks:', error);
        return;
      }

      if (data && data.length > 0) {
        const randomTracks = data.sort(() => 0.5 - Math.random()).slice(0, 3);
        setTracks(randomTracks);
      }
    };

    fetchTracksForPhase();
  }, [userA, directionNum, phaseNumbersNum]);

  const handleSelectTrack = async () => {
    if (!phase_id || !selectedTrack) {
      alert('曲が選択されていません');
      return;
    }

    const { data: userAData, error: userAError } = await supabase
      .from('users')
      .select('spotify_user_id')
      .eq('spotify_user_id', userA)
      .single();

    if (userAError || !userAData) {
      alert('userAのspotify_user_id 取得失敗');
      return;
    }
    const userASpotifyId = userAData.spotify_user_id;

    const { error } = await supabase
      .from('phases')
      .update({
        select_tracks: selectedTrack,
        select_tracks_user_id: userASpotifyId,
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
    router.push({
      pathname: '/phasesB/dialog',
      query: { session_id, phase_id, phase_numbers, directions },
    });
  };

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
        <h1 className="text-2xl font-semibold mb-4">{phaseNumbersNum} フェーズ目です</h1>
        <p className="mb-4">相手の選択した楽曲を聴きましょう。</p>
        <button
          onClick={handleGotoDialogue}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
        >
          対話セクションに移動する
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 p-4 overflow-y-auto">
        <h1 className="text-2xl font-semibold mb-4">{phaseNumbersNum} フェーズ目です</h1>
        <p className="mb-4">以下の推薦曲から1つ選んでください。</p>

        {tracks.length === 0 ? (
          <p className="text-center">推薦曲がありません。</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {tracks.map((track) => (
              <div
                key={track.spotify_track_id}
                className={`relative flex border rounded-lg p-4 shadow ${selectedTrack === track.spotify_track_id ? 'border-green-500' : 'border-gray-300'
                  }`}
                onClick={() => setSelectedTrack(track.spotify_track_id)}
              >
                {track.image_url && (
                  <Image
                    src={track.image_url}
                    alt={track.name}
                    width={70}
                    height={70}
                    className="object-cover rounded-md"
                  />
                )}
                <div className="ml-4">
                  <h2 className="font-semibold text-lg">{track.name}</h2>
                  <p className="text-sm text-gray-600">{track.album_name}</p>
                  <p className="text-sm text-gray-500">{track.artist_name}</p>
                </div>
                {selectedTrack === track.spotify_track_id && (
                  <span className="absolute top-2 right-2 text-green-500 font-semibold text-sm">
                    選択中
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg p-4">
        <button
          onClick={handleSelectTrack}
          className="w-full px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          disabled={!selectedTrack}
        >
          曲を決定する
        </button>
      </div>
    </div>
  );
}
