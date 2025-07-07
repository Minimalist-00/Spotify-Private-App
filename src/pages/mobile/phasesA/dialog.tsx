// pages/phases/dialog.tsx

import { supabase } from '@/utils/supabaseClient';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function DialogPage() {
  const router = useRouter();
  const { session_id, phase_id, phase_numbers, directions } = router.query;

  const [sessionDirections, setSessionDirections] = useState<number | null>(null);

  // 1) DBの sessions.directions を取得
  useEffect(() => {
    if (!session_id) return;
    const fetchSessionDirections = async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('directions')
        .eq('id', session_id)
        .single();
      if (error || !data) {
        console.error('Failed to fetch sessions.directions', error);
        return;
      }
      setSessionDirections(data.directions);
    };
    fetchSessionDirections();
  }, [session_id]);

  const phaseNum = phase_numbers ? Number(phase_numbers) : 1;
  const urlDirections = directions ? Number(directions) : 0;

  // 「次の画面へ戻る」ボタン押下時
  // 質問文で「router.push で index.tsxへ戻る」とある想定
  // 1) directionsがDBに入っている値と一緒の場合 => directionsのみ反転
  // 2) 違う場合 => directions反転 + phaseNum++
  const handleNext = async () => {
    if (sessionDirections === null) return; // まだ取得できていない場合はreturn

    const newDirections = urlDirections === 1 ? 0 : 1; // 反転
    let newPhaseNum = phaseNum;                     // デフォルトは変更なし

    if (sessionDirections !== urlDirections) {
      // DBのdirections と URL のdirections が違う → 2) の処理
      newPhaseNum = phaseNum + 1;

      try {
        if (newPhaseNum !== 9) {
          const { data: phasesData, error: phasesError } = await supabase
            .from('phases')
            .insert([
              {
                session_id: session_id,
                phase_numbers: newPhaseNum,
              },
            ])
            .select();
          if (phasesError) {
            console.error('Error inserting into phases:', phasesError);
            alert('phasesレコード作成に失敗しました');
            return;
          }
          if (!phasesData || phasesData.length === 0) {
            alert('phasesレコードが作れませんでした');
            return;
          }

          const newPhase = phasesData[0];
          console.log('Created phase:', newPhase);

          router.push({
            pathname: '/phasesA', // index.tsx
            query: {
              session_id,
              phase_id: newPhase.id,           // 質問文: 変更しない
              phase_numbers: newPhase.phase_numbers,
              directions: newDirections,
            },
          });
        } else {
          router.push({
            pathname: '/phasesA', // index.tsx
            query: {
              phase_numbers: newPhaseNum,
            },
          });
        }
      } catch (err) {
        console.error('handleCreateSession error:', err);
      }
    } else {
      // session_id, phase_id は変えず
      router.push({
        pathname: '/phasesA', // index.tsx
        query: {
          session_id,
          phase_id,           // 質問文: 変更しない
          phase_numbers: newPhaseNum,
          directions: newDirections,
        },
      });
    }
  };

  return (
    <div className="p-4">
      <h1>対話をしてください。</h1>
      <p>対話の後は評価をしてください</p>

      <div className="mt-6">
        <button
          onClick={handleNext}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          次へ
        </button>
      </div>
    </div>
  );
}
