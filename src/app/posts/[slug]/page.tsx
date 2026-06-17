import { getPostBySlug, getAllPosts, markdownToHtml } from "@/lib/api";
import { notFound } from "next/navigation";
import Link from "next/link";
import ReadingProgressBar from "@/components/ReadingProgressBar";
import EditorAvatar from "@/components/icons/EditorAvatar";

export async function generateStaticParams() {
  const posts = getAllPosts(["slug"]);
  return posts.map((post) => ({
    slug: post?.slug,
  }));
}

export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const post = getPostBySlug(resolvedParams.slug, ["title", "date", "slug", "author", "content"]);

  if (!post || (post.draft === true && process.env.NODE_ENV !== "development")) {
    return notFound();
  }

  // Calculate dynamic reading time (avg. 225 words per minute)
  const wordCount = (post.content || "").split(/\s+/).length;
  const readTime = Math.max(1, Math.ceil(wordCount / 225));

  const contentHtml = await markdownToHtml(post.content || "");

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50 selection:bg-purple-500/30 font-sans relative overflow-x-hidden pb-32">
      {/* Scroll Progress Bar */}
      <ReadingProgressBar />

      {/* Decorative Glows */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293708_1px,transparent_1px),linear-gradient(to_bottom,#1f293708_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[300px] bg-purple-900/10 rounded-full blur-3xl pointer-events-none" />

      {/* Glassmorphic Navigation Header */}
      <header className="sticky top-0 z-40 w-full border-b border-neutral-900/60 bg-neutral-950/70 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center text-xs font-semibold text-neutral-400 hover:text-purple-400 transition-colors space-x-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Editions</span>
          </Link>
          <span className="text-2xs uppercase tracking-wider font-extrabold text-neutral-600 sm:block hidden">
            Reading: {post.title.length > 35 ? `${post.title.substring(0, 35)}...` : post.title}
          </span>
        </div>
      </header>

      {/* Article Viewport */}
      <article className="max-w-3xl mx-auto px-6 pt-16 sm:pt-24">
        
        {/* Post Metadata Header */}
        <header className="mb-12 space-y-6">
          <div className="flex items-center space-x-3 text-xs font-medium text-purple-400 uppercase tracking-wider">
            <span>Game Dev Weekly</span>
            <span className="text-neutral-800">•</span>
            <time>
              {post.date
                ? new Date(post.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : ""}
            </time>
          </div>

          <h1 className="text-4xl sm:text-6.5xl font-black tracking-tight leading-tight text-neutral-100">
            {post.title}
          </h1>

          <div className="flex items-center space-x-4 pt-2 text-sm text-neutral-400">
            <span className="flex items-center space-x-2">
              <EditorAvatar className="w-6 h-6 filter drop-shadow-[0_2px_8px_rgba(168,85,247,0.15)]" />
              <span className="font-semibold text-neutral-300">{post.author?.name || "Hiten"}</span>
            </span>
            <span className="text-neutral-700">•</span>
            <span className="flex items-center space-x-1.5">
              <svg className="w-4 h-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span>{readTime} min read</span>
            </span>
          </div>
        </header>

        {/* Dynamic prose text rendering */}
        <div 
          className="prose prose-invert max-w-none prose-neutral sm:prose-lg
            prose-headings:text-neutral-100 prose-headings:font-black prose-headings:tracking-tight
            prose-a:text-purple-400 hover:prose-a:text-purple-300 prose-a:transition-colors prose-a:font-semibold prose-a:no-underline prose-a:border-b prose-a:border-purple-500/30 hover:prose-a:border-purple-500
            prose-strong:text-neutral-100 prose-strong:font-bold
            prose-code:text-pink-300 prose-code:font-mono prose-code:text-sm prose-code:bg-neutral-900/60 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none
            prose-pre:bg-neutral-900/50 prose-pre:border prose-pre:border-neutral-800/80 prose-pre:rounded-xl prose-pre:p-5
            prose-img:rounded-2xl prose-img:shadow-2xl prose-img:border prose-img:border-neutral-800
            prose-blockquote:border-l-4 prose-blockquote:border-purple-500/80 prose-blockquote:italic prose-blockquote:text-neutral-300 prose-blockquote:pl-6 prose-blockquote:bg-purple-950/10 prose-blockquote:py-1 prose-blockquote:rounded-r-lg"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />

        {/* Author Footer Card */}
        <footer className="mt-20 p-8 rounded-2xl bg-neutral-900/40 border border-neutral-800/80 backdrop-blur-sm flex sm:flex-row flex-col items-center sm:items-start gap-6">
          <EditorAvatar className="w-12 h-12 filter drop-shadow-[0_4px_12px_rgba(168,85,247,0.2)]" />
          <div className="space-y-2 text-center sm:text-left flex-1">
            <h3 className="text-base font-bold text-neutral-200">About the Editor</h3>
            <p className="text-sm text-neutral-400 leading-relaxed font-light">
              This edition was automatically researched and written by Gemini using deep web search grounding, synthesized into markdown, and committed serverlessly upon review.
            </p>
          </div>
        </footer>

      </article>
    </main>
  );
}

