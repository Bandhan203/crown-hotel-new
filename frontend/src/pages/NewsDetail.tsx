import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageHero from '../components/PageHero';
import api from '../services/api';
import { toMediaUrl } from '../utils/mediaUrl';
import { hotelImages } from '../constants/images';

type NewsPostDetail = {
  id: number;
  title: string;
  slug: string;
  category: string;
  content: string;
  excerpt: string;
  image: string | null;
  author_name?: string | null;
  published_at: string | null;
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

export default function NewsDetail() {
  const { slug } = useParams();
  const [post, setPost] = useState<NewsPostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadDetail(): Promise<void> {
      if (!slug) {
        setError('Invalid article URL.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const res = await api.get<NewsPostDetail>(`/news/${slug}/`);
        if (mounted) {
          setPost(res.data);
        }
      } catch {
        if (mounted) {
          setError('News article not found or unpublished.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadDetail();
    return () => {
      mounted = false;
    };
  }, [slug]);

  return (
    <>
      <PageHero
        title={post?.title || 'News'}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'News', path: '/news' },
          { name: post?.title || 'Article' },
        ]}
      />

      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          {loading && <p className="text-body">Loading article...</p>}

          {!loading && error && (
            <div className="space-y-4">
              <p className="text-red-600">{error}</p>
              <Link to="/news" className="text-primary hover:underline">Back to all news</Link>
            </div>
          )}

          {!loading && !error && post && (
            <article>
              <img
                src={toAbsoluteMediaUrl(post.image)}
                alt={post.title}
                className="w-full h-105 object-cover rounded-md mb-8"
              />

              <div className="flex flex-wrap gap-3 mb-4 text-xs uppercase tracking-wide">
                <span className="bg-teal-700 text-white px-3 py-1 rounded shadow-sm">
                  {formatPublishedDate(post.published_at)}
                </span>
                {post.category && <span className="bg-stone-100 text-stone-800 px-3 py-1">{post.category}</span>}
                {post.author_name && <span className="bg-stone-100 text-stone-800 px-3 py-1">By {post.author_name}</span>}
              </div>

              <h1 className="font-(--font-heading) text-4xl text-dark mb-4">{post.title}</h1>
              {post.excerpt && <p className="text-lg text-body mb-8">{post.excerpt}</p>}

              <div className="prose prose-stone max-w-none whitespace-pre-line text-body leading-8">
                {post.content}
              </div>

              <div className="mt-10 pt-6 border-t border-stone-200">
                <Link to="/news" className="text-primary hover:underline">Back to all news</Link>
              </div>
            </article>
          )}
        </div>
      </section>
    </>
  );
}
