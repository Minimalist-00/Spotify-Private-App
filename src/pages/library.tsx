// pages/tracks/index.tsx
import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react'; // next-auth使用例
import { supabase } from '@/utils/supabaseClient';
import Image from 'next/image';

type TrackData = {
  spotify_track_id: string;
  image_url?: string;
  name: string;
  artist_name?: string;
  album_name?: string;
  user_id: string; // DBでの参照外部キー
  song_favorite_level?: number | null;
  // can_singing は integer (0|1) or null を想定
  can_singing?: number | null;  
};

export default function TrackClassificationPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id; // 例: session.user.id に spotify_user_idが入っていると仮定

  // 取得した楽曲データ
  const [tracks, setTracks] = useState<TrackData[]>([]);
  // ローカルで変更したデータを覚えておく
  const [updatedTracks, setUpdatedTracks] = useState<Map<string, TrackData>>(new Map());

  // DBからユーザーの楽曲一覧を取得
  useEffect(() => {
    if (!userId) return;

    const fetchTracks = async () => {
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching tracks:', error);
        return;
      }
      if (data) {
        setTracks(data as TrackData[]);
      }
    };
    fetchTracks();
  }, [userId]);

  // ==========================
  // お気に入り度 (1〜5) セレクト
  // ==========================
  const handleSongFavoriteLevelChange = (trackId: string, level: number) => {
    setUpdatedTracks((prev) => {
      const newMap = new Map(prev);
      const original = newMap.get(trackId) || tracks.find((t) => t.spotify_track_id === trackId);
      if (!original) return newMap;
      newMap.set(trackId, { ...original, song_favorite_level: level });
      return newMap;
    });
  };

  // ==========================
  // 歌えるか (0|1|null) セレクト
  // ==========================
  const handleCanSingingChange = (trackId: string, value: string) => {
    // value は '0'|'1'|'' (未選択)
    let newValue: number | null;
    if (value === '1') {
      newValue = 1;   // 歌える
    } else if (value === '0') {
      newValue = 0;   // 歌えない
    } else {
      newValue = null; // 未選択
    }

    setUpdatedTracks((prev) => {
      const newMap = new Map(prev);
      const original = newMap.get(trackId) || tracks.find((t) => t.spotify_track_id === trackId);
      if (!original) return newMap;
      newMap.set(trackId, { ...original, can_singing: newValue });
      return newMap;
    });
  };

  // ==========================
  // 入力済み件数と分類完了曲
  // ==========================
  // 「song_favorite_level」と「can_singing」が両方とも null でなければ入力済みとみなす
  const updatedCount = Array.from(updatedTracks.values()).filter(
    (t) => t.song_favorite_level != null && t.can_singing != null
  ).length;

  // DB 上で既に song_favorite_level, can_singing が設定済みの曲
  const completedTracks = tracks.filter(
    (t) => t.song_favorite_level != null && t.can_singing != null
  );

  // ==========================
  // 保存ボタン (Upsert)
  // ==========================
  const handleSave = async () => {
    if (updatedTracks.size === 0) return;

    const trackUpdates = Array.from(updatedTracks.values()).map((t) => ({
      spotify_track_id: t.spotify_track_id,
      user_id: t.user_id,
      song_favorite_level: t.song_favorite_level,
      can_singing: t.can_singing,
    }));

    try {
      const res = await fetch('/api/tracks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackUpdates }),
      });
      if (!res.ok) {
        console.error('Failed to upsert tracks', await res.text());
        return;
      }

      // 成功時は updatedTracks をクリア → DB再取得
      setUpdatedTracks(new Map());
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('user_id', userId);
      if (error) {
        console.error('Error refetching tracks after save:', error);
      } else if (data) {
        setTracks(data as TrackData[]);
      }
    } catch (err) {
      console.error('Save error:', err);
    }
  };

  // ==========================
  // レスポンシブUI
  // ==========================
  return (
    <div className="flex flex-col min-h-screen">
      {/* ヘッダー */}
      <header className="p-4 bg-gray-800 text-white text-center">
        <h1 className="text-2xl font-bold">曲の分類</h1>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 p-4">
        {/* コールアウト枠（説明） */}
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <p>
            このページでは、以下のように曲の分類ができます。<br />
            - お気に入り度（song_favorite_level）は1〜5段階<br />
            - 歌えるか歌えないか（can_singing）は 0/1 または未選択
          </p>
        </div>

        {/* ========== Mobile向けUI ========== */}
        <div className="block md:hidden">
          <h2 className="text-xl font-semibold mb-2">曲一覧 (Mobile Layout)</h2>
          {tracks.map((track) => {
            const updateObj = updatedTracks.get(track.spotify_track_id);
            const favoriteValue = updateObj?.song_favorite_level ?? track.song_favorite_level ?? '';

            // can_singing = 1->'1', 0->'0', null->''
            const singingState = updateObj?.can_singing ?? track.can_singing;
            const singingValue =
              singingState === 1 ? '1'
              : singingState === 0 ? '0'
              : '';

            return (
              <div key={track.spotify_track_id} className="mb-4 border-b pb-2">
                <div className="flex gap-2">
                  {track.image_url && (
                    <Image
                      src={track.image_url || '/placeholder.png'}
                      alt={track.name || 'No Album'}
                      width={64}
                      height={64}
                      className="object-cover"
                    />
                  )}
                  <div>
                    <div className="font-bold">{track.name}</div>
                    <div className="text-sm text-gray-600">{track.artist_name}</div>
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  {/* お気に入り度 */}
                  <select
                    value={favoriteValue}
                    onChange={(e) => handleSongFavoriteLevelChange(
                      track.spotify_track_id,
                      Number(e.target.value)
                    )}
                    className="border rounded p-1"
                  >
                    <option value="">曲の好き度</option>
                    {[1,2,3,4,5].map((num) => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>

                  {/* can_singing (0 or 1 or null) */}
                  <select
                    value={singingValue}
                    onChange={(e) => handleCanSingingChange(
                      track.spotify_track_id,
                      e.target.value
                    )}
                    className="border rounded p-1"
                  >
                    <option value="">歌えるかどうか</option>
                    <option value="1">歌える</option>
                    <option value="0">歌えない</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>

        {/* ========== PC向けUI ========== */}
        <div className="hidden md:block">
          <h2 className="text-xl font-semibold mb-2">曲一覧 (PC Layout)</h2>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-200">
                <th className="p-2 border">画像</th>
                <th className="p-2 border">曲名</th>
                <th className="p-2 border">アーティスト</th>
                <th className="p-2 border">お気に入り度</th>
                <th className="p-2 border">歌える？</th>
              </tr>
            </thead>
            <tbody>
              {tracks.map((track) => {
                const updateObj = updatedTracks.get(track.spotify_track_id);
                const favoriteValue = updateObj?.song_favorite_level ?? track.song_favorite_level ?? '';

                const singingState = updateObj?.can_singing ?? track.can_singing;
                const singingValue =
                  singingState === 1 ? '1'
                  : singingState === 0 ? '0'
                  : '';

                return (
                  <tr key={track.spotify_track_id} className="border-b">
                    <td className="p-2 border text-center">
                      {track.image_url && (
                        <Image
                          src={track.image_url || '/placeholder.png'}
                          alt={track.name || 'No Album'}
                          width={64}
                          height={64}
                          className="object-cover mx-auto"
                        />
                      )}
                    </td>
                    <td className="p-2 border">{track.name}</td>
                    <td className="p-2 border">{track.artist_name}</td>
                    <td className="p-2 border">
                      <select
                        value={favoriteValue}
                        onChange={(e) => handleSongFavoriteLevelChange(
                          track.spotify_track_id,
                          Number(e.target.value)
                        )}
                        className="border rounded p-1"
                      >
                        <option value="">未選択</option>
                        {[1,2,3,4,5].map((num) => (
                          <option key={num} value={num}>{num}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2 border">
                      <select
                        value={singingValue}
                        onChange={(e) => handleCanSingingChange(
                          track.spotify_track_id,
                          e.target.value
                        )}
                        className="border rounded p-1"
                      >
                        <option value="">未選択</option>
                        <option value="1">歌える</option>
                        <option value="0">歌えない</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 分類完了曲の表示 */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold">分類完了曲</h3>
          <p>入力が完了している楽曲: {completedTracks.length} 曲</p>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedTracks.map((track) => (
              <div key={track.spotify_track_id} className="border p-2 rounded">
                {track.image_url && (
                  <Image
                    src={track.image_url || '/placeholder.png'}
                    alt={track.name || 'No Album'}
                    width={200}
                    height={200}
                    className="object-cover"
                  />
                )}
                <div className="mt-2">
                  <div className="font-bold">{track.name}</div>
                  <div>{track.artist_name}</div>
                  <div>
                    お気に入り度: {track.song_favorite_level}
                    <br />
                    歌える?: 
                    {track.can_singing === 1 ? '歌える' 
                     : track.can_singing === 0 ? '歌えない' 
                     : '未選択'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* フッター (画面下部固定) */}
      <footer className="p-4 border-t bg-white text-center sticky bottom-0">
        <p className="mb-2">現在 {updatedCount} 曲入力されています</p>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          保存
        </button>
      </footer>
    </div>
  );
}
