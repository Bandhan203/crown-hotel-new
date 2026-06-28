import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import PageHero from '../components/PageHero';
import SectionHeading from '../components/SectionHeading';
import api from '../services/api';
import { toMediaUrl } from '../utils/mediaUrl';
import { hotelImages } from '../constants/images';

type NewsPost = {
  id: number;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  image: string | null;
  author_name?: string | null;
  published_at: string | null;
};

type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

function formatPublishedDate(value: string | null): string {
  if (!value) return 'Draft';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 'Unknown date' : d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: '2-digit',
  });
}

function toAbsoluteMediaUrl(path: string | null): string {
  return toMediaUrl(path, hotelImages.newsFallback);
}

export default function News() {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let mounted = true;

    async function loadNews(): Promise<void> {
      try {
        setLoading(true);
        setError('');

        const response = await api.get<PaginatedResponse<NewsPost> | NewsPost[]>('/news/');
        const payload = response.data;
        const items = Array.isArray(payload) ? payload : payload.results;

        if (mounted) {
          setPosts(items ?? []);
        }
      } catch {
        if (mounted) {
          setError('Failed to load news posts from CMS.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadNews();
    return () => {
      mounted = false;
    };
  }, []);

  const categories = useMemo(() => {
    const values = posts
      .map((p) => p.category?.trim())
      .filter((v): v is string => Boolean(v));
    return ['ALL', ...Array.from(new Set(values))];
  }, [posts]);

  const visiblePosts = useMemo(() => {
    if (selectedCategory === 'ALL') return posts;
    return posts.filter((p) => p.category === selectedCategory);
  }, [posts, selectedCategory]);

  return (
    <>
      <PageHero
        title="Our News"
        breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'News' }]}
      />

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <SectionHeading subtitle="HOTEL BLOG" title="Our News" />

          <div className="flex flex-wrap gap-2 mb-8">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 text-xs tracking-wide border transition-colors ${selectedCategory === category
                  ? 'bg-teal-700 text-white border-transparent shadow-sm'
                  : 'bg-white text-dark border-gray-200 hover:border-primary'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {loading && (
            <p className="text-body">Loading news from CMS...</p>
          )}

          {error && (
            <p className="text-red-600">{error}</p>
          )}

          {!loading && !error && visiblePosts.length === 0 && (
            <p className="text-body">No published news posts found.</p>
          )}

          {!loading && !error && visiblePosts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {visiblePosts.map((post) => (
              <article key={post.id} className="group bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all overflow-hidden h-full flex flex-col pb-5">
                <div className="relative overflow-hidden mb-4">
                  <img
                    src={toAbsoluteMediaUrl(post.image)}
                    alt={post.title}
                    className="w-full h-[250px] object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute bottom-4 left-4 flex gap-2">
                    <span className="bg-teal-700 text-white text-xs px-3 py-1 font-bold rounded shadow-sm">
                      {formatPublishedDate(post.published_at)}
                    </span>
                    {post.category && (
                      <span className="bg-white/90 backdrop-blur-sm text-dark text-xs px-3 py-1 font-bold rounded">
                        {post.category}
                      </span>
                    )}
                  </div>
                </div>
                <div className="px-5 flex-1 flex flex-col">
                  <Link
                    to={`/news/${post.slug}`}
                    className="font-heading text-xl text-dark hover:text-primary transition-colors block mb-2 font-semibold"
                  >
                    {post.title}
                  </Link>
                  <p className="text-sm text-body leading-relaxed flex-1">{post.excerpt || 'No summary available.'}</p>
                  {post.author_name && (
                    <p className="text-xs text-body mt-3 uppercase tracking-wide">By {post.author_name}</p>
                  )}
                </div>
              </article>
            ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
