// pages/tracks/index.tsx
import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { supabase } from '@/utils/supabaseClient';
import Image from 'next/image';

// ★ Material UI コンポーネントをインポート
import {
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
  FormControlLabel,
  Checkbox
} from '@mui/material';

type TrackData = {
  spotify_track_id: string;
  image_url?: string;
  name: string;
  artist_name?: string;
  album_name?: string;
  user_id: string; // DBでの参照外部キー
  song_favorite_level?: number | null; // 0~5あたり?
  can_singing?: number | null;         // 0 or 1 or null
};

export default function TrackClassificationPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  // 楽曲データ
  const [tracks, setTracks] = useState<TrackData[]>([]);
  // ローカルの変更データ
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
  // お気に入り度: ラジオボタン(MUI)
  // ==========================
  // level: number or null
  const handleSongFavoriteLevelChange = (trackId: string, level: number | null) => {
    setUpdatedTracks((prev) => {
      const newMap = new Map(prev);
      const original = newMap.get(trackId) || tracks.find((t) => t.spotify_track_id === trackId);
      if (!original) return newMap;
      newMap.set(trackId, { ...original, song_favorite_level: level });
      return newMap;
    });
  };

  // ==========================
  // 歌えるかどうか: チェックボックス(MUI)
  // ==========================
  // checked => true => can_singing=1, false => can_singing=0
  const handleCanSingingChange = (trackId: string, checked: boolean) => {
    setUpdatedTracks((prev) => {
      const newMap = new Map(prev);
      const original = newMap.get(trackId) || tracks.find((t) => t.spotify_track_id === trackId);
      if (!original) return newMap;
      newMap.set(trackId, { ...original, can_singing: checked ? 1 : 0 });
      return newMap;
    });
  };

  // ==========================
  // 入力済み件数と分類完了曲
  // ==========================
  const updatedCount = Array.from(updatedTracks.values()).filter(
    (t) => t.song_favorite_level != null && t.can_singing != null
  ).length;

  // DB 上で既に song_favorite_level, can_singing が設定済みの曲
  const completedTracks = tracks.filter(
    (t) => t.song_favorite_level != null && t.can_singing != null
  );

  // ==========================
  // 保存ボタン
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

      // 更新成功 -> updatedTracksクリア -> DB再取得
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

  return (
    <div className="flex flex-col min-h-screen">
      {/* ヘッダー */}
      <header className="p-4 bg-gray-800 text-white text-center">
        <h1 className="text-2xl font-bold">曲の分類 (MUI)</h1>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 p-4">
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <p>
            このページでは、以下のように曲の分類ができます。<br />
            - お気に入り度（song_favorite_level）は1〜5段階<br />
            - 歌えるか歌えないか（can_singing）は 0/1 または未選択
          </p>
        </div>

        {/* ======== Mobile向けUI ======== */}
        <div className="block md:hidden">
          <h2 className="text-xl font-semibold mb-2">曲一覧 (Mobile Layout)</h2>
          {tracks.map((track) => {
            const updated = updatedTracks.get(track.spotify_track_id);
            const favoriteValue = updated?.song_favorite_level ?? track.song_favorite_level;
            const canSinging = updated?.can_singing ?? track.can_singing;

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

                {/* MUI - RadioGroup (お気に入り度) */}
                <div className="mt-2">
                  <FormControl>
                    <FormLabel>曲の好き度</FormLabel>
                    <RadioGroup
                      row
                      value={favoriteValue == null ? '' : String(favoriteValue)}
                      onChange={(e) => {
                        const val = e.target.value;
                        // '' => null
                        if (val === '') {
                          handleSongFavoriteLevelChange(track.spotify_track_id, null);
                        } else {
                          handleSongFavoriteLevelChange(track.spotify_track_id, Number(val));
                        }
                      }}
                    >
                      {/* ラジオ: 未選択 */}
                      <FormControlLabel
                        value=""
                        control={<Radio />}
                        label="未選択"
                      />
                      {[1,2,3,4,5].map((num) => (
                        <FormControlLabel
                          key={num}
                          value={String(num)}
                          control={<Radio />}
                          label={String(num)}
                        />
                      ))}
                    </RadioGroup>
                  </FormControl>
                </div>

                {/* MUI - CheckBox (歌えるかどうか) */}
                <div className="mt-2">
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={canSinging === 1}
                        onChange={(e) =>
                          handleCanSingingChange(track.spotify_track_id, e.target.checked)
                        }
                      />
                    }
                    label="歌える"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* ======== PC向けUI ======== */}
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
                const updated = updatedTracks.get(track.spotify_track_id);
                const favoriteValue = updated?.song_favorite_level ?? track.song_favorite_level;
                const canSinging = updated?.can_singing ?? track.can_singing;

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

                    {/* お気に入り度 (RadioGroup) */}
                    <td className="p-2 border">
                      <FormControl>
                        <FormLabel>お気に入り度</FormLabel>
                        <RadioGroup
                          row
                          value={favoriteValue == null ? '' : String(favoriteValue)}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '') {
                              handleSongFavoriteLevelChange(track.spotify_track_id, null);
                            } else {
                              handleSongFavoriteLevelChange(track.spotify_track_id, Number(val));
                            }
                          }}
                        >
                          <FormControlLabel
                            value=""
                            control={<Radio />}
                            label="未選択"
                          />
                          {[1,2,3,4,5].map((num) => (
                            <FormControlLabel
                              key={num}
                              value={String(num)}
                              control={<Radio />}
                              label={String(num)}
                            />
                          ))}
                        </RadioGroup>
                      </FormControl>
                    </td>

                    {/* 歌える？ (CheckBox) */}
                    <td className="p-2 border text-center">
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={canSinging === 1}
                            onChange={(e) =>
                              handleCanSingingChange(track.spotify_track_id, e.target.checked)
                            }
                          />
                        }
                        label="歌える"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 分類完了曲 */}
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
                    お気に入り度: {track.song_favorite_level ?? '未選択'}
                    <br />
                    歌える?:
                    {track.can_singing === 1
                      ? '歌える'
                      : track.can_singing === 0
                      ? '歌えない'
                      : '未選択'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* フッター */}
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
