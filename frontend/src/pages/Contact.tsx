import { useState } from 'react';
import toast from 'react-hot-toast';
import PageHero from '../components/PageHero';
import { FiPhone, FiMail, FiMapPin } from 'react-icons/fi';
import { useSiteSettings } from '../contexts/SiteSettingsContext';
import api from '../services/api';

export default function Contact() {
  const { getSetting } = useSiteSettings();
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', subject: '', message: '',
  });

  const contactAddress = getSetting('contact_address', 'House# 310, Road 2, Padma housing state, Padma abasik, Boalia, Rajshahi city, Rajshahi.');
  const contactPhone = getSetting('contact_phone', 'Front Office: 01334 945 375 | Reservations: 01334 945 376, 01334 945 377');
  const contactPhoneHref = getSetting('contact_phone_href', '01334945375');
  const contactEmail = getSetting('contact_email', 'hotelcrownbd@gmail.com');
  const mapEmbedUrl = getSetting('contact_map_embed_url', 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d6044.40092532528!2d-73.98786567500001!3d40.758893!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c25855c6480299%3A0x55194ec5a1ae072e!2sTimes%20Square!5e0!3m2!1sen!2sus!4v1234567890');

  const set = (k: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error('Name, email, and message are required');
      return;
    }
    setSending(true);
    try {
      await api.post('/contact/', {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        subject: form.subject.trim() || 'Website inquiry',
        message: form.message.trim(),
      });
      toast.success('Message sent! We will respond as soon as possible.');
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { detail?: string } } })?.response?.status;
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      if (status === 429) toast.error('Too many messages. Please try again later.');
      else toast.error(detail || 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <PageHero title="Contact Us" breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Contact' }]} />

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <span className="section-subtitle">GET IN TOUCH</span>
              <h2 className="section-title text-3xl md:text-4xl mt-4 mb-6">Contact Us</h2>
              <p className="text-body leading-relaxed mb-8">
                We'd love to hear from you. Hotel Crown is located in Padma Abasik, Rajshahi,
                Bangladesh. Send us a message and we'll respond as soon as possible.
              </p>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-teal-700 text-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
                    <FiMapPin className="text-slate-800" size={20} />
                  </div>
                  <div>
                    <h4 className="font-(--font-heading) text-lg text-dark mb-1">Address</h4>
                    <p className="text-sm text-body whitespace-pre-line">{contactAddress}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-teal-700 text-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
                    <FiPhone className="text-slate-800" size={20} />
                  </div>
                  <div>
                    <h4 className="font-(--font-heading) text-lg text-dark mb-1">Phone</h4>
                    <a href={`tel:${contactPhoneHref}`} className="text-sm text-body hover:text-primary">{contactPhone}</a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-teal-700 text-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
                    <FiMail className="text-slate-800" size={20} />
                  </div>
                  <div>
                    <h4 className="font-(--font-heading) text-lg text-dark mb-1">Email</h4>
                    <a href={`mailto:${contactEmail}`} className="text-sm text-body hover:text-primary">{contactEmail}</a>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-light p-8 md:p-10">
              <h3 className="text-2xl font-(--font-heading) text-dark mb-6">Send a Message</h3>
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <input type="text" placeholder="Your Name *" required value={form.name}
                    onChange={e => set('name', e.target.value)}
                    className="w-full border border-gray-200 px-4 py-3 text-sm outline-none focus:border-primary bg-white transition-colors" />
                  <input type="email" placeholder="Your Email *" required value={form.email}
                    onChange={e => set('email', e.target.value)}
                    className="w-full border border-gray-200 px-4 py-3 text-sm outline-none focus:border-primary bg-white transition-colors" />
                </div>
                <input type="text" placeholder="Your Phone" value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                  className="w-full border border-gray-200 px-4 py-3 text-sm outline-none focus:border-primary bg-white transition-colors" />
                <input type="text" placeholder="Subject" value={form.subject}
                  onChange={e => set('subject', e.target.value)}
                  className="w-full border border-gray-200 px-4 py-3 text-sm outline-none focus:border-primary bg-white transition-colors" />
                <textarea rows={5} placeholder="Your Message *" required value={form.message}
                  onChange={e => set('message', e.target.value)}
                  className="w-full border border-gray-200 px-4 py-3 text-sm outline-none focus:border-primary bg-white resize-none transition-colors" />
                <button type="submit" disabled={sending}
                  className="btn-primary !px-8 !py-3 w-auto disabled:opacity-60">
                  {sending ? 'SENDING…' : 'SEND MESSAGE'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <section className="h-100 bg-gray-200">
        <iframe title="Hotel Location" src={mapEmbedUrl} width="100%" height="100%" style={{ border: 0 }}
          allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
      </section>
    </>
  );
}
