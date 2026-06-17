import Link from "next/link";
import { getAllPosts } from "@/lib/api";
import NewsletterArchive from "@/components/NewsletterArchive";
import LogoIcon from "@/components/icons/LogoIcon";

export default function Home() {
  const allPosts = getAllPosts(["title", "date", "slug", "author", "excerpt"]) as any[];

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50 selection:bg-purple-500/30 font-sans relative overflow-x-hidden">
      {/* Decorative Grid and Background Glows */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f29370a_1px,transparent_1px),linear-gradient(to_bottom,#1f29370a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[350px] bg-gradient-to-b from-purple-900/15 via-pink-900/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Modern Glassmorphic Top Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b border-neutral-900/80 bg-neutral-950/70 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-105 transition-transform">
              <LogoIcon className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-extrabold text-sm tracking-wider uppercase text-neutral-100 group-hover:text-purple-400 transition-colors">
              GameDev Newsletters
            </span>
          </Link>
          <nav className="hidden sm:flex items-center space-x-6 text-sm font-semibold text-neutral-400">
            <Link href="/" className="text-purple-400 hover:text-purple-300 transition-colors">
              Editions
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-6 py-16 sm:py-24 relative">

        {/* Hero Section */}
        <section className="text-center mb-20 space-y-6 relative">

          <h1 className="text-5xl sm:text-7xl font-black tracking-tight leading-tight bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300 text-transparent bg-clip-text">
            Game Dev Newsletters <br />
            <span className="text-neutral-100 font-extrabold">Weekly Newsletter</span>
          </h1>

          <p className="text-lg sm:text-xl text-neutral-400 max-w-2xl mx-auto font-light leading-relaxed">
            Bridging the gap between artificial intelligence and game creation. Exploring the breakthrough tools, rendering engines, and developer stories shaping the future of interactive entertainment.
          </p>
        </section>

        {/* Dynamic Client-Side Filter/Search Archive Component */}
        <NewsletterArchive initialPosts={allPosts} />

        {/* Footer */}
        <footer className="mt-32 pt-8 border-t border-neutral-900 text-center text-xs text-neutral-600 space-y-2">
          <p>© {new Date().getFullYear()} AI Game Dev. Powered by Next.js, Vercel, and Gemini Search Grounding.</p>
        </footer>

      </div>
    </main>
  );
}

