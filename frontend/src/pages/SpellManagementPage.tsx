import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Sparkles,
  CheckCircle2,
  Clock,
  PlusCircle,
  Edit3,
  Copy,
  Trash2,
  AlertCircle,
  RefreshCw,
  Sliders,
  Check,
  X,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { spellManagementService, Spell } from '../services/spellManagementService';

// Helper to format date string YYYY-MM-DD to DD-MMM-YYYY (e.g., 01-Aug-2026)
function formatDateDisplay(dateStr?: string): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (e) {
    return dateStr;
  }
}

export const SpellManagementPage: React.FC = () => {
  const [spells, setSpells] = useState<Spell[]>([]);
  const [activeSpell, setActiveSpellState] = useState<Spell | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [spellName, setSpellName] = useState<string>('Spell 1');
  const [fromDate, setFromDate] = useState<string>('2026-08-01');
  const [toDate, setToDate] = useState<string>('2026-09-30');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  // Modal State for Delete Confirmation
  const [deletingSpell, setDeletingSpell] = useState<Spell | null>(null);

  const fetchSpellsData = async () => {
    setIsLoading(true);
    try {
      const res = await spellManagementService.getSpells();
      if (res.success) {
        setSpells(res.spells);
        setActiveSpellState(res.activeSpell);

        // Auto-increment default name suggestion if creating
        if (!editingId && res.spells.length > 0) {
          const nextNum = res.spells.length + 1;
          setSpellName(`Spell ${nextNum}`);
        }
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to fetch spells data.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSpellsData();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    const nextNum = spells.length + 1;
    setSpellName(`Spell ${nextNum}`);
    setFromDate('2026-08-01');
    setToDate('2026-09-30');
    setStatus('ACTIVE');
  };

  const handleEditClick = (sp: Spell) => {
    setEditingId(sp.id);
    setSpellName(sp.spell_name);
    setFromDate(sp.start_date);
    setToDate(sp.end_date);
    setStatus(sp.is_active === 1 || sp.is_active === true ? 'ACTIVE' : 'INACTIVE');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spellName.trim() || !fromDate || !toDate) {
      setMessage({ type: 'error', text: 'Please fill in all required spell parameters.' });
      return;
    }

    if (new Date(fromDate) > new Date(toDate)) {
      setMessage({ type: 'error', text: 'From Date cannot be later than To Date.' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      if (editingId) {
        const res = await spellManagementService.updateSpell(editingId, {
          spell_name: spellName.trim(),
          start_date: fromDate,
          end_date: toDate,
          status
        });
        if (res.success) {
          setMessage({ type: 'success', text: `Updated ${spellName} successfully.` });
          resetForm();
          await fetchSpellsData();
        }
      } else {
        const res = await spellManagementService.createSpell({
          spell_name: spellName.trim(),
          start_date: fromDate,
          end_date: toDate,
          status
        });
        if (res.success) {
          setMessage({ type: 'success', text: `Created ${spellName} successfully.` });
          resetForm();
          await fetchSpellsData();
        }
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to save spell.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivate = async (id: string, name: string) => {
    setIsSubmitting(true);
    try {
      const res = await spellManagementService.setActiveSpell(id);
      if (res.success) {
        setMessage({ type: 'success', text: `${name} is now the ACTIVE spell across all portals.` });
        await fetchSpellsData();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to activate spell.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDuplicate = async (sp: Spell) => {
    setIsSubmitting(true);
    try {
      const res = await spellManagementService.duplicateSpell(sp.id);
      if (res.success) {
        setMessage({ type: 'success', text: `Duplicated ${sp.spell_name} into a new spell.` });
        await fetchSpellsData();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to duplicate spell.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingSpell) return;
    setIsSubmitting(true);
    try {
      const res = await spellManagementService.deleteSpell(deletingSpell.id);
      if (res.success) {
        setMessage({ type: 'success', text: `Deleted spell configuration for ${deletingSpell.spell_name}.` });
        setDeletingSpell(null);
        await fetchSpellsData();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to delete spell configuration.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#111827] via-[#1E1B4B] to-[#312E81] rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-[#6D5DFC]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold uppercase tracking-wider text-purple-200 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              Centralized ERP Spell Settings
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-display">
              Spell Date Management
            </h1>
            <p className="text-sm text-purple-200 mt-1 max-w-xl">
              Define official academic spell periods once. All portals (Admin, Student, Faculty, & Analytics) will automatically calculate attendance according to the active spell.
            </p>
          </div>

          {/* Active Spell Highlight Card */}
          {activeSpell && (
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 md:p-5 w-full md:w-auto min-w-[280px] shadow-enterprise">
              <div className="flex items-center justify-between gap-3 text-xs text-purple-200 font-semibold mb-1">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  CURRENT ACTIVE SPELL
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 text-[10px]">
                  ACTIVE
                </span>
              </div>
              <div className="text-xl font-black text-white font-display mt-0.5">
                {activeSpell.spell_name}
              </div>
              <div className="flex items-center gap-2 text-xs font-mono font-medium text-emerald-200 mt-1.5">
                <span>{formatDateDisplay(activeSpell.start_date)}</span>
                <ArrowRight className="w-3 h-3 text-purple-300" />
                <span>{formatDateDisplay(activeSpell.end_date)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Alert Notifications */}
      {message && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between text-sm ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Grid: Form + Spells List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Create / Edit Spell Form */}
        <div className="lg:col-span-5 bg-white border border-[#E7E7E7] rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-[#F0F0F0] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#F3F0FF] text-[#6D5DFC] flex items-center justify-center font-bold">
                {editingId ? <Edit3 className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="text-base font-extrabold text-[#111827]">
                  {editingId ? 'Edit Spell Period' : 'Create New Spell'}
                </h2>
                <p className="text-xs text-[#6B7280]">
                  {editingId ? 'Update dates and active status' : 'Define new official spell dates'}
                </p>
              </div>
            </div>
            {editingId && (
              <button
                onClick={resetForm}
                className="text-xs text-[#6B7280] hover:text-[#111827] px-2.5 py-1 rounded-lg bg-gray-100 font-medium"
              >
                Cancel
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Spell Name */}
            <div>
              <label className="block text-xs font-extrabold text-[#374151] mb-1.5 uppercase tracking-wide">
                Spell Name
              </label>
              <input
                type="text"
                value={spellName}
                onChange={(e) => setSpellName(e.target.value)}
                placeholder="e.g. Spell 1, Spell 2"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#6D5DFC] focus:border-transparent text-sm text-[#111827] font-medium"
              />
            </div>

            {/* From Date */}
            <div>
              <label className="block text-xs font-extrabold text-[#374151] mb-1.5 uppercase tracking-wide">
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#6D5DFC] focus:border-transparent text-sm text-[#111827] font-medium"
              />
            </div>

            {/* To Date */}
            <div>
              <label className="block text-xs font-extrabold text-[#374151] mb-1.5 uppercase tracking-wide">
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#6D5DFC] focus:border-transparent text-sm text-[#111827] font-medium"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-extrabold text-[#374151] mb-1.5 uppercase tracking-wide">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#6D5DFC] focus:border-transparent text-sm text-[#111827] font-medium bg-white"
              >
                <option value="ACTIVE">ACTIVE (System-wide default)</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
              <p className="text-[11px] text-[#6B7280] mt-1.5">
                Note: Setting this spell to ACTIVE will automatically deactivate all other spells.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-[#6D5DFC] hover:bg-[#5B4BE5] text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {isSubmitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>{editingId ? 'Update Spell' : 'Save Spell'}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Spells List */}
        <div className="lg:col-span-7 bg-white border border-[#E7E7E7] rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-[#F0F0F0] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#F3F0FF] text-[#6D5DFC] flex items-center justify-center font-bold">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-[#111827]">Configured Spell Periods</h2>
                <p className="text-xs text-[#6B7280]">
                  Only ONE spell period can be ACTIVE at any time
                </p>
              </div>
            </div>

            <button
              onClick={fetchSpellsData}
              className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              title="Refresh Spells"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-gray-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-[#6D5DFC]" />
              <span className="text-xs font-medium">Loading spell management data...</span>
            </div>
          ) : spells.length === 0 ? (
            <div className="py-12 text-center text-gray-400 space-y-2 border-2 border-dashed border-gray-100 rounded-2xl">
              <Calendar className="w-8 h-8 mx-auto text-gray-300" />
              <p className="text-sm font-semibold text-gray-600">No spells configured yet.</p>
              <p className="text-xs text-gray-400">Use the form on the left to create Spell 1.</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {spells.map((sp) => {
                const isActive = sp.is_active === 1 || sp.is_active === true;
                return (
                  <div
                    key={sp.id}
                    className={`p-4 md:p-5 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isActive
                        ? 'bg-[#F4F3FF] border-[#6D5DFC] shadow-sm ring-1 ring-[#6D5DFC]/30'
                        : 'bg-white border-[#E7E7E7] hover:border-gray-300'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <h3 className="font-extrabold text-base text-[#111827]">{sp.spell_name}</h3>
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#12B76A]/10 text-[#12B76A] text-xs font-extrabold border border-[#12B76A]/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#12B76A] animate-ping" />
                            ACTIVE SPELL
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold">
                            INACTIVE
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#4B5563] pt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-[#6D5DFC]" />
                        <span>{formatDateDisplay(sp.start_date)}</span>
                        <span className="text-gray-400">→</span>
                        <span>{formatDateDisplay(sp.end_date)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                      {!isActive && (
                        <button
                          onClick={() => handleActivate(sp.id, sp.spell_name)}
                          disabled={isSubmitting}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-all shadow-sm flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Set Active Spell
                        </button>
                      )}

                      <button
                        onClick={() => handleEditClick(sp)}
                        className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:text-[#6D5DFC] hover:bg-white hover:border-[#6D5DFC]/40 transition-all"
                        title="Edit Spell"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDuplicate(sp)}
                        className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:text-[#6D5DFC] hover:bg-white hover:border-[#6D5DFC]/40 transition-all"
                        title="Duplicate Spell"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setDeletingSpell(sp)}
                        className="p-2 rounded-xl border border-rose-100 text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition-all"
                        title="Delete Spell"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Safety Delete Confirmation Modal */}
      {deletingSpell && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-black text-gray-900">Delete Spell Configuration?</h3>
              <p className="text-xs text-gray-500 mt-1">
                Are you sure you want to remove <span className="font-bold text-gray-800">{deletingSpell.spell_name}</span>?
              </p>
            </div>

            {/* Non-destructive safety banner */}
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                SAFETY RULE VERIFIED
              </div>
              <p className="text-[11px] text-emerald-700">
                This will <strong>NOT</strong> delete any student records, subject assignments, or logged attendance data. Only the spell configuration parameters are removed.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setDeletingSpell(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isSubmitting}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpellManagementPage;
