import PageHero from '../components/PageHero';
import { FaBed } from 'react-icons/fa';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { hotelImages } from '../constants/images';
import { toMediaUrl } from '../utils/mediaUrl';
import { getBookingAttribution } from '../utils/bookingChannel';
import { computeRatePlanPricing, type RatePlan } from '../admin/utils/ratePlanPricing';

export default function RoomDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [room, setRoom] = useState<any | null>(null);

  // Booking form state
  const today = new Date().toISOString().split('T')[0];
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [specialRequests, setSpecialRequests] = useState('');
  const [availability, setAvailability] = useState<{ available: boolean; available_count: number } | null>(null);
  const [booking, setBooking] = useState(false);
  const [ratePlans, setRatePlans] = useState<RatePlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | ''>('');

  const nights = checkIn && checkOut ? Math.max(0, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)) : 0;
  const rackPerNight = room?.price_per_night ? parseFloat(room.price_per_night) : 0;
  const selectedPlan = ratePlans.find(p => p.id === selectedPlanId) || null;
  const pricing = computeRatePlanPricing(rackPerNight, nights, 1, selectedPlan);
  const totalPrice = nights > 0 && rackPerNight > 0
    ? (parseFloat(pricing.offer_rate) * nights).toFixed(2)
    : null;

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    api.get(`/rooms/${id}/`).then(res => { if (mounted) setRoom(res.data); }).catch(() => {});
    return () => { mounted = false; };
  }, [id]);

  // Check availability when dates change
  useEffect(() => {
    if (!room?.id || !checkIn || !checkOut || checkIn >= checkOut) {
      setAvailability(null);
      return;
    }
    const timer = setTimeout(() => {
      api.post('/check-availability/', { room_type: room.id, check_in_date: checkIn, check_out_date: checkOut })
        .then(res => setAvailability(res.data))
        .catch(() => setAvailability(null));
    }, 400);
    return () => clearTimeout(timer);
  }, [checkIn, checkOut, room?.id]);

  useEffect(() => {
    if (!room?.id || !checkIn || !checkOut || checkIn >= checkOut) {
      setRatePlans([]);
      setSelectedPlanId('');
      return;
    }
    api.get('/rate-plans/available/', {
      params: { room_type: room.id, check_in_date: checkIn, check_out_date: checkOut },
    })
      .then(res => {
        const plans = res.data.results ?? res.data ?? [];
        setRatePlans(plans);
        setSelectedPlanId('');
      })
      .catch(() => setRatePlans([]));
  }, [checkIn, checkOut, room?.id]);

  const handleBookNow = async () => {
    if (!user) {
      navigate(`/login?next=/room-details/${id}`);
      return;
    }
    if (!checkIn || !checkOut) { toast.error('Please select check-in and check-out dates'); return; }
    if (checkIn >= checkOut) { toast.error('Check-out must be after check-in'); return; }
    if (checkIn < today) { toast.error('Check-in cannot be in the past'); return; }
    if (availability && !availability.available) { toast.error('No rooms available for the selected dates'); return; }

    setBooking(true);
    try {
      const res = await api.post('/bookings/', {
        room_type: room.id,
        check_in_date: checkIn,
        check_out_date: checkOut,
        adults,
        children,
        special_requests: specialRequests,
        reference_source: getBookingAttribution(),
        ...(selectedPlanId ? { rate_plan: selectedPlanId } : {}),
      });

      // Initiate SSLCommerz payment
      try {
        const payRes = await api.post('/payments/initiate/', { booking_id: res.data.id });
        toast.success('Redirecting to payment…');
        window.location.href = payRes.data.payment_url;
      } catch {
        toast.error('Payment initiation failed. You can pay later from My Bookings.');
        navigate('/booking-confirmation', { state: { booking: res.data } });
      }
    } catch (e: any) {
      const err = e?.response?.data;
      toast.error(err?.detail || (typeof err === 'object' ? Object.values(err).flat().join(' ') : 'Booking failed'));
    } finally {
      setBooking(false);
    }
  };

  const amenities = room?.amenities || [];
  const images = room?.images || [];

  return (
    <>
      <PageHero
        title={room?.name || 'Room Details'}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Rooms', path: '/rooms' },
          { name: room?.name || 'Room Details' },
        ]}
        backgroundImage={toMediaUrl(images[0]?.image, hotelImages.roomDetailsFallback)}
      />

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Main content */}
            <div className="lg:col-span-2">
              {/* Room Slider */}
              <Swiper
                modules={[Autoplay, Pagination]}
                autoplay={{ delay: 4000 }}
                pagination={{ clickable: true }}
                loop
                className="mb-8"
              >
                {images.map((img: any, i: number) => (
                  <SwiperSlide key={i}>
                    <img src={toMediaUrl(img.image, hotelImages.roomDetailsFallback)} alt={`Room view ${i + 1}`} className="w-full h-[250px] sm:h-[350px] lg:h-[500px] object-cover" />
                  </SwiperSlide>
                ))}
              </Swiper>

              <h2 className="text-3xl font-[var(--font-heading)] text-[var(--color-dark)] mb-4">{room?.name}</h2>

              <div className="flex flex-wrap gap-4 mb-6 text-sm text-[var(--color-body)]">
                <span>👤 {room?.max_guests} guests</span>
                <span>🛏️ {room?.beds} bed{room?.beds > 1 ? 's' : ''}</span>
                <span>📏 {room?.size} sq ft</span>
                <span>🏠 {room?.view_type}</span>
              </div>

              <p className="text-[var(--color-body)] leading-relaxed mb-6">{room?.description}</p>

              {/* Amenities */}
              <h3 className="text-2xl font-[var(--font-heading)] text-[var(--color-dark)] mb-6">Amenities</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                {amenities.map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 border border-gray-100">
                    <span className="text-[var(--color-primary)]"><FaBed size={20} /></span>
                    <span className="text-sm text-[var(--color-dark)]">{item.name}</span>
                  </div>
                ))}
              </div>

              {/* Rules */}
              <h3 className="text-2xl font-[var(--font-heading)] text-[var(--color-dark)] mb-4">Hotel Rules</h3>
              <ul className="text-[var(--color-body)] text-sm space-y-2 list-disc pl-5">
                <li>Check-in: 3:00 PM – 9:00 PM</li>
                <li>Check-out: 10:00 AM</li>
                <li>No smoking</li>
                <li>No pets</li>
                <li>No parties or events</li>
              </ul>
            </div>

            {/* Sidebar */}
            <div>
              {/* Booking Card */}
              <div className="bg-[var(--color-light)] p-6 mb-8">
                <h3 className="text-xl font-[var(--font-heading)] text-[var(--color-dark)] mb-2">{room?.name}</h3>
                <div className="text-[var(--color-primary)] text-2xl font-[var(--font-heading)] mb-6">
                  BDT {room?.price_per_night} <span className="text-sm text-[var(--color-body)]">/ night</span>
                </div>

                <div className="space-y-4 mb-4">
                  <div>
                    <label className="block text-xs font-[var(--font-condensed)] uppercase tracking-[2px] text-[var(--color-dark)] mb-2">
                      Check-in
                    </label>
                    <input type="date" value={checkIn} min={today}
                      onChange={e => setCheckIn(e.target.value)}
                      className="w-full border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[var(--color-primary)]" />
                  </div>
                  <div>
                    <label className="block text-xs font-[var(--font-condensed)] uppercase tracking-[2px] text-[var(--color-dark)] mb-2">
                      Check-out
                    </label>
                    <input type="date" value={checkOut} min={checkIn || today}
                      onChange={e => setCheckOut(e.target.value)}
                      className="w-full border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[var(--color-primary)]" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-[var(--font-condensed)] uppercase tracking-[2px] text-[var(--color-dark)] mb-2">Adults</label>
                      <select value={adults} onChange={e => setAdults(parseInt(e.target.value))}
                        className="w-full border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[var(--color-primary)] bg-white">
                        {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-[var(--font-condensed)] uppercase tracking-[2px] text-[var(--color-dark)] mb-2">Children</label>
                      <select value={children} onChange={e => setChildren(parseInt(e.target.value))}
                        className="w-full border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[var(--color-primary)] bg-white">
                        {[0, 1, 2, 3].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                  </div>
                  {ratePlans.length > 0 && (
                    <div>
                      <label className="block text-xs font-[var(--font-condensed)] uppercase tracking-[2px] text-[var(--color-dark)] mb-2">
                        Rate Plan
                      </label>
                      <select value={selectedPlanId} onChange={e => setSelectedPlanId(e.target.value ? parseInt(e.target.value, 10) : '')}
                        className="w-full border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[var(--color-primary)] bg-white">
                        <option value="">Standard rack rate</option>
                        {ratePlans.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.code}) — {p.discount_type === 'PERCENTAGE' ? `${p.discount_value}% off` : `BDT ${p.discount_value} off`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-[var(--font-condensed)] uppercase tracking-[2px] text-[var(--color-dark)] mb-2">
                      Special Requests
                    </label>
                    <textarea value={specialRequests} onChange={e => setSpecialRequests(e.target.value)}
                      rows={2} placeholder="Any special requests…"
                      className="w-full border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[var(--color-primary)] resize-none" />
                  </div>
                </div>

                {/* Availability + price summary */}
                {nights > 0 && (
                  <div className="mb-4 text-sm">
                    <div className="flex justify-between text-[var(--color-body)]">
                      <span>
                        {nights} night{nights > 1 ? 's' : ''} × BDT {pricing.offer_rate}
                        {selectedPlan && parseFloat(pricing.discount_amount) > 0 && (
                          <span className="text-green-600 text-xs ml-1">(plan applied)</span>
                        )}
                      </span>
                      <span className="font-semibold text-[var(--color-dark)]">BDT {totalPrice}</span>
                    </div>
                    {availability && (
                      <p className={`mt-2 text-xs font-medium ${availability.available ? 'text-green-600' : 'text-red-500'}`}>
                        {availability.available
                          ? `✓ ${availability.available_count} room${availability.available_count > 1 ? 's' : ''} available`
                          : '✗ No rooms available for these dates'}
                      </p>
                    )}
                  </div>
                )}

                <button onClick={handleBookNow} disabled={booking || (!!availability && !availability.available)}
                  className="w-full bg-[var(--color-primary)] text-slate-800 py-3 font-[var(--font-condensed)] text-sm uppercase tracking-[3px] hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                  {booking ? 'Processing…' : user ? 'BOOK NOW' : 'LOGIN TO BOOK'}
                </button>
              </div>

              {/* Contact Box */}
              <div className="bg-[var(--color-dark)] text-white p-6">
                <h4 className="text-lg font-[var(--font-heading)] mb-4">Need Help?</h4>
                <p className="text-white/70 text-sm mb-4">Feel free to contact us if you have any questions.</p>
                <a href="tel:01334945375" className="text-[var(--color-primary)] font-[var(--font-heading)] text-lg block mb-2">
                  01334 945 375
                </a>
                <a href="mailto:hotelcrownbd@gmail.com" className="text-white/70 text-sm">
                  hotelcrownbd@gmail.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
