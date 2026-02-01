const Newsletter = () => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('Newsletter subscription submitted');
  };

  return (
    <section className="py-24 bg-surface-light border-t border-gray-200">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <span className="inline-block p-3 bg-primary/10 rounded-full text-primary mb-6">
          <span className="material-symbols-outlined text-3xl">mark_email_unread</span>
        </span>
        <h2 className="font-display text-4xl font-medium text-text-light mb-4">
          Join the Inner Circle
        </h2>
        <p className="text-subtext-light mb-10 max-w-xl mx-auto font-light">
          Receive exclusive invitations to gallery openings, workshops, and early bird booking access.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
          <input
            className="flex-grow px-6 py-4 bg-white border border-gray-200 text-text-light placeholder-gray-400 focus:outline-none focus:border-primary transition-colors text-sm"
            placeholder="Email Address"
            required
            type="email"
          />
          <button
            className="px-8 py-4 bg-primary text-white font-bold text-xs uppercase tracking-widest hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20"
            type="submit"
          >
            Subscribe
          </button>
        </form>
      </div>
    </section>
  );
};

export default Newsletter;
