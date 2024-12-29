import { useRouter } from 'next/router';

const Home = () => {
  const router = useRouter();

  const handleLogin = () => {
    router.push('/api/auth/login'); // Spotify認証エンドポイントへリダイレクト
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-6">Welcome to Spotify History App</h1>
        <p className="text-lg text-gray-400 mb-8">
          Discover your listening history and favorite tracks.
        </p>
        <button
          onClick={handleLogin}
          className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white text-lg font-semibold rounded-lg shadow-md transition-all"
        >
          Login with Spotify
        </button>
      </div>
      <footer className="mt-10 text-gray-600 text-sm">
        © {new Date().getFullYear()} Spotify History App. All rights reserved.
      </footer>
    </div>
  );
};

export default Home;
