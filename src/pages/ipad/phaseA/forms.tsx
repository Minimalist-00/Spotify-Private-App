// pages/ipad/forms.tsx

import React from 'react';
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
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">
        google formsで評価を入力してください。
      </h1>
      {/* ここにGoogle Formsの埋め込みや説明などを入れる */}
      {/* 例： <iframe src="..." ... /> */}

      <div className="mt-6">
        <button
          onClick={handleNextPhase}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          次のフェーズに移動する
        </button>
      </div>
    </div>
  );
}
