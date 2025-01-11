import React, { useEffect, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { supabase } from '@/utils/supabaseClient';

// ユーザー情報の型 (最低限)
type UserData = {
  spotify_user_id: string;     // PK
  display_name: string | null; // 名前
};

type TrackData = {
  spotify_track_id: string;  // PK
  user_id: string;           // users.spotify_user_id 参照
  name: string;
  artist_name?: string;
  album_name?: string;
};

export default function PlaylistPage() {
  const { data: session, status } = useSession();
  const [allUsers, setAllUsers] = useState<UserData[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>(''); // 選択されたユーザーID
  const [tracks, setTracks] = useState<TrackData[]>([]);

  // 認証チェック
  useEffect(() => {
    // 未認証ならログイン促す（またはリダイレクト）
    if (status === 'unauthenticated') {
      signIn('spotify');
    }
  }, [status]);

  // 1) 全ユーザー一覧を取得
  useEffect(() => {
    const fetchAllUsers = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('spotify_user_id, display_name')
        // .limit(100) など必要に応じて
      if (error) {
        console.error('Error fetching users:', error);
        return;
      }
      if (data) {
        setAllUsers(data as UserData[]);
      }
    };
    fetchAllUsers();
  }, []);

  // 2) 選択されたユーザーIDが変わるたびに、そのユーザーの楽曲を取得
  useEffect(() => {
    if (!selectedUserId) {
      setTracks([]);
      return;
    }

    const fetchTracksByUser = async () => {
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('user_id', selectedUserId);   // user_id(=users.spotify_user_id)と合致
      if (error) {
        console.error('Error fetching tracks:', error);
        return;
      }
      if (data) {
        setTracks(data as TrackData[]);
      }
    };
    fetchTracksByUser();
  }, [selectedUserId]);

  if (status === 'loading') {
    return <div>Loading...</div>;
  }
  if (!session) {
    return <div>Please login...</div>;
  }

  // ユーザー名の取得
  const getUserName = (userId: string) => {
    const u = allUsers.find((u) => u.spotify_user_id === userId);
    return u?.display_name ?? userId;
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">他ユーザーの楽曲再生ページ</h1>

      {/* ====== 1) ユーザー選択 ====== */}
      <div className="mb-4">
        <label className="mr-2 font-semibold">ユーザーを選択:</label>
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          className="border p-1 rounded"
        >
          <option value="">--ユーザーを選択--</option>
          {allUsers.map((user) => (
            <option key={user.spotify_user_id} value={user.spotify_user_id}>
              {user.display_name || user.spotify_user_id}
            </option>
          ))}
        </select>
      </div>

      {/* ====== 2) 選択されたユーザーの曲一覧 ====== */}
      {selectedUserId && (
        <div>
          <h2 className="text-xl font-semibold mb-2">
            {getUserName(selectedUserId)} さんの楽曲
          </h2>
          {tracks.length === 0 ? (
            <p>楽曲がありません</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tracks.map((track) => (
                <div key={track.spotify_track_id} className="border p-4 rounded">
                  <h3 className="font-bold text-lg">{track.name}</h3>
                  <p className="text-sm text-gray-500">{track.artist_name}</p>
                  <p className="text-sm text-gray-500">{track.album_name}</p>

                  {/* 3) 楽曲を再生 (例: 埋め込みiframe 30秒プレビュー) */}
                  <div className="mt-2">
                    <iframe
                      src={`https://open.spotify.com/embed/track/${track.spotify_track_id}`}
                      width="100%"
                      height="80"
                      frameBorder="0"
                      allow="encrypted-media"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
