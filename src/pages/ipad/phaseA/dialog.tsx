// pages/phases/dialog.tsx

import React from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/utils/supabaseClient';

export default function DialogPage() {
  const router = useRouter();
  const { session_id, phase_id, phase_numbers, directions } = router.query;

  const phaseNum = phase_numbers ? Number(phase_numbers) : 1;
  const urlDirections = directions ? Number(directions) : 1;

  // 「次の画面へ戻る」ボタン押下時
  // 質問文で「router.push で index.tsxへ戻る」とある想定
  // 1) directionsがDBに入っている値と一緒の場合 => directionsのみ反転
  // 2) 違う場合 => directions反転 + phaseNum++
  const handleNext = async () => {
    const newDirections = urlDirections === 2 ? 1 : 2; // 反転
    let newPhaseNum = phaseNum;                     // デフォルトは変更なし

    if (urlDirections === 1 ) {
      try {
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
          pathname: '/ipad/phaseA', // index.tsx
          query: {
            session_id,
            phase_id: newPhase.id,
            phase_numbers,
            directions: newDirections,
          },
        });
      } catch (err) {
        console.error('handleCreateSession error:', err);
      }
    }else{
      newPhaseNum = phaseNum + 1;

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
        pathname: '/ipad/phaseA/forms', // index.tsx
        query: {
          session_id,
          phase_id,
          phase_numbers: newPhaseNum,
          directions: newDirections,
        },
      });
    }
  };

  if (urlDirections === 1) {
    return (
      <div className="p-4">
        <h1>対話をしてください。</h1>
        <div className="mt-6">
          <button
            onClick={handleNext}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
          後半のユーザーの曲選択に移る
          </button>
        </div>
      </div>
    );
  }

  if (urlDirections === 2) {
    return (
      <div className="p-4">
        <h1>対話をしてください。</h1>
        <div className="mt-6">
          <button
            onClick={handleNext}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
          評価に移る
          </button>
        </div>
      </div>
    );
  }
}
