import { useEffect, useState } from 'react';

export default function useShowButtonAfterDelay(delaySeconds: number) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(false);
    const timer = setTimeout(() => setShow(true), delaySeconds * 1000);
    return () => clearTimeout(timer);
  }, [delaySeconds]);

  return show;
} 