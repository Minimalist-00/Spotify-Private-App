// components/PageTimer.tsx
import usePageTimer from '../hooks/usePageTimer';

const PageTimer = () => {
  const elapsedTime = usePageTimer();

  return (
    <div style={{ padding: '10px', background: '#f9f9f9', border: '1px solid #ddd' }}>
      <p>このページに滞在してから: {elapsedTime} 秒</p>
    </div>
  );
};

export default PageTimer;
