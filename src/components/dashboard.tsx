import Link from 'next/link';

const Dashboard = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">曲の分類</h1>
      <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        <li className="bg-gray-800 text-white rounded-lg shadow-lg p-4 text-center">
          <Link href="/library" className="text-lg font-semibold hover:underline">
            ここをクリック
          </Link>
        </li>
      </ul>
    </div>
  );
};

export default Dashboard;
