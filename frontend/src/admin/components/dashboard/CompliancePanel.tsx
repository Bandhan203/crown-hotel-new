import { useNavigate } from 'react-router-dom';
import { MdPictureAsPdf, MdAdminPanelSettings, MdNightlight, MdDownload, MdSync } from 'react-icons/md';

interface Props {
  businessDate: string;
  auditReady?: boolean;
}

function formatDate(iso: string) {
  if (!iso) return '—';
  try {
    return new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function CompliancePanel({ businessDate, auditReady = true }: Props) {
  const navigate = useNavigate();

  return (
    <div className="p-4 bg-surface-container-low border border-outline-variant rounded-xl shadow-sm flex flex-col gap-4 shrink-0">
      <div>
        <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">Compliance & Exports</h4>
        <div className="flex flex-col gap-2">
          <button type="button" className="w-full flex items-center justify-between p-3 bg-white border border-outline-variant rounded-lg hover:border-primary transition-all group">
            <div className="flex items-center gap-3">
              <MdPictureAsPdf className="text-primary" size={22} />
              <span className="text-sm font-bold text-on-surface">Registration Card (PDF)</span>
            </div>
            <MdDownload className="text-outline group-hover:text-primary" size={20} />
          </button>
          <button type="button" className="w-full flex items-center justify-between p-3 bg-white border border-outline-variant rounded-lg hover:border-primary transition-all group">
            <div className="flex items-center gap-3">
              <MdAdminPanelSettings className="text-primary" size={22} />
              <span className="text-sm font-bold text-on-surface">Police Portal Export</span>
            </div>
            <MdSync className="text-outline group-hover:text-primary" size={20} />
          </button>
        </div>
      </div>

      <div className="pt-4 border-t border-outline-variant">
        <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">System Controls</h4>
        <div className="p-4 bg-white border border-outline-variant rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] text-outline font-bold uppercase">Business Date</p>
              <p className="text-lg font-extrabold text-primary">{formatDate(businessDate)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-outline font-bold uppercase">Audit Status</p>
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                auditReady
                  ? 'bg-status-available/10 text-status-available border-status-available/20'
                  : 'bg-status-dirty/10 text-status-dirty border-status-dirty/20'
              }`}>
                {auditReady ? 'READY' : 'PENDING'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/admin/night-audit')}
            className="w-full py-3 bg-status-occupied text-white rounded-lg font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all"
          >
            <MdNightlight size={20} /> Run Night Audit
          </button>
          <p className="mt-3 text-[10px] text-on-surface-variant leading-relaxed italic">
            * Running night audit will post daily charges and roll the business date. Ensure all departures are closed.
          </p>
        </div>
      </div>
    </div>
  );
}
