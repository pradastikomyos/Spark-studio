import { Link } from 'react-router-dom';
import Logo from './Logo';

const Footer = () => {
  return (
    <footer className="bg-black text-white py-12 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">

          <div>
            <h3 className="text-lg font-bold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="text-gray-400 hover:text-white transition">About SPARK</Link>
              </li>
              <li>
                <a href="https://www.instagram.com/spark_stage55" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition">Social media</a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition cursor-default" onClick={(e) => e.preventDefault()}>Find your store</a>
              </li>
              <li>
                <a href="https://wa.me/6281558200089" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition">Contact us</a>
              </li>
            </ul>
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
