import { useState } from 'react';
import { createJob } from '../../api/jobs';
import { parseJobDescription } from '../../api/ai';

export default function AddJobModal({ onClose, onJobAdded }) {
  const [form, setForm] = useState({
    company: '', role: '', status: 'applied',
    notes: '', salary_range: '', job_description: '', skills_required: []
  });
  const [jdText, setJdText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [parsed, setParsed] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleParse = async () => {
    if (!jdText.trim()) return setError('Paste a job description first');
    setParsing(true);
    setError('');
    try {
      const result = await parseJobDescription(jdText);
      setForm(prev => ({
        ...prev,
        company: result.company || '',
        role: result.role || '',
        salary_range: result.salary_range || '',
        job_description: jdText,
        skills_required: result.skills_required || [],
      }));
      setParsed(true);
    } catch {
      setError('AI parsing failed — fill in manually');
    }
    setParsing(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.company || !form.role) return setError('Company and role are required');
    setLoading(true);
    try {
      const newJob = await createJob(form);
      onJobAdded(newJob);
      onClose();
    } catch (err) {
      console.log('Create error:', err.response?.data);
      setError('Failed to create job');
    }
    setLoading(false);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
    }}>
      <div style={{
        background: 'white', borderRadius: 12, padding: 24,
        width: '100%', maxWidth: 520, boxSizing: 'border-box',
        maxHeight: '90vh', overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0 }}>Add new job</h3>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none',color: '#9ca3af', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>

        {/* AI Parser section */}
        <div style={{
          background: '#eff6ff', borderRadius: 8, padding: 14, marginBottom: 20,
          border: '1px solid #bfdbfe'
        }}>
          <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: '#1e40af' }}>
            AI auto-fill — paste a job description
          </p>
          <textarea
            value={jdText}
            onChange={e => setJdText(e.target.value)}
            placeholder="Paste the full job description here and let AI fill the form..."
            rows={4}
            style={{
              width: '100%', padding: 8, boxSizing: 'border-box',
              borderRadius: 6, border: '1px solid #bfdbfe',
              fontSize: 13, resize: 'vertical'
            }}
          />
          <button
            onClick={handleParse}
            disabled={parsing}
            style={{
              marginTop: 8, padding: '7px 16px', borderRadius: 6,
              background: '#2563eb', color: 'white', border: 'none',
              cursor: 'pointer', fontSize: 13
            }}>
            {parsing ? 'Parsing...' : 'Auto-fill with AI'}
          </button>
          {parsed && (
            <span style={{ marginLeft: 12, fontSize: 12, color: '#16a34a' }}>
              Fields filled — review below
            </span>
          )}
        </div>

        {/* Manual form */}
        <form onSubmit={handleSubmit}>
          {[
            { label: 'Company', name: 'company' },
            { label: 'Role', name: 'role' },
            { label: 'Salary range', name: 'salary_range' },
            { label: 'Notes', name: 'notes' },
          ].map(({ label, name }) => (
            <div key={name} style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>{label}</label>
              <input
                name={name}
                value={form[name]}
                onChange={handleChange}
                style={{
                  width: '100%', padding: 8, boxSizing: 'border-box',
                  borderRadius: 6, border: '1px solid #ddd'
                }}
              />
            </div>
          ))}

          {form.skills_required.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>
                Skills extracted by AI
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {form.skills_required.map(skill => (
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

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Status</label>
            <select name="status" value={form.status} onChange={handleChange}
              style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd' }}>
              <option value="applied">Applied</option>
              <option value="interview">Interview</option>
              <option value="offer">Offer</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {error && <p style={{ color: 'red', fontSize: 13 }}>{error}</p>}

          <button type="submit" disabled={loading}
            style={{
              width: '100%', padding: 10, borderRadius: 6,
              background: '#2563eb', color: 'white', border: 'none', cursor: 'pointer'
            }}>
            {loading ? 'Adding...' : 'Add job'}
          </button>
        </form>
      </div>
    </div>
  );
}