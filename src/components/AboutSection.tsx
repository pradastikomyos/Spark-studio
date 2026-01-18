import { AboutItem } from '../types';

const AboutSection = () => {
  const aboutItems: AboutItem[] = [
    {
      icon: 'schedule',
      title: 'Session Duration',
      description: 'Typically 2 hours and 45 minutes, allowing ample time for wardrobe changes and set adjustments.',
    },
    {
      icon: 'shutter_speed',
      title: 'Professional Gear',
      description: 'Access to state-of-the-art Profoto lighting and Hasselblad camera systems.',
    },
  ];

  return (
    <section className="border-t border-gray-100 dark:border-white/5 py-24 bg-surface-light/30 dark:bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div className="lg:col-span-7 space-y-12">
            <div>
              <span className="text-primary text-xs font-bold uppercase tracking-widest mb-2 block">
                Studio Philosophy
              </span>
              <h2 className="font-display text-4xl font-medium text-text-light dark:text-white mb-6">
                The Art of <span className="italic font-light">Light & Shadow</span>
              </h2>
              <p className="text-subtext-light dark:text-subtext-dark leading-loose font-light text-lg">
                SPARK is more than a studio; it is an immersive theatrical experience that takes audiences on a journey through a fantastical world. We believe that every photograph is a frozen moment of magic, a collaborative art form between the subject and the lens.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-8 border-t border-gray-200 dark:border-white/10">
              {aboutItems.map((item, index) => (
                <div key={index} className="flex gap-4 items-start">
                  <div className="p-2 bg-primary/10 rounded-full text-primary">
                    <span className="material-symbols-outlined">{item.icon}</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-text-light dark:text-white mb-1">{item.title}</h4>
                    <p className="text-sm text-subtext-light dark:text-subtext-dark">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="bg-white dark:bg-surface-dark p-10 shadow-2xl shadow-black/5 dark:shadow-black/20 sticky top-32 border-l-4 border-primary">
              <h3 className="font-display text-2xl font-medium text-text-light dark:text-white mb-8 flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">confirmation_number</span>
                Official Booking
              </h3>
              <ul className="space-y-6 mb-8">
                <li className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-green-500 text-xl">verified</span>
                  <span className="text-sm font-medium text-text-light dark:text-gray-300">
                    100% Satisfaction Guaranteed
                  </span>
                </li>
                <li className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-green-500 text-xl">group</span>
                  <span className="text-sm font-medium text-text-light dark:text-gray-300">
                    Private Group Sessions Available
                  </span>
                </li>
                <li className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-green-500 text-xl">event_available</span>
                  <span className="text-sm font-medium text-text-light dark:text-gray-300">
                    Flexible Rescheduling Policy
                  </span>
                </li>
              </ul>
              <button className="w-full bg-text-light dark:bg-white text-white dark:text-black py-4 font-bold text-xs uppercase tracking-widest hover:bg-primary hover:text-white dark:hover:bg-primary dark:hover:text-white transition-all shadow-lg">
                Check Availability
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
