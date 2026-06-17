"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

interface Post {
  title: string;
  excerpt: string;
  slug: string;
  date: string;
  draft?: boolean;
  author?: {
    name: string;
  };
  tags?: string[];
}

interface NewsletterArchiveProps {
  initialPosts: Post[];
}

export default function NewsletterArchive({ initialPosts }: NewsletterArchiveProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Automatically parse unique tags from posts
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    initialPosts.forEach((post) => {
      // Extract engine/keywords from text if explicit tags don't exist
      const text = `${post.title} ${post.excerpt}`.toLowerCase();
      if (text.includes("unity")) tagsSet.add("Unity");
      if (text.includes("godot")) tagsSet.add("Godot");
      if (text.includes("unreal")) tagsSet.add("Unreal");
      if (text.includes("ai") || text.includes("generative")) tagsSet.add("AI");
      if (text.includes("indie")) tagsSet.add("Indie");

      if (post.tags) {
        post.tags.forEach(t => tagsSet.add(t));
      }
    });
    return Array.from(tagsSet);
  }, [initialPosts]);

  // Filter posts dynamically in client
  const filteredPosts = useMemo(() => {
    return initialPosts.filter((post) => {
      const text = `${post.title} ${post.excerpt}`.toLowerCase();
      const matchesSearch = text.includes(searchQuery.toLowerCase());

      let matchesTag = true;
      if (selectedTag) {
        matchesTag = text.includes(selectedTag.toLowerCase()) || !!(post.tags && post.tags.includes(selectedTag));
      }

      return matchesSearch && matchesTag;
    });
  }, [initialPosts, searchQuery, selectedTag]);

  return (
    <div className="space-y-12">
      {/* Search and Filters Section */}
      <div className="bg-neutral-900/60 backdrop-blur-xl border border-neutral-800/80 rounded-2xl p-6 shadow-2xl space-y-6">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-neutral-500 group-focus-within:text-purple-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search through newsletter archives..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-neutral-950/80 border border-neutral-800 rounded-xl text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/60 transition-all duration-300 shadow-inner"
          />
        </div>

        {/* Filter Tags */}
        {/* <div className="flex flex-wrap gap-2.5 items-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mr-2">Filter Topics:</span>
          <button
            onClick={() => setSelectedTag(null)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-300 cursor-pointer ${selectedTag === null
              ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm shadow-purple-500/10"
              : "bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-neutral-200 hover:border-neutral-700"
              }`}
          >
            All Editions
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-300 cursor-pointer ${selectedTag === tag
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm shadow-purple-500/10"
                : "bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-neutral-200 hover:border-neutral-700"
                }`}
            >
              #{tag}
            </button>
          ))}
        </div> */}
      </div>


      {/* Posts Feed */}
      <section className="space-y-6">
        {filteredPosts.map((post) => {
          // Dynamically compute estimated reading time
          const wordCount = post.title.split(/\s+/).length + post.excerpt.split(/\s+/).length + 200; // rough estimate
          const readTime = Math.max(1, Math.ceil(wordCount / 225));

          return (
            <article
              key={post.slug}
              className="group relative bg-neutral-900/40 backdrop-blur-md border border-neutral-800/80 hover:border-purple-500/30 rounded-2xl p-8 hover:bg-neutral-900/60 transition-all duration-500 shadow-lg hover:shadow-purple-500/5 hover:-translate-y-0.5 overflow-hidden"
            >
              {/* Card Glow Effect */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

              <Link href={`/posts/${post.slug}`} className="absolute inset-0 z-10">
                <span className="sr-only">Read {post.title}</span>
              </Link>

              <div className="flex flex-col space-y-4 relative z-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <time className="text-xs text-neutral-400 font-medium">
                      {post.date
                        ? new Date(post.date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                        : ""}
                    </time>
                    <span className="text-neutral-700">•</span>
                    <span className="text-xs text-neutral-400 font-medium">{readTime} min read</span>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-purple-500/10 px-2.5 py-0.5 text-2xs font-semibold text-purple-400 ring-1 ring-inset ring-purple-500/20 uppercase tracking-wider">
                    Game Dev Weekly
                  </span>
                </div>

                <h2 className="text-2xl font-bold tracking-tight text-neutral-100 group-hover:text-purple-400 transition-colors duration-300">
                  {post.title}
                </h2>

                <p className="text-neutral-400 leading-relaxed text-sm">
                  {post.excerpt}
                </p>

                <div className="pt-2 flex items-center justify-between text-xs font-semibold text-purple-400">
                  <div className="flex items-center space-x-2">
                    <span className="text-neutral-500 text-2xs font-normal">By</span>
                    <span className="text-neutral-300 font-medium">{post.author?.name || "Hiten"}</span>
                  </div>
                  <div className="flex items-center space-x-1 group-hover:translate-x-1 transition-transform duration-300">
                    <span>Read Full Edition</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </article>
          );
        })}

        {filteredPosts.length === 0 && (
          <div className="text-center bg-neutral-900/20 border border-neutral-800/50 rounded-2xl py-24 text-neutral-500">
            <svg className="w-12 h-12 mx-auto text-neutral-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg font-medium text-neutral-400">No newsletters match your search.</p>
            <p className="text-sm text-neutral-500 mt-1">Try refining your keyword query or resetting topic filters.</p>
          </div>
        )}
      </section>
    </div>
  );
}
