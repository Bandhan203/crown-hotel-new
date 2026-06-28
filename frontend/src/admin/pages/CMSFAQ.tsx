import { useEffect, useMemo, useState } from 'react';
import { MdAdd, MdArrowDownward, MdArrowUpward, MdDelete, MdEdit, MdQuiz } from 'react-icons/md';
import toast from 'react-hot-toast';
import api from '../../services/api';

type FAQItem = {
  id: number;
  question: string;
  answer: string;
  order: number;
  is_active: boolean;
};

type FAQForm = {
  question: string;
  answer: string;
  order: number;
  is_active: boolean;
};

function emptyForm(nextOrder: number): FAQForm {
  return {
    question: '',
    answer: '',
    order: nextOrder,
    is_active: true,
  };
}

export default function CMSFAQ() {
  const [items, setItems] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<FAQItem | null>(null);
  const [form, setForm] = useState<FAQForm>(emptyForm(0));

  async function fetchFaqs(): Promise<void> {
    setLoading(true);
    try {
      const res = await api.get<{ results?: FAQItem[] } | FAQItem[]>('/admin/faq/', {
        params: { ordering: 'order' },
      });
      const payload = res.data;
      const list = Array.isArray(payload) ? payload : (payload.results || []);
      setItems(list.sort((a, b) => a.order - b.order));
    } catch {
      toast.error('Failed to load FAQs');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchFaqs();
  }, []);

  const stats = useMemo(() => {
    const total = items.length;
    const active = items.filter((i) => i.is_active).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [items]);

  function openAdd(): void {
    const nextOrder = items.length ? Math.max(...items.map((i) => i.order)) + 1 : 1;
    setEditing(null);
    setForm(emptyForm(nextOrder));
    setShowModal(true);
  }

  function openEdit(item: FAQItem): void {
    setEditing(item);
    setForm({
      question: item.question,
      answer: item.answer,
      order: item.order,
      is_active: item.is_active,
    });
    setShowModal(true);
  }

  async function saveFaq(): Promise<void> {
    if (!form.question.trim()) {
      toast.error('Question is required');
      return;
    }
    if (!form.answer.trim()) {
      toast.error('Answer is required');
      return;
    }

    try {
      if (editing) {
        await api.put(`/admin/faq/${editing.id}/`, form);
        toast.success('FAQ updated');
      } else {
        await api.post('/admin/faq/', form);
        toast.success('FAQ created');
      }

      setShowModal(false);
      setEditing(null);
      await fetchFaqs();
    } catch {
      toast.error('Failed to save FAQ');
    }
  }

  async function deleteFaq(item: FAQItem): Promise<void> {
    const ok = window.confirm(`Delete FAQ: ${item.question}?`);
    if (!ok) return;

    try {
      await api.delete(`/admin/faq/${item.id}/`);
      toast.success('FAQ deleted');
      await fetchFaqs();
    } catch {
      toast.error('Failed to delete FAQ');
    }
  }

  async function moveItem(item: FAQItem, direction: 'up' | 'down'): Promise<void> {
    const sorted = [...items].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex((x) => x.id === item.id);
    if (index === -1) return;

    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sorted.length) return;

    const current = sorted[index];
    const target = sorted[swapIndex];

    const currentOrder = current.order;
    const targetOrder = target.order;

    try {
      await api.patch(`/admin/faq/${current.id}/`, { order: targetOrder });
      await api.patch(`/admin/faq/${target.id}/`, { order: currentOrder });
      toast.success('FAQ order updated');
      await fetchFaqs();
    } catch {
      toast.error('Failed to reorder FAQ');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: '"Gilda Display", serif' }}>
          <span className="inline mr-2 text-primary"><MdQuiz size={24} /></span>
          FAQ Management
        </h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-teal-600 text-white rounded-lg text-sm font-medium"
        >
          <MdAdd size={18} /> Add FAQ
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total FAQs" value={stats.total} />
        <StatCard label="Active" value={stats.active} />
        <StatCard label="Inactive" value={stats.inactive} />
      </div>

      {loading ? (
        <p className="text-gray-500">Loading FAQs...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500">No FAQ items yet.</p>
      ) : (
        <div className="space-y-3">
          {items
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((item, idx, arr) => (
              <div key={item.id} className="bg-[#161616] border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-200">Order: {item.order}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${item.is_active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <h3 className="text-slate-800 font-semibold line-clamp-1">{item.question}</h3>
                    <p className="text-sm text-gray-500 mt-1 whitespace-pre-line line-clamp-2">{item.answer}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => void moveItem(item, 'up')}
                      disabled={idx === 0}
                      className="p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Move Up"
                    >
                      <MdArrowUpward size={16} />
                    </button>
                    <button
                      onClick={() => void moveItem(item, 'down')}
                      disabled={idx === arr.length - 1}
                      className="p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Move Down"
                    >
                      <MdArrowDownward size={16} />
                    </button>
                    <button
                      onClick={() => openEdit(item)}
                      className="p-2 rounded-lg bg-blue-500/15 text-blue-300 hover:bg-blue-500/25"
                      title="Edit"
                    >
                      <MdEdit size={16} />
                    </button>
                    <button
                      onClick={() => void deleteFaq(item)}
                      className="p-2 rounded-lg bg-red-500/15 text-red-300 hover:bg-red-500/25"
                      title="Delete"
                    >
                      <MdDelete size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-2xl bg-[#161616] border border-gray-200 rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold text-slate-800 mb-5">{editing ? 'Edit FAQ' : 'Add FAQ'}</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Question</label>
                <input
                  value={form.question}
                  onChange={(e) => setForm((prev) => ({ ...prev, question: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-[#101010] border border-gray-200 text-slate-800 text-sm outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Answer</label>
                <textarea
                  value={form.answer}
                  onChange={(e) => setForm((prev) => ({ ...prev, answer: e.target.value }))}
                  rows={5}
                  className="w-full px-3 py-2 rounded-lg bg-[#101010] border border-gray-200 text-slate-800 text-sm outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Display Order</label>
                  <input
                    type="number"
                    value={form.order}
                    onChange={(e) => setForm((prev) => ({ ...prev, order: Number(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 rounded-lg bg-[#101010] border border-gray-200 text-slate-800 text-sm outline-none focus:border-primary"
                  />
                </div>

                <label className="inline-flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  Active (shown on public FAQ page)
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:text-slate-800">Cancel</button>
              <button onClick={() => void saveFaq()} className="px-4 py-2 rounded-lg bg-primary hover:bg-teal-600 text-slate-800">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[#151515] border border-gray-200 rounded-xl p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-semibold text-slate-800 mt-1">{value}</p>
    </div>
  );
}
