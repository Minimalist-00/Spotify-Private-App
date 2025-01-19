// src/pages/ipad/phaseA/forms.tsx

import PageTimer from '@/components/pageTimer';
import { useRouter } from 'next/router';

export default function FormsPage() {
  const router = useRouter();
  const { session_id, phase_id, phase_numbers, directions } = router.query;

  // 「次のフェーズに移動する」ボタン押下時
  const handleNextPhase = () => {
    router.push({
      pathname: '/ipad/phaseA',
      query: {
        session_id,
        phase_id,
        phase_numbers,
        directions,
      },
    });
  };

  return (
    <div className="flex flex-col items-center justify-center w-screen h-screen bg-gray-100 p-6">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full text-center">
        <h1 className="text-3xl font-bold mb-6">
          google formsで評価を入力してください
        </h1>

        <PageTimer />

        {/* ここにGoogle Formsの埋め込みや説明などを入れる */}
        {/* 例： <iframe src="..." ... /> */}

        <div className="mt-6">
          <button
            onClick={handleNextPhase}
            className="px-6 py-3 bg-purple-600 text-white text-xl rounded hover:bg-purple-700"
          >
            先攻のユーザーの曲選択画面に移動する
          </button>
        </div>
      </div>
    </div>
  );
}
