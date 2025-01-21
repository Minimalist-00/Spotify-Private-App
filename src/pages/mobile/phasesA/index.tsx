import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/utils/supabaseClient';
import Link from 'next/link';
import Image from 'next/image';

type TrackData = {
  spotify_track_id: string;
  user_id: string;
  name: string;
  artist_name?: string;
  album_name?: string;
  image_url?: string;
  can_singing?: number | null;
  song_favorite_level?: number | null;
};

export default function PhasesPage() {
  const router = useRouter();
  const { session_id, phase_id, phase_numbers, directions } = router.query;

  const phaseNumbersNum = phase_numbers ? Number(phase_numbers) : 0;
  const directionNum = directions ? Number(directions) : 0;

  const [userA, setUserA] = useState<string | null>(null);
  const [myTracks, setMyTracks] = useState<TrackData[]>([]);
  const [selectedTrack, setSelectedTrack] = useState('');

  useEffect(() => {
    if (!session_id) return;

    const fetchSessionUsers = async () => {
      const { data, error } = await supabase
        .from('sessions2')
        .select('user_a, user_b')
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

  useEffect(() => {
    if (!userA) return;
    if (directionNum !== 1) return;

    const fetchMyTracks = async () => {
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('user_id', userA);
      if (error) {
        console.error('Error fetching tracks:', error);
        return;
      }
      if (data) {
        setMyTracks(data as TrackData[]);
      }
    };
    fetchMyTracks();
  }, [userA, directionNum]);

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

    const { error: upError } = await supabase
      .from('phases')
      .update({
        select_tracks: selectedTrack,
        select_tracks_user_id: userASpotifyId,
      })
      .eq('id', phase_id);

    if (upError) {
      console.error('phases update error:', upError);
      alert('曲の決定に失敗しました');
      return;
    }
    alert('曲を決定しました');
    router.push({
      pathname: '/phasesA/player',
      query: {
        session_id,
        phase_id,
        phase_numbers,
        directions,
      },
    });
  };

  const handleGotoDialogue = () => {
    router.push({
      pathname: '/phasesA/dialog',
      query: {
        session_id,
        phase_id,
        phase_numbers,
        directions,
      },
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
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">{phaseNumbersNum} フェーズ目です</h1>
      <p className="mb-4">以下の楽曲から1つ選んでください。</p>

      {myTracks.length === 0 ? (
        <p className="text-center">楽曲がありません。</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          {myTracks.map((track) => (
            <div
              key={track.spotify_track_id}
              className={`relative flex border rounded-lg p-4 shadow ${
                selectedTrack === track.spotify_track_id ? 'border-green-500' : 'border-gray-300'
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
