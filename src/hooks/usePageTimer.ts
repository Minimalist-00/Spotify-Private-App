// hooks/usePageTimer.ts
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

const usePageTimer = () => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const router = useRouter();

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const startTimer = () => {
      setElapsedTime(0); // 経過時間をリセット
      intervalId = setInterval(() => {
        setElapsedTime((prevTime) => prevTime + 1); // 1秒ごとに加算
      }, 1000);
    };

    // ページ遷移ごとにタイマーをリセット
    const handleRouteChange = () => {
      clearInterval(intervalId);
      startTimer();
    };

    router.events.on('routeChangeComplete', handleRouteChange);

    // 初回ロード時にタイマー開始
    startTimer();

    // クリーンアップ処理
    return () => {
      clearInterval(intervalId);
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router]);

  return elapsedTime;
};

export default usePageTimer;
