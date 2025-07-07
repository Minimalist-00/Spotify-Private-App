// src/pages/ipad/phaseB/dialog.tsx

import PageTimer from '@/components/pageTimer';
import useShowButtonAfterDelay from '@/hooks/useShowButtonAfterDelay';
import { supabase } from '@/utils/supabaseClient';
import { useRouter } from 'next/router';

export default function DialogPage() {
  const router = useRouter();
  const { session_id, phase_numbers, directions } = router.query;

  const phaseNum = phase_numbers ? Number(phase_numbers) : 1;
  const urlDirections = directions ? Number(directions) : 1;

  const showButton = useShowButtonAfterDelay(5); // 10秒後に表示

  // 「次の画面へ戻る」ボタン押下時
  // 質問文で「router.push で index.tsxへ戻る」とある想定
  // 1) directionsがDBに入っている値と一緒の場合 => directionsのみ反転
  // 2) 違う場合 => directions反転 + phaseNum++
  const handleNext = async () => {
    const newDirections = urlDirections === 2 ? 1 : 2; // 反転
    let newPhaseNum = phaseNum;                     // デフォルトは変更なし

    if (urlDirections === 1) {
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
          pathname: '/ipad/phaseB', // index.tsx
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
    } else {
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
        pathname: '/ipad/phaseB/forms', // index.tsx
        query: {
          session_id,
          phase_id: newPhase.id,
          phase_numbers: newPhaseNum,
          directions: newDirections,
        },
      });
    }
  };

  if (urlDirections === 1) {
    return (
      <div className="flex flex-col items-center justify-center w-screen h-screen bg-gray-100 p-6">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-xl w-full text-center">
          <h1 className="text-3xl font-bold mb-6">対話をしてください</h1>
          <PageTimer />
          <div className="mt-6">
            {showButton && (
              <button
                onClick={handleNext}
                className="px-6 py-3 bg-blue-600 text-white text-xl rounded hover:bg-blue-700"
              >
                後攻のユーザーの曲選択画面に移動する
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (urlDirections === 2) {
    return (
      <div className="flex flex-col items-center justify-center w-screen h-screen bg-gray-100 p-6">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-xl w-full text-center">
          <h1 className="text-3xl font-bold mb-6">対話をしてください</h1>
          <PageTimer />
          <div className="mt-6">
            {showButton && (
              <button
                onClick={handleNext}
                className="px-6 py-3 bg-blue-600 text-white text-xl rounded hover:bg-blue-700"
              >
                評価に移る
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
