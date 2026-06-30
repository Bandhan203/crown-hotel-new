import { useCallback, useEffect, useState } from 'react';
import { MdCleaningServices, MdRefresh, MdAdd, MdFilterList } from 'react-icons/md';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { DIRTY_HK, HK_COLORS, HK_STATUSES } from '../utils/housekeepingStatus';

interface BoardRoom {
  id: number;
  room_number: string;
  room_type_name: string;
  floor: number;
  status: string;
  housekeeping_status: string;
  last_cleaned_at: string | null;
  is_smoking: boolean;
  notes: string;
}

interface HKTask {
  id: number;
  room: number;
  room_number: string;
  room_type_name: string;
  booking_ref?: string | null;
  task_type: string;
  priority: string;
  status: string;
  assigned_to: number | null;
  assigned_to_name: string | null;
  notes: string;
  scheduled_date: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface StaffMember {
  id: number;
  full_name: string;
  email: string;
}

const ROOM_STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'border-green-500/40',
  OCCUPIED: 'border-yellow-500/40',
  MAINTENANCE: 'border-red-500/40',
  RESERVED: 'border-blue-500/40',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'text-gray-500',
  NORMAL: 'text-blue-400',
  HIGH: 'text-orange-400',
  URGENT: 'text-red-400',
};

const TASK_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-400',
  IN_PROGRESS: 'bg-blue-500/20 text-blue-400',
  COMPLETED: 'bg-green-500/20 text-green-400',
  SKIPPED: 'bg-gray-500/20 text-gray-500',
};

