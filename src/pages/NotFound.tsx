import { Link, useLocation, useNavigate } from 'react-router-dom';

export default function NotFound() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="w-full">
      <div className="max-w-[1100px] mx-auto px-6 pt-32 pb-16">
        <div className="rounded-2xl border border-[#f4e7e7] dark:border-[#3d2020] bg-white/70 dark:bg-background-dark/70 backdrop-blur p-10">
          <p className="text-primary text-sm font-bold uppercase tracking-widest">404</p>
          <h1 className="mt-3 text-3xl md:text-5xl font-bold tracking-tight text-[#1c0d0d] dark:text-white font-display">
            Halaman tidak ditemukan
          </h1>
          <p className="mt-4 text-[#9c4949] dark:text-red-200">
            Path <span className="font-mono">{location.pathname}</span> tidak tersedia.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-white font-semibold hover:opacity-95"
            >
              Kembali ke Home
            </Link>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center justify-center rounded-xl border border-[#f4e7e7] dark:border-[#3d2020] px-5 py-3 text-[#1c0d0d] dark:text-white hover:bg-black/5 dark:hover:bg-white/5"
            >
              Kembali ke halaman sebelumnya
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
