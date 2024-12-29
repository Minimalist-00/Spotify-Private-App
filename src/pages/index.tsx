import { useRouter } from 'next/router';

const Home = () => {
  const router = useRouter();

  const handleLogin = () => {
    router.push('/api/auth/login'); // Spotify認証エンドポイントへリダイレクト
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>Welcome to Spotify History App</h1>
      <button onClick={handleLogin} style={{ padding: '10px 20px', fontSize: '16px' }}>
        Login with Spotify
      </button>
    </div>
  );
};

export default Home;
