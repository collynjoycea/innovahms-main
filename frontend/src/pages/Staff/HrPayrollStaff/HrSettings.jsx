import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Bell, Building2, Calendar, Percent, Save } from 'lucide-react';
import useHrOverview from '../../../hooks/useHrOverview';
import useStaffSession from '../../../hooks/useStaffSession';
import { HrErrorState, HrLoadingState, HrPageHeader, HrSection, getHrTheme } from './hrShared';

const HrSettings = () => {
  const [isDarkMode] = useOutletContext();
  const theme = getHrTheme(isDarkMode);
  const { qs } = useStaffSession();
  const { data, loading, error, refresh } = useHrOverview();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (data?.settings) {
      setForm(data.settings);
    }
  }, [data]);

  if (loading && !data) {
    return <HrLoadingState theme={theme} label="Loading HR settings..." />;
  }

  const updateField = (section, key, value) => {
    setForm((current) => ({
      ...current,
      [section]: {
        ...(current?.[section] || {}),
        [key]: value,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const response = await fetch(`/api/hr/settings${qs}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || 'Failed to save HR settings.');
      }
      setForm(body.settings || form);
      refresh();
    } catch (err) {
      setSaveError(err.message || 'Failed to save HR settings.');
    } finally {
      setSaving(false);
    }
  };

  const SectionTitle = ({ icon: Icon, title }) => (
    <div className="mb-5 flex items-center gap-3">
      <div className="rounded-xl border border-[#b3903c]/20 bg-[#b3903c]/10 p-2 text-[#b3903c]">
        <Icon size={18} />
      </div>
      <h2 className={`text-sm font-black uppercase tracking-[0.2em] ${theme.textMain}`}>{title}</h2>
    </div>
  );

  const Field = ({ label, value, onChange, type = 'text' }) => (
    <div className="space-y-2">
      <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textSub}`}>{label}</label>
      <input
        type={type}
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full rounded-xl border px-4 py-3 text-[12px] font-bold outline-none ${theme.input}`}
      />
    </div>
  );

  const Toggle = ({ label, value, onChange }) => (
    <div className="flex items-center justify-between py-2">
      <span className={`text-[11px] font-bold ${theme.textMain}`}>{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative h-6 w-11 rounded-full transition-colors ${value ? 'bg-[#b3903c]' : isDarkMode ? 'bg-zinc-800' : 'bg-zinc-300'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );

  return (
    <div className={`min-h-screen space-y-8 p-4 ${theme.container}`}>
      <HrPageHeader
        theme={theme}
        eyebrow="System configuration"
        title="HR"
        accent="Settings"
        actions={
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !form}
            className="flex items-center gap-2 rounded-xl bg-[#b3903c] px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-60"
          >
            <Save size={14} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        }
      />

      {error ? <HrErrorState message={error} /> : null}
      {saveError ? <HrErrorState message={saveError} /> : null}

      {form ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <HrSection theme={theme}>
            <SectionTitle icon={Percent} title="Payroll Configuration" />
            <div className="space-y-4">
              <Field label="Pay Period" value={form.payroll?.payPeriod} onChange={(value) => updateField('payroll', 'payPeriod', value)} />
              <Field label="Pay Day" value={form.payroll?.payDay} onChange={(value) => updateField('payroll', 'payDay', value)} />
              <Field label="Overtime Rate" value={form.payroll?.overtimeRate} onChange={(value) => updateField('payroll', 'overtimeRate', value)} />
              <Field label="Night Differential" value={form.payroll?.nightDifferential} onChange={(value) => updateField('payroll', 'nightDifferential', value)} />
            </div>
          </HrSection>

          <HrSection theme={theme}>
            <SectionTitle icon={Calendar} title="Leave Policy" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Sick Leave" value={form.leave?.sick} onChange={(value) => updateField('leave', 'sick', value)} />
              <Field label="Vacation Leave" value={form.leave?.vacation} onChange={(value) => updateField('leave', 'vacation', value)} />
              <Field label="Emergency Leave" value={form.leave?.emergency} onChange={(value) => updateField('leave', 'emergency', value)} />
              <Field label="Maternity Leave" value={form.leave?.maternity} onChange={(value) => updateField('leave', 'maternity', value)} />
              <Field label="Paternity Leave" value={form.leave?.paternity} onChange={(value) => updateField('leave', 'paternity', value)} />
            </div>
          </HrSection>

          <HrSection theme={theme}>
            <SectionTitle icon={Bell} title="Notifications" />
            <div className="space-y-3">
              <Toggle label="Payroll deadline reminder" value={!!form.notifications?.deadlineReminder} onChange={(value) => updateField('notifications', 'deadlineReminder', value)} />
              <Toggle label="Email payslips on pay day" value={!!form.notifications?.emailPayslips} onChange={(value) => updateField('notifications', 'emailPayslips', value)} />
              <Toggle label="Alert on repeated absences" value={!!form.notifications?.absenceAlert} onChange={(value) => updateField('notifications', 'absenceAlert', value)} />
              <Toggle label="Notify manager for leave approval" value={!!form.notifications?.leaveApproval} onChange={(value) => updateField('notifications', 'leaveApproval', value)} />
              <Toggle label="Monthly HR summary" value={!!form.notifications?.monthlySummary} onChange={(value) => updateField('notifications', 'monthlySummary', value)} />
            </div>
          </HrSection>

          <HrSection theme={theme}>
            <SectionTitle icon={Building2} title="Hotel Information" />
            <div className="space-y-4">
              <Field label="Hotel Name" value={form.hotel?.hotelName} onChange={(value) => updateField('hotel', 'hotelName', value)} />
              <Field label="Hotel Code" value={form.hotel?.hotelCode} onChange={(value) => updateField('hotel', 'hotelCode', value)} />
              <Field label="HR Manager" value={form.hotel?.hrManager} onChange={(value) => updateField('hotel', 'hrManager', value)} />
              <Field label="HR Email" value={form.hotel?.hrEmail} onChange={(value) => updateField('hotel', 'hrEmail', value)} type="email" />
            </div>
          </HrSection>
        </div>
      ) : null}
    </div>
  );
};

export default HrSettings;
