import { useState } from 'react';
import { createJob } from '../../api/jobs';

export default function AddJobModal({ onClose, onJobAdded }) {
  const [form, setForm] = useState({
    company: '', role: '', status: 'applied', notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.company || !form.role) return setError('Company and role are required');
    setLoading(true);
    try {
      const newJob = await createJob(form);
      onJobAdded(newJob);
      onClose();
    } catch(err) {
      console.log('full error:',err.response?.data);
      setError(err.response?.data?.error||'Failed to create job');
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
        width: '100%', maxWidth: 480, boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0 }}>Add new job</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          {[
            { label: 'Company', name: 'company', type: 'text' },
            { label: 'Role', name: 'role', type: 'text' },
            { label: 'Notes', name: 'notes', type: 'text' },
          ].map(({ label, name, type }) => (
            <div key={name} style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>{label}</label>
              <input
                name={name} type={type} value={form[name]}
                onChange={handleChange}
                style={{ width: '100%', padding: 8, boxSizing: 'border-box', borderRadius: 6, border: '1px solid #ddd' }}
              />
            </div>
          ))}
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
            style={{ width: '100%', padding: 10, borderRadius: 6, background: '#2563eb', color: 'white', border: 'none', cursor: 'pointer' }}>
            {loading ? 'Adding...' : 'Add job'}
          </button>
        </form>
      </div>
    </div>
  );
}