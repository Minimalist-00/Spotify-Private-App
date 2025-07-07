// src/pages/ipad/sessionB/index.tsx

import { supabase } from '@/utils/supabaseClient';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

type UserData = {
  id: string;  // usersテーブルのPK
  spotify_user_id: string;
  display_name?: string;
};

export default function NewSessionPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [userA, setUserA] = useState('');       // sessions2.user_a
  const [userB, setUserB] = useState('');       // sessions2.user_b

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase.from('users').select('*');
      if (error) {
        console.error('Error fetching users:', error);
        return;
      }
      if (data) {
        setUsers(data as UserData[]);
      }
    };
    fetchUsers();
  }, []);

  const handleCreateSession = async () => {
    try {
      // 1) sessions2に INSERT
      const { data: sessions2Data, error: sessions2Error } = await supabase
        .from('sessions2')
        .insert([
          {
            user_a: userA,
            user_b: userB,
            directions: 2,
          },
        ])
        .select(); // returning

      if (sessions2Error) {
        console.error('Error inserting into sessions2:', sessions2Error);
        alert('セッション作成に失敗しました');
        return;
      }
      if (!sessions2Data || sessions2Data.length === 0) {
        alert('セッション作成に失敗しました(データなし)');
        return;
      }
      const newSession = sessions2Data[0];
      console.log('Created session:', newSession);

      // 2) phasesに INSERT (session_id & directions=1)
      const { data: phases2Data, error: phases2Error } = await supabase
        .from('phases2')
        .insert([
          {
            session_id: newSession.id,
            phase_numbers: 1,  // フェーズ番号: 1フェーズ目
            // select_tracks, select_tracks_user_id はまだNULL (未選択)
          },
        ])
        .select();
      if (phases2Error) {
        console.error('Error inserting into phases:', phases2Error);
        alert('phasesレコード作成に失敗しました');
        return;
      }
      if (!phases2Data || phases2Data.length === 0) {
        alert('phasesレコードが作れませんでした');
        return;
      }

      const newPhase = phases2Data[0];
      console.log('Created phase:', newPhase);

      // 3) router.push で /phases に飛ぶ
      //   directions をURLクエリに載せ、タイトル「XXフェーズ目です」と表示したい
      //   session_id, phase_id, directions などをクエリに載せる
      router.push(`/ipad/phaseB?session_id=${newSession.id}&phase_id=${newPhase.id}&phase_numbers=${newPhase.phase_numbers}&directions=${1}`);
    } catch (err) {
      console.error('handleCreateSession error:', err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-screen h-screen bg-gray-100 p-8">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-3xl">
        <h1 className="text-3xl font-bold mb-6 text-center">セッションを開始する</h1>

        {/* ユーザーA(自分) */}
        <div className="mb-6">
          <label className="block mb-2 text-lg">先に楽曲を選択するユーザー</label>
          <select
            value={userA}
            onChange={(e) => setUserA(e.target.value)}
            className="border border-gray-300 text-lg p-3 w-full rounded"
          >
            <option value="">-- 選択 --</option>
            {users.map((u) => (
              <option key={u.id} value={u.spotify_user_id}>
                {u.display_name || u.spotify_user_id || u.id}
              </option>
            ))}
          </select>
        </div>

        {/* ユーザーB(相手) */}
        <div className="mb-6">
          <label className="block mb-2 text-lg">後に楽曲を選択するユーザー</label>
          <select
            value={userB}
            onChange={(e) => setUserB(e.target.value)}
            className="border border-gray-300 text-lg p-3 w-full rounded"
          >
            <option value="">-- 選択 --</option>
            {users.map((u) => (
              <option key={u.id} value={u.spotify_user_id}>
                {u.display_name || u.spotify_user_id || u.id}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleCreateSession}
            className="text-xl px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            phaseに移動する
          </button>
        </div>
      </div>
    </div>
  );
}
