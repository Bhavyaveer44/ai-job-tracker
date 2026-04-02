import { useState } from 'react';
import { deleteJob, updateJob } from '../../api/jobs';
import { getMatchScore } from '../../api/ai';

const STATUS_COLORS = {
  applied:   { bg: '#dbeafe', text: '#1e40af' },
  interview: { bg: '#fef9c3', text: '#854d0e' },
  offer:     { bg: '#dcfce7', text: '#166534' },
  rejected:  { bg: '#fee2e2', text: '#991b1b' },
};

export default function JobCard({ job, onDelete, onUpdate }) {
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({
    company: job.company,
    role: job.role,
    notes: job.notes || '',
    salary_range: job.salary_range || '',
  });
  const [saving, setSaving] = useState(false);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchReason, setMatchReason] = useState('');
  const colors = STATUS_COLORS[job.status] || STATUS_COLORS.applied;

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this job?')) return;
    await deleteJob(job.id);
    onDelete(job.id);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateJob(job.id, form);
      onUpdate(updated);
      setShowEdit(false);
    } catch (err) {
      console.log('Update error:', err.response?.data);
      alert('Save failed: ' + (err.response?.data?.error || err.message));
    }
    setSaving(false);
  };

  const handleMatch = async () => {
    const userSkillsRaw = prompt('Enter your skills separated by commas:\n(e.g. React, Node.js, PostgreSQL)');
    if (!userSkillsRaw) return;
    const userSkills = userSkillsRaw.split(',').map(s => s.trim());
    const jobSkills = job.skills_required || [];
    if (jobSkills.length === 0) return alert('No skills on this job — add it via AI parser first');

    setMatchLoading(true);
    try {
      const result = await getMatchScore(userSkills, jobSkills, job.id);
      onUpdate({ ...job, match_score: result.score });
      setMatchReason(result.reason);
    } catch {
      alert('Match score failed');
    }
    setMatchLoading(false);
  };

  return (
    <>
      <div
        onClick={() => setShowEdit(true)}
        style={{
          background: 'white', borderRadius: 8, padding: 14,
          border: '1px solid #e5e7eb', marginBottom: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)', cursor: 'pointer'
        }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{job.role}</p>
            <p style={{ margin: '2px 0 8px', fontSize: 13, color: '#6b7280' }}>{job.company}</p>
          </div>
          <button onClick={handleDelete}
            style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>
            ×
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 20,
            background: colors.bg, color: colors.text
          }}>
            {job.status}
          </span>
          {job.match_score && (
            <span style={{ fontSize: 12, color: '#6b7280' }}>Match: {job.match_score}%</span>
          )}
        </div>
      </div>

      {showEdit && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div style={{
            background: 'white', borderRadius: 12, padding: 24,
            width: '100%', maxWidth: 480, boxSizing: 'border-box',
            maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>Edit job</h3>
              <button onClick={() => setShowEdit(false)}
                style={{ background: 'none', border: 'none',color: '#9ca3af', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>

            <form onSubmit={handleSave}>
              {[
                { label: 'Company', name: 'company' },
                { label: 'Role', name: 'role' },
                { label: 'Salary range', name: 'salary_range' },
                { label: 'Notes', name: 'notes' },
              ].map(({ label, name }) => (
                <div key={name} style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>{label}</label>
                  <input
                    value={form[name]}
                    onChange={e => setForm({ ...form, [name]: e.target.value })}
                    style={{
                      width: '100%', padding: 8, boxSizing: 'border-box',
                      borderRadius: 6, border: '1px solid #ddd'
                    }}
                  />
                </div>
              ))}

              {job.skills_required?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>
                    Required skills
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {job.skills_required.map(skill => (
                      <span key={skill} style={{
                        fontSize: 12, padding: '3px 10px', borderRadius: 20,
                        background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe'
                      }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 16, padding: 12, background: '#f9fafb', borderRadius: 8 }}>
                <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600 }}>Resume match score</p>
                {job.match_score ? (
                  <p style={{ margin: '0 0 6px', fontSize: 13 }}>
                    Current score: <strong>{job.match_score}%</strong>
                  </p>
                ) : (
                  <p style={{ margin: '0 0 6px', fontSize: 12, color: '#6b7280' }}>No score yet</p>
                )}
                {matchReason && (
                  <p style={{ margin: '0 0 8px', fontSize: 12, color: '#6b7280' }}>{matchReason}</p>
                )}
                <button
                  type="button"
                  onClick={handleMatch}
                  disabled={matchLoading}
                  style={{
                    padding: '6px 14px', borderRadius: 6, fontSize: 13,
                    background: 'white', border: '1px solid #d1d5db', cursor: 'pointer'
                  }}>
                  {matchLoading ? 'Calculating...' : 'Calculate match score'}
                </button>
              </div>

              <button type="submit" disabled={saving}
                style={{
                  width: '100%', padding: 10, borderRadius: 6,
                  background: '#2563eb', color: 'white', border: 'none', cursor: 'pointer'
                }}>
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}