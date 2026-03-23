export default function Hero() {
  return (
    <main
      className="relative h-screen w-full bg-cover bg-center"
      style={{ backgroundImage: "url('/images/hero-bg-img.png')" }}
    >
      <section className="mx-auto flex h-full w-full max-w-7xl items-center px-6">
        <div className="max-w-2xl rounded-2xl bg-innova-white/80 p-8 shadow-xl shadow-sky-100 backdrop-blur-sm sm:p-10">
          <p className="mb-3 inline-block rounded-full bg-innova-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-innova-gold">
            Your Urban Escape
          </p>
          
          <h2 className="text-3xl font-extrabold leading-tight text-innova-gold sm:text-5xl">
            Experience a Stay Designed Around You.
          </h2>
          
          <p className="mt-4 text-base leading-relaxed text-slate-700 sm:text-lg">
            From effortless digital check-ins to personalized local recommendations, 
            we use smart technology to ensure your stay is as relaxing as it is memorable.
          </p>
          
          <button className="mt-8 rounded-lg bg-innova-gold px-8 py-3 text-sm font-semibold text-white transition hover:opacity-90">
            Book Your Stay
          </button>
        </div>
      </section>
    </main>
  );
}