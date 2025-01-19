// src/pages/ipad/phaseA/index.tsx

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
  const [userB, setUserB] = useState<string | null>(null);
  const [userATracks, setUserATracks] = useState<TrackData[]>([]);
  const [userBTracks, setUserBTracks] = useState<TrackData[]>([]);
  const [selectedTrack, setSelectedTrack] = useState('');

  // 追加: 楽曲名の検索キーワード
  const [searchTermA, setSearchTermA] = useState('');
  const [searchTermB, setSearchTermB] = useState('');

  useEffect(() => {
    if (!session_id) return;

    const fetchSessionUsers = async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('user_a, user_b')
        .eq('id', session_id)
        .single();

      if (error || !data) {
        console.error('Failed to fetch session user_a', error);
        return;
      }
      setUserA(data.user_a);
      setUserB(data.user_b);
    };

    fetchSessionUsers();
  }, [session_id]);

  useEffect(() => {
    if (!userA) return;
    if (!userB) return;

    const fetchUserATracks = async () => {
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .neq('self_disclosure_level', 0)
        .eq('user_id', userA);

      if (error) {
        console.error('Error fetching tracks:', error);
        return;
      }
      if (data) {
        setUserATracks(data as TrackData[]);
      }
    };

    const fetchUserBTracks = async () => {
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .neq('self_disclosure_level', 0)
        .eq('user_id', userB);

      if (error) {
        console.error('Error fetching tracks:', error);
        return;
      }
      if (data) {
        setUserBTracks(data as TrackData[]);
      }
    };

    fetchUserATracks();
    fetchUserBTracks();
  }, [userA, userB]);

  // ユーザーA用の楽曲リストをフィルタリング (検索)
  const filteredUserATracks = userATracks.filter(track =>
    track.name.toLowerCase().includes(searchTermA.toLowerCase())
  );

  // ユーザーB用の楽曲リストをフィルタリング (検索)
  const filteredUserBTracks = userBTracks.filter(track =>
    track.name.toLowerCase().includes(searchTermB.toLowerCase())
  );

  const handleSelectUserATracks = async () => {
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
      pathname: '/ipad/phaseA/player',
      query: {
        session_id,
        phase_id,
        phase_numbers,
        directions,
      },
    });
  };

  const handleSelectUserBTracks = async () => {
    if (!phase_id || !selectedTrack) {
      alert('曲が選択されていません');
      return;
    }

    const { data: userBData, error: userBError } = await supabase
      .from('users')
      .select('spotify_user_id')
      .eq('spotify_user_id', userB)
      .single();

    if (userBError || !userBData) {
      alert('userBのspotify_user_id 取得失敗');
      return;
    }
    const userBSpotifyId = userBData.spotify_user_id;

    const { error: upError } = await supabase
      .from('phases')
      .update({
        select_tracks: selectedTrack,
        select_tracks_user_id: userBSpotifyId,
      })
      .eq('id', phase_id);

    if (upError) {
      console.error('phases update error:', upError);
      alert('曲の決定に失敗しました');
      return;
    }
    alert('曲を決定しました');
    router.push({
      pathname: '/ipad/phaseA/player',
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
      <div className="flex flex-col items-center justify-center w-screen h-screen bg-gray-100">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-xl text-center">
          <h1 className="text-3xl font-bold mb-6">ご協力ありがとうございました</h1>
          <Link href="/" className="text-xl text-blue-600 underline">
            トップに戻る
          </Link>
        </div>
      </div>
    );
  }

  // directionNum === 1 (ユーザーAが曲を選ぶ) の画面
  if (directionNum === 1) {
    return (
      <div className="flex flex-col w-screen h-screen bg-gray-100 p-6">
        <div className="flex-grow overflow-auto">
          <h1 className="text-3xl font-bold mb-4 text-center">
            {phaseNumbersNum} フェーズ目です
          </h1>
          <p className="mb-6 text-center text-lg">
            以下の楽曲から1つ選んでください。
          </p>

          {/* 追加: 検索入力欄 */}
          <div className="mb-4 flex justify-center">
            <input
              className="border border-gray-300 rounded-md p-2 w-64"
              type="text"
              value={searchTermA}
              onChange={(e) => setSearchTermA(e.target.value)}
              placeholder="楽曲名で検索"
            />
          </div>

          {filteredUserATracks.length === 0 ? (
            <p className="text-center text-xl">該当する楽曲がありません。</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {filteredUserATracks.map((track) => (
                <div
                  key={track.spotify_track_id}
                  className={`relative flex items-center border rounded-lg p-4 shadow cursor-pointer ${
                    selectedTrack === track.spotify_track_id
                      ? 'border-green-500'
                      : 'border-gray-300'
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

        <div className="mt-4">
          <button
            onClick={handleSelectUserATracks}
            className="w-full py-4 bg-blue-600 text-white text-2xl rounded-lg hover:bg-blue-700"
            disabled={!selectedTrack}
          >
            曲を決定する
          </button>
        </div>
      </div>
    );
  }

  // directionNum === 2 (ユーザーBが曲を選ぶ) の画面
  if (directionNum === 2) {
    return (
      <div className="flex flex-col w-screen h-screen bg-gray-100 p-6">
        <div className="flex-grow overflow-auto">
          <h1 className="text-3xl font-bold mb-4 text-center">
            {phaseNumbersNum} フェーズ目です
          </h1>
          <p className="mb-6 text-center text-lg">
            以下の楽曲から1つ選んでください。
          </p>

          {/* 追加: 検索入力欄 */}
          <div className="mb-4 flex justify-center">
            <input
              className="border border-gray-300 rounded-md p-2 w-64"
              type="text"
              value={searchTermB}
              onChange={(e) => setSearchTermB(e.target.value)}
              placeholder="楽曲名で検索"
            />
          </div>

          {filteredUserBTracks.length === 0 ? (
            <p className="text-center text-xl">該当する楽曲がありません。</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {filteredUserBTracks.map((track) => (
                <div
                  key={track.spotify_track_id}
                  className={`relative flex items-center border rounded-lg p-4 shadow cursor-pointer ${
                    selectedTrack === track.spotify_track_id
                      ? 'border-green-500'
                      : 'border-gray-300'
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

        <div className="mt-4">
          <button
            onClick={handleSelectUserBTracks}
            className="w-full py-4 bg-blue-600 text-white text-2xl rounded-lg hover:bg-blue-700"
            disabled={!selectedTrack}
          >
            曲を決定する
          </button>
        </div>
      </div>
    );
  }
}
