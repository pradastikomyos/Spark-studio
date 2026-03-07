type ProductOrderSuccessHeroProps = {
  channel?: string | null;
  orderNumber: string;
};

export function ProductOrderSuccessHero({ channel, orderNumber }: ProductOrderSuccessHeroProps) {
  return (
    <div className="text-center mb-8">
      <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-3">
        {String(channel || '').toLowerCase() === 'cashier' ? 'Bayar di Kasir' : 'Payment Successful'}
      </p>
      <div className="flex justify-center mb-2">
        <img
          src="/images/landing/READY%20TO%20BE%20A%20STAR.PNG"
          alt="Ready to Be a Star?"
          className="h-auto w-full max-w-xl object-contain"
        />
      </div>
      <div className="text-gray-500 font-medium font-sans">Order Number</div>
      <div className="font-mono font-bold text-lg text-gray-900 tracking-wider">#{orderNumber}</div>
    </div>
  );
}