export default function HousekeepingBoard() {
  const [rooms, setRooms] = useState<BoardRoom[]>([]);
  const [tasks, setTasks] = useState<HKTask[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [hkFilter, setHkFilter] = useState<string>('ALL');
  const [floorFilter, setFloorFilter] = useState<string>('ALL');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ room: '', task_type: 'CLEAN', priority: 'NORMAL', assigned_to: '', notes: '', scheduled_date: new Date().toISOString().split('T')[0] });
  const [selectedTask, setSelectedTask] = useState<HKTask | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [roomsRes, tasksRes] = await Promise.all([
        api.get('/admin/housekeeping/board/'),
        api.get('/admin/housekeeping/', { params: { page_size: 100, scheduled_date: new Date().toISOString().split('T')[0] } }),
      ]);
      setRooms(roomsRes.data);
      setTasks(tasksRes.data.results ?? tasksRes.data);
    } catch {
      toast.error('Failed to load housekeeping data');
    }
    setLoading(false);
  }, []);

  const fetchStaff = useCallback(async () => {
    try {
      const res = await api.get('/admin/staff/', { params: { page_size: 50 } });
      setStaffList((res.data.results ?? res.data).map((s: any) => ({ id: s.user, full_name: s.full_name || s.user_name, email: s.email || '' })));
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchData(); fetchStaff(); }, [fetchData, fetchStaff]);

  useEffect(() => {
    const interval = setInterval(fetchData, 20000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const floors = [...new Set(rooms.map(r => r.floor))].sort();

  const filteredRooms = rooms.filter(r => {
    if (hkFilter !== 'ALL' && r.housekeeping_status !== hkFilter) return false;
    if (floorFilter !== 'ALL' && r.floor !== Number(floorFilter)) return false;
    return true;
  });

  async function updateRoomHK(roomId: number, newStatus: string) {
    try {
      await api.patch(`/admin/rooms/${roomId}/housekeeping-status/`, { housekeeping_status: newStatus });
      toast.success('Status updated');
      fetchData();
    } catch {
      toast.error('Failed to update');
    }
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/admin/housekeeping/', {
        ...taskForm,
        room: Number(taskForm.room),
        assigned_to: taskForm.assigned_to ? Number(taskForm.assigned_to) : null,
      });
      toast.success('Task created');
      setShowTaskForm(false);
      setTaskForm({ room: '', task_type: 'CLEAN', priority: 'NORMAL', assigned_to: '', notes: '', scheduled_date: new Date().toISOString().split('T')[0] });
      fetchData();
    } catch {
      toast.error('Failed to create task');
    }
    setSaving(false);
  }

  async function updateTaskStatus(taskId: number, newStatus: string) {
    try {
      const payload: Record<string, any> = { status: newStatus };
      if (newStatus === 'IN_PROGRESS') payload.started_at = new Date().toISOString();
      if (newStatus === 'COMPLETED') payload.completed_at = new Date().toISOString();
      await api.patch(`/admin/housekeeping/${taskId}/`, payload);
      toast.success('Task updated');
      setSelectedTask(null);
      fetchData();
    } catch {
      toast.error('Failed to update task');
    }
  }

  // Summary counts
  const counts = {
    clean: rooms.filter(r => ['OC', 'VC', 'ARR'].includes(r.housekeeping_status)).length,
    dirty: rooms.filter(r => DIRTY_HK.has(r.housekeeping_status)).length,
    inspected: rooms.filter(r => r.housekeeping_status === 'ARR').length,
    ooo: rooms.filter(r => r.status === 'MAINTENANCE').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: '"Gilda Display", serif' }}>
            <MdCleaningServices className="inline mr-2 text-teal-700" />Housekeeping Board
          </h1>
          <p className="text-sm text-gray-500 mt-1">Room cleaning status and task management</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="p-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 hover:text-slate-800">
            <MdRefresh size={18} />
          </button>
          <button onClick={() => setShowTaskForm(true)} className="flex items-center gap-2 px-4 py-2 bg-teal-700 text-white rounded-lg text-sm font-medium hover:bg-teal-600">
            <MdAdd size={18} />New Task
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Clean', count: counts.clean, color: 'text-green-400 bg-green-500/10 border-green-500/20' },
          { label: 'Dirty', count: counts.dirty, color: 'text-red-400 bg-red-500/10 border-red-500/20' },
          { label: 'Inspected', count: counts.inspected, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
          { label: 'Out of Order', count: counts.ooo, color: 'text-gray-500 bg-gray-500/10 border-gray-500/20' },
        ].map(c => (
          <div key={c.label} className={`rounded-xl border p-4 ${c.color}`}>
            <p className="text-2xl font-bold">{c.count}</p>
            <p className="text-xs opacity-80 mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <MdFilterList className="text-gray-500" size={18} />
        <select value={hkFilter} onChange={e => setHkFilter(e.target.value)}
          className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-teal-600">
          <option value="ALL">All Status</option>
          {HK_STATUSES.map(([code, label]) => (
            <option key={code} value={code}>{label}</option>
          ))}
        </select>
        <select value={floorFilter} onChange={e => setFloorFilter(e.target.value)}
          className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-teal-600">
          <option value="ALL">All Floors</option>
          {floors.map(f => <option key={f} value={f}>Floor {f}</option>)}
        </select>
        <span className="text-xs text-gray-500 ml-auto">{filteredRooms.length} rooms</span>
      </div>

      {/* Room Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filteredRooms.map(room => {
            const hk = HK_COLORS[room.housekeeping_status] || HK_COLORS.VC;
            const roomTasks = tasks.filter(t => t.room === room.id && t.status !== 'COMPLETED' && t.status !== 'SKIPPED');
            return (
              <div key={room.id} className={`bg-gray-50 border-2 ${ROOM_STATUS_COLORS[room.status] || 'border-gray-200'} rounded-xl p-3 relative`}>
                {/* Room number */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-800 font-bold text-lg">{room.room_number}</span>
                  {room.is_smoking && <span className="text-xs text-orange-400" title="Smoking">🚬</span>}
                </div>
                <p className="text-xs text-gray-500 mb-2">{room.room_type_name} · F{room.floor}</p>

                {/* HK Status Badge */}
                <div className={`px-2 py-1 rounded text-xs font-medium text-center ${hk.bg} ${hk.text} mb-2`}>
                  {hk.label}
                </div>

                {/* Room Status */}
                <p className="text-xs text-gray-500 mb-2">{room.status.replace('_', ' ')}</p>

                {/* Active Tasks */}
                {roomTasks.length > 0 && (
                  <div className="space-y-1 mb-2">
                    {roomTasks.map(t => (
                      <button key={t.id} onClick={() => setSelectedTask(t)}
                        className={`w-full text-left px-2 py-1 rounded text-xs ${TASK_STATUS_COLORS[t.status] || ''} hover:opacity-80`}>
                        {t.task_type} <span className={PRIORITY_COLORS[t.priority]}>●</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Quick Actions */}
                <div className="flex gap-1 mt-auto">
                  {DIRTY_HK.has(room.housekeeping_status) && (
                    <button onClick={() => updateRoomHK(room.id, 'VC')} className="flex-1 px-1 py-1 text-xs bg-green-500/10 text-green-400 rounded hover:bg-green-500/20">
                      Clean
                    </button>
                  )}
                  {room.housekeeping_status === 'VC' && (
                    <button onClick={() => updateRoomHK(room.id, 'ARR')} className="flex-1 px-1 py-1 text-xs bg-blue-500/10 text-blue-400 rounded hover:bg-blue-500/20">
                      Ready
                    </button>
                  )}
                  {!DIRTY_HK.has(room.housekeeping_status) && room.housekeeping_status !== 'VD' && (
                    <button onClick={() => updateRoomHK(room.id, 'VD')} className="flex-1 px-1 py-1 text-xs bg-red-500/10 text-red-400 rounded hover:bg-red-500/20">
                      Dirty
                    </button>
                  )}
                </div>

                {/* Last cleaned */}
                {room.last_cleaned_at && (
                  <p className="text-xs text-gray-600 mt-2" title={room.last_cleaned_at}>
                    Cleaned: {new Date(room.last_cleaned_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Today's Tasks List */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-3">Today's Tasks</h2>
        {tasks.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6 bg-gray-50 rounded-xl border border-gray-200">No tasks scheduled for today</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs">
                  <th className="text-left px-4 py-3">Room</th>
                  <th className="text-left px-4 py-3">Booking</th>
                  <th className="text-left px-4 py-3">Task</th>
                  <th className="text-left px-4 py-3">Priority</th>
                  <th className="text-left px-4 py-3">Assigned To</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tasks.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-slate-800 font-medium">{t.room_number}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">{t.booking_ref || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{t.task_type.replace('_', ' ')}</td>
                    <td className="px-4 py-3"><span className={PRIORITY_COLORS[t.priority]}>{t.priority}</span></td>
                    <td className="px-4 py-3 text-gray-600">{t.assigned_to_name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TASK_STATUS_COLORS[t.status] || ''}`}>
                        {t.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {t.status === 'PENDING' && (
                          <button onClick={() => updateTaskStatus(t.id, 'IN_PROGRESS')} className="px-2 py-1 text-xs bg-blue-500/10 text-blue-400 rounded hover:bg-blue-500/20">Start</button>
                        )}
                        {t.status === 'IN_PROGRESS' && (
                          <button onClick={() => updateTaskStatus(t.id, 'COMPLETED')} className="px-2 py-1 text-xs bg-green-500/10 text-green-400 rounded hover:bg-green-500/20">Complete</button>
                        )}
                        {(t.status === 'PENDING' || t.status === 'IN_PROGRESS') && (
                          <button onClick={() => updateTaskStatus(t.id, 'SKIPPED')} className="px-2 py-1 text-xs bg-gray-500/10 text-gray-500 rounded hover:bg-gray-500/20">Skip</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      {showTaskForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowTaskForm(false)}>
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-slate-800">New Housekeeping Task</h2>
            </div>
            <form onSubmit={createTask} className="p-6 space-y-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Room *</label>
                <select required value={taskForm.room} onChange={e => setTaskForm(p => ({ ...p, room: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-teal-600">
                  <option value="">Select room…</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.room_number} — {r.room_type_name} (F{r.floor})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Task Type</label>
                  <select value={taskForm.task_type} onChange={e => setTaskForm(p => ({ ...p, task_type: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-teal-600">
                    <option value="CLEAN">Clean</option>
                    <option value="DEEP_CLEAN">Deep Clean</option>
                    <option value="INSPECT">Inspect</option>
                    <option value="TURNDOWN">Turndown</option>
                    <option value="MAINTENANCE">Maintenance</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Priority</label>
                  <select value={taskForm.priority} onChange={e => setTaskForm(p => ({ ...p, priority: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-teal-600">
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Assign To</label>
                <select value={taskForm.assigned_to} onChange={e => setTaskForm(p => ({ ...p, assigned_to: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-teal-600">
                  <option value="">Unassigned</option>
                  {staffList.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Scheduled Date</label>
                <input type="date" value={taskForm.scheduled_date} onChange={e => setTaskForm(p => ({ ...p, scheduled_date: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-teal-600" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Notes</label>
                <textarea value={taskForm.notes} onChange={e => setTaskForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-teal-600" />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 bg-teal-700 text-white rounded-lg text-sm font-medium hover:bg-teal-600 disabled:opacity-50">
                  {saving ? 'Creating…' : 'Create Task'}
                </button>
                <button type="button" onClick={() => setShowTaskForm(false)}
                  className="px-6 py-2.5 border border-gray-200 text-gray-500 rounded-lg text-sm hover:text-slate-800">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelectedTask(null)}>
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Task Details</h2>
                <p className="text-sm text-gray-500">Room {selectedTask.room_number}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TASK_STATUS_COLORS[selectedTask.status] || ''}`}>
                {selectedTask.status.replace('_', ' ')}
              </span>
            </div>
            <div className="p-6 space-y-3">
              <InfoRow label="Type" value={selectedTask.task_type.replace('_', ' ')} />
              <InfoRow label="Priority" value={selectedTask.priority} />
              <InfoRow label="Assigned" value={selectedTask.assigned_to_name || 'Unassigned'} />
              <InfoRow label="Scheduled" value={selectedTask.scheduled_date} />
              {selectedTask.started_at && <InfoRow label="Started" value={new Date(selectedTask.started_at).toLocaleString()} />}
              {selectedTask.completed_at && <InfoRow label="Completed" value={new Date(selectedTask.completed_at).toLocaleString()} />}
              {selectedTask.notes && <InfoRow label="Notes" value={selectedTask.notes} />}

              <div className="flex gap-2 pt-3">
                {selectedTask.status === 'PENDING' && (
                  <button onClick={() => updateTaskStatus(selectedTask.id, 'IN_PROGRESS')}
                    className="flex-1 py-2 text-sm bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30">Start</button>
                )}
                {selectedTask.status === 'IN_PROGRESS' && (
                  <button onClick={() => updateTaskStatus(selectedTask.id, 'COMPLETED')}
                    className="flex-1 py-2 text-sm bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30">Complete</button>
                )}
                <button onClick={() => setSelectedTask(null)}
                  className="flex-1 py-2 text-sm border border-gray-200 text-gray-500 rounded-lg hover:text-slate-800">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-slate-800">{value}</span>
    </div>
  );
}
