import { Link, useLocation, useNavigate } from 'react-router-dom';

export default function NotFound() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="w-full">
      <div className="max-w-[1100px] mx-auto px-6 pt-32 pb-16">
        <div className="rounded-2xl border border-rose-100 bg-white/70 backdrop-blur p-10">
          <p className="text-primary text-sm font-bold uppercase tracking-widest">404</p>
          <h1 className="mt-3 text-3xl md:text-5xl font-bold tracking-tight text-neutral-950 font-display">
            Halaman tidak ditemukan
          </h1>
          <p className="mt-4 text-rose-700">
            Path <span className="font-mono">{location.pathname}</span> tidak tersedia.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-xl bg-[#ff4b86] px-5 py-3 text-white font-semibold hover:bg-[#e63d75] transition-colors"
            >
              Kembali ke Home
            </Link>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center justify-center rounded-xl border border-rose-100 px-5 py-3 text-neutral-950 hover:bg-black/5:bg-white/5"
            >
              Kembali ke halaman sebelumnya
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
