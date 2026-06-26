import { useEffect, useState } from 'react';
import PageHero from '../components/PageHero';
import { hotelImages } from '../constants/images';
import SectionHeading from '../components/SectionHeading';
import { FiFacebook, FiTwitter, FiInstagram, FiLinkedin, FiLink } from 'react-icons/fi';
import api from '../services/api';
import { toMediaUrl } from '../utils/mediaUrl';
import { unwrapList } from '../utils/cmsList';

type TeamMember = {
  id: number;
  name: string;
  role: string;
  image: string | null;
  bio?: string;
  social_links?: Record<string, string>;
};

export default function Team() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadTeam() {
      try {
        setLoading(true);
        const res = await api.get('/team/');
        if (mounted) {
          setTeam(unwrapList(res.data));
        }
      } catch {
        // Silently fail
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadTeam();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      <PageHero
        title="Our Team"
        breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Team' }]}
      />

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <SectionHeading subtitle="THE TEAM" title="Meet Our Staff" />
          
          {loading ? (
            <p className="text-center text-body">Loading team members...</p>
          ) : team.length === 0 ? (
            <p className="text-center text-body">No team members available right now.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {team.map((member, index) => (
                <div key={member.id} className="group text-center">
                  <div className="relative overflow-hidden mb-5">
                    <img
                      src={toMediaUrl(member.image, hotelImages.team[index % hotelImages.team.length])}
                      alt={member.name}
                      className="w-full h-[400px] object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-6">
                      <div className="flex gap-3">
                        {member.social_links?.facebook && (
                          <a href={member.social_links.facebook} target="_blank" rel="noreferrer" className="w-10 h-10 border border-white text-white flex items-center justify-center hover:bg-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors"><FiFacebook size={16} /></a>
                        )}
                        {member.social_links?.twitter && (
                          <a href={member.social_links.twitter} target="_blank" rel="noreferrer" className="w-10 h-10 border border-white text-white flex items-center justify-center hover:bg-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors"><FiTwitter size={16} /></a>
                        )}
                        {member.social_links?.instagram && (
                          <a href={member.social_links.instagram} target="_blank" rel="noreferrer" className="w-10 h-10 border border-white text-white flex items-center justify-center hover:bg-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors"><FiInstagram size={16} /></a>
                        )}
                        {member.social_links?.linkedin && (
                          <a href={member.social_links.linkedin} target="_blank" rel="noreferrer" className="w-10 h-10 border border-white text-white flex items-center justify-center hover:bg-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors"><FiLinkedin size={16} /></a>
                        )}
                        {/* Fallback if no specific links are present but we want to show icons */}
                        {(!member.social_links || Object.keys(member.social_links).length === 0) && (
                           <a href="#" className="w-10 h-10 border border-white text-white flex items-center justify-center hover:bg-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors"><FiLink size={16} /></a>
                        )}
                      </div>
                    </div>
                  </div>
                  <h3 className="font-[var(--font-heading)] text-xl text-[var(--color-dark)]">
                    {member.name}
                  </h3>
                  <p className="text-[var(--color-primary)] text-sm font-[var(--font-condensed)] tracking-[2px] uppercase mt-1">
                    {member.role}
                  </p>
                  {member.bio && (
                    <p className="text-body text-sm mt-3">{member.bio}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
