import { Link } from 'react-router-dom';
import Logo from './Logo';

const Footer = () => {
  return (
    <footer className="bg-black text-white py-12 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <Link to="/" className="inline-block">
              <Logo className="text-3xl text-white mb-4" />
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed">
              Building amazing web applications with modern technology.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="text-gray-400 hover:text-white transition">Home</Link>
              </li>
              <li>
                <Link to="/on-stage" className="text-gray-400 hover:text-white transition">On Stage</Link>
              </li>
              <li>
                <Link to="/events" className="text-gray-400 hover:text-white transition">Event</Link>
              </li>
              <li>
                <Link to="/shop?category=fashion" className="text-gray-400 hover:text-white transition">Fashion</Link>
              </li>
              <li>
                <Link to="/shop?category=beauty" className="text-gray-400 hover:text-white transition">Beauty</Link>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition">Spark Club</a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition">News</a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-4">Contact</h3>
            <div className="text-gray-400 text-sm space-y-2">
              <p>Email: info@example.com</p>
              <p>Phone: (555) 123-4567</p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 text-center">
          <p className="text-gray-500 text-sm">© 2025 SPARK. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
