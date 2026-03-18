import { useState } from 'react';
import { Plus, Minus, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from './Logo';

const Star = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 1050 1000" {...props}>
    <path fill="currentColor" d="M1050 386q0 15-29 38L746 624l105 323q5 17 5 30q0 24-18 24q-17 0-38-17L525 785L250 984q-23 17-39 17q-18 0-18-23q0-11 6-31l105-323L29 424Q0 403 0 387q0-23 49-23l340 1L493 41q12-40 32-40q19 0 31 40l106 324l339-1q49 0 49 22z"></path>
  </svg>
);

export default function Footer() {
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  return (
    <footer className="mt-auto bg-[#fcf2f5] text-gray-900 border-t border-gray-200">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-8 lg:px-10 lg:py-16">
        
        <div className="mb-10 text-center sm:text-left">
          <Link to="/" aria-label="SPARK home" className="inline-block">
            <Logo className="h-10 md:h-12 w-auto drop-shadow-sm" />
          </Link>
        </div>
        
        <div className="border-t border-gray-900">
          
          {/* ABOUT SPARK */}
          <div className="border-b border-gray-900">
            <button 
              className="w-full flex justify-between items-center py-5 text-xs md:text-sm font-semibold tracking-widest text-left"
              onClick={() => toggleSection('about')}
            >
              ABOUT SPARK
              {openSection === 'about' ? <Minus className="h-4 w-4 flex-shrink-0" /> : <Plus className="h-4 w-4 flex-shrink-0" />}
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openSection === 'about' ? 'max-h-[500px] opacity-100 pb-5' : 'max-h-0 opacity-0'}`}>
              <div className="px-1 text-sm text-gray-700 leading-relaxed max-w-3xl">
                Where we make you up, we dress you up, and bring your star moment to life. We celebrate you, because here, You are the Star <Star className="inline-block h-3.5 w-3.5 -mt-0.5 text-black" />
              </div>
            </div>
          </div>
          
          {/* SOCIAL MEDIA */}
          <div className="border-b border-gray-900">
            <button 
              className="w-full flex justify-between items-center py-5 text-xs md:text-sm font-semibold tracking-widest text-left"
              onClick={() => toggleSection('social')}
            >
              SOCIAL MEDIA
              {openSection === 'social' ? <Minus className="h-4 w-4 flex-shrink-0" /> : <Plus className="h-4 w-4 flex-shrink-0" />}
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openSection === 'social' ? 'max-h-[300px] opacity-100 pb-5' : 'max-h-0 opacity-0'}`}>
              <div className="px-1 flex flex-col gap-4">
                <a href="https://www.instagram.com/spark_stage55" target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline">Instagram</a>
                {/* <a href="#" className="text-sm font-medium hover:underline">TikTok</a>
                <a href="#" className="text-sm font-medium hover:underline">Pinterest</a>
                <a href="#" className="text-sm font-medium hover:underline">Facebook</a> */}
              </div>
            </div>
          </div>

          {/* FIND YOUR STORE */}
          <div className="border-b border-gray-900 flex">
            <a 
              href="https://www.google.com/maps/place/BiteGang/@-6.9078763,107.6183588,17z/data=!3m1!4b1!4m6!3m5!1s0x2e68e7fe9045c9d7:0xea636a5dfdf21b56!8m2!3d-6.9078763!4d107.6183588!16s%2Fg%2F11ytq8ph5m!18m1!1e1?entry=ttu&g_ep=EgoyMDI2MDMxNS4wIKXMDSoASAFQAw%3D%3D"
              target="_blank" rel="noopener noreferrer"
              className="w-full flex justify-between items-center py-5 text-xs md:text-sm font-semibold tracking-widest text-left hover:text-main-600 transition-colors"
            >
              FIND YOUR STORE
              <ArrowRight className="h-4 w-4 flex-shrink-0" />
            </a>
          </div>

          {/* CONTACT US */}
          <div className="border-b border-gray-900 flex">
            <a 
              href="https://wa.me/6281558200089"
              target="_blank" rel="noopener noreferrer"
              className="w-full flex justify-between items-center py-5 text-xs md:text-sm font-semibold tracking-widest text-left hover:text-main-600 transition-colors"
            >
              CONTACT US
              <ArrowRight className="h-4 w-4 flex-shrink-0" />
            </a>
          </div>
          
        </div>

      </div>
    </footer>
  );
}
