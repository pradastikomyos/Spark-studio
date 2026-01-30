import Hero from '../components/Hero';
import TicketSection from '../components/TicketSection';
import AboutSection from '../components/AboutSection';
// import FeaturedCollections from '../components/FeaturedCollections';
// import Newsletter from '../components/Newsletter';

const Home = () => {
  return (
    <>
      <Hero />
      <main className="bg-background-light dark:bg-background-dark">
        <TicketSection />
        <AboutSection />
        {/* <FeaturedCollections />
        <Newsletter /> */}
      </main>
    </>
  );
};

export default Home;
