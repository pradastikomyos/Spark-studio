import { PageTransition } from '../components/PageTransition';

const News = () => {
  return (
    <PageTransition>
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-6 max-w-2xl">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-main-100 mb-4">
            <span className="material-symbols-outlined text-5xl text-main-600">
              newspaper
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 uppercase tracking-tight">
            News
          </h1>
          <p className="text-xl md:text-2xl font-light text-gray-600 uppercase tracking-widest">
            Coming Soon
          </p>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Stay updated with the latest news, events, and announcements from Spark Stage.
          </p>
        </div>
      </div>
    </PageTransition>
  );
};

export default News;
