import { Link } from 'react-router-dom';
import Logo from './Logo';

const primaryLinks = [
  { label: 'ON STAGE', to: '/on-stage' },
  { label: 'EVENT', to: '/events' },
  { label: 'DRESSING ROOM', to: '/dressing-room' },
  { label: 'GLAM', to: '/glam' },
  { label: 'CHARM BAR', to: '/shop' },
  { label: 'SPARK CLUB', to: '/spark-club' },
  { label: 'NEWS', to: '/news' },
];

const secondaryLinks = [
  { label: 'ABOUT SPARK', to: '' },
  { label: 'SOCIAL MEDIA', href: 'https://www.instagram.com/spark_stage55' },
  { label: 'FIND YOUR STORE', href: 'https://www.google.com/maps/place/BiteGang/@-6.9078763,107.6183588,17z/data=!3m1!4b1!4m6!3m5!1s0x2e68e7fe9045c9d7:0xea636a5dfdf21b56!8m2!3d-6.9078763!4d107.6183588!16s%2Fg%2F11ytq8ph5m!18m1!1e1?entry=ttu&g_ep=EgoyMDI2MDMxNS4wIKXMDSoASAFQAw%3D%3D' },
  { label: 'CONTACT US', href: 'https://wa.me/6281558200089' },
];

const linkClassName =
  'text-xs font-medium tracking-[0.18em] text-white/78 transition-colors duration-200 hover:text-white';

const Footer = () => {
  return (
    <footer className="mt-auto bg-black text-white">
      <div className="mx-auto max-w-7xl px-6 py-14 sm:px-8 lg:px-10 lg:py-18">
        <div className="flex flex-col gap-12 sm:gap-14 lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,0.55fr)] lg:gap-10">
          <div className="flex items-start justify-center lg:justify-start">
            <Link to="/" aria-label="SPARK home" className="inline-flex items-start">
              <Logo invert className="h-20 w-auto md:h-24 lg:h-28" />
            </Link>
          </div>

          <nav aria-label="Footer navigation" className="grid gap-10 sm:grid-cols-2 sm:gap-8 lg:grid-cols-[1fr_0.8fr]">
            <ul className="space-y-3.5 text-center sm:text-left">
              {primaryLinks.map((item) => (
                <li key={item.label}>
                  <Link to={item.to} className={linkClassName}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            <ul className="space-y-3.5 text-center sm:text-left">
              {secondaryLinks.map((item) => (
                <li key={item.label}>
                  {'href' in item ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={linkClassName}
                    >
                      {item.label}
                    </a>
                  ) : (
                    <Link to={item.to} className={linkClassName}>
                      {item.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <div className="hidden lg:block" aria-hidden />
        </div>
      </div>
    </footer>
  );
};

export default Footer;
