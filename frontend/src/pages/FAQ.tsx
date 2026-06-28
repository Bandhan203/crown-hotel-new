import { useEffect, useState } from 'react';
import PageHero from '../components/PageHero';
import SectionHeading from '../components/SectionHeading';
import { FiPlus, FiMinus } from 'react-icons/fi';
import api from '../services/api';

type FAQItem = {
  id: number;
  question: string;
  answer: string;
  order: number;
  is_active: boolean;
};

export default function FAQ() {
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadFaqs(): Promise<void> {
      try {
        setLoading(true);
        setError('');
        const res = await api.get<FAQItem[]>('/faq/');
        if (mounted) {
          const data = (res.data || []).sort((a, b) => a.order - b.order);
          setFaqs(data);
          setOpenIndex(data.length > 0 ? 0 : null);
        }
      } catch {
        if (mounted) {
          setError('Failed to load FAQs.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadFaqs();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      <PageHero
        title="FAQ"
        breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'FAQ' }]}
      />

      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <SectionHeading subtitle="YOUR QUESTIONS" title="Frequently Asked Questions" />
          {loading && <p className="text-body text-center">Loading FAQs...</p>}
          {!loading && error && <p className="text-red-600 text-center">{error}</p>}
          {!loading && !error && faqs.length === 0 && (
            <p className="text-body text-center">No FAQ items available right now.</p>
          )}

          {!loading && !error && faqs.length > 0 && (
            <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="border border-gray-200">
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left"
                >
                  <span
                    className={`font-(--font-heading) text-lg transition-colors ${
                      openIndex === index ? 'text-primary' : 'text-dark'
                    }`}
                  >
                    {faq.question}
                  </span>
                  <span className="text-primary ml-4 shrink-0">
                    {openIndex === index ? <FiMinus size={20} /> : <FiPlus size={20} />}
                  </span>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    openIndex === index ? 'max-h-96 pb-5' : 'max-h-0'
                  }`}
                >
                  <p className="px-6 text-body text-sm leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
