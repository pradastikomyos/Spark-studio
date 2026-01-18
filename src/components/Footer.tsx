import logoDark from '../logo/dark mode/dark mode.png';

const Footer = () => {
  return (
    <footer className="bg-black text-white pt-20 pb-10 border-t border-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-1">
            <div className="mb-6">
              <img 
                src={logoDark} 
                alt="Spark Photo Studio" 
                className="h-10 w-auto transition-opacity duration-300"
              />
            </div>
            <p className="text-gray-500 text-sm leading-loose">
              Premium photography studio capturing life's most precious moments with artistic flair and professional excellence.
            </p>
          </div>
          <div className="col-span-1">
            <h3 className="font-bold text-xs uppercase tracking-widest mb-6 text-white border-b border-gray-800 pb-2 inline-block">
              Explore
            </h3>
            <ul className="space-y-4 text-sm text-gray-400">
              <li>
                <a className="hover:text-primary transition-colors" href="#">Home</a>
              </li>
              <li>
                <a className="hover:text-primary transition-colors" href="#">Portfolio</a>
              </li>
              <li>
                <a className="hover:text-primary transition-colors" href="#">Services</a>
              </li>
              <li>
                <a className="hover:text-primary transition-colors" href="#">Bookings</a>
              </li>
            </ul>
          </div>
          <div className="col-span-1">
            <h3 className="font-bold text-xs uppercase tracking-widest mb-6 text-white border-b border-gray-800 pb-2 inline-block">
              Legal
            </h3>
            <ul className="space-y-4 text-sm text-gray-400">
              <li>
                <a className="hover:text-primary transition-colors" href="#">Privacy Policy</a>
              </li>
              <li>
                <a className="hover:text-primary transition-colors" href="#">Terms of Service</a>
              </li>
            </ul>
          </div>
          <div className="col-span-1">
            <h3 className="font-bold text-xs uppercase tracking-widest mb-6 text-white border-b border-gray-800 pb-2 inline-block">
              Connect
            </h3>
            <div className="flex space-x-4">
              <a
                className="w-10 h-10 border border-gray-700 rounded-full flex items-center justify-center hover:bg-primary hover:border-primary transition-all group"
                href="#"
              >
                <span className="text-xs group-hover:text-white">IG</span>
              </a>
              <a
                className="w-10 h-10 border border-gray-700 rounded-full flex items-center justify-center hover:bg-primary hover:border-primary transition-all group"
                href="#"
              >
                <span className="text-xs group-hover:text-white">TW</span>
              </a>
              <a
                className="w-10 h-10 border border-gray-700 rounded-full flex items-center justify-center hover:bg-primary hover:border-primary transition-all group"
                href="#"
              >
                <span className="text-xs group-hover:text-white">LN</span>
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-900 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-gray-600 uppercase tracking-wider">
          <p>© 2026 Spark Photo Studio. All rights reserved.</p>
          <p className="mt-2 md:mt-0">Designed with Elegance</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
