import Link from 'next/link';

const Dashboard = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Dashboard</h1>
      <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        <li className="bg-gray-800 text-white rounded-lg shadow-lg p-4 text-center">
          <Link href="/library" className="text-lg font-semibold hover:underline">
            お気に入りの曲
          </Link>
        </li>
        <li className="bg-gray-800 text-white rounded-lg shadow-lg p-4 text-center">
          <Link href="/top-tracks" className="text-lg font-semibold hover:underline">
            最近特に再生されている曲
          </Link>
        </li>
        <li className="bg-gray-800 text-white rounded-lg shadow-lg p-4 text-center">
          <Link href="/recently-tracks" className="text-lg font-semibold hover:underline">
            直近で再生された曲 - 50件
          </Link>
        </li>
        <li className="bg-gray-800 text-white rounded-lg shadow-lg p-4 text-center">
          <Link href="/playlist" className="text-lg font-semibold hover:underline">
            その他のマイプレイリスト
          </Link>
        </li>
      </ul>
    </div>
  );
};

export default Dashboard;
