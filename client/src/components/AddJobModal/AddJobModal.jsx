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
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100
    }}>
      <div style={{
        background: 'rgba(15, 15, 26, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: 16,
        padding: 28,
        width: '100%',
        maxWidth: 540,
        boxSizing: 'border-box',
        maxHeight: '90vh',
        overflowY: 'auto',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 24
        }}>
          <h3 style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 600,
            color: '#fff'
          }}>Add new job</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.4)',
              fontSize: 24,
              cursor: 'pointer',
              padding: 4,
              borderRadius: 6,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.color = 'rgba(255, 255, 255, 0.8)';
              e.target.style.background = 'rgba(255, 255, 255, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.target.style.color = 'rgba(255, 255, 255, 0.4)';
              e.target.style.background = 'transparent';
            }}
          >×</button>
        </div>

        {/* AI Parser section */}
        <div style={{
          background: 'rgba(99, 102, 241, 0.1)',
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
          border: '1px solid rgba(99, 102, 241, 0.2)'
        }}>
          <p style={{
            margin: '0 0 10px',
            fontSize: 13,
            fontWeight: 600,
            color: '#a5b4fc'
          }}>
            AI auto-fill — paste a job description
          </p>
          <textarea
            value={jdText}
            onChange={e => setJdText(e.target.value)}
            placeholder="Paste the full job description here and let AI fill the form..."
            rows={4}
            style={{
              width: '100%',
              padding: 12,
              boxSizing: 'border-box',
              borderRadius: 8,
              border: '1px solid rgba(99, 102, 241, 0.3)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#fff',
              fontSize: 13,
              resize: 'vertical',
              outline: 'none',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'rgba(99, 102, 241, 0.5)';
              e.target.style.background = 'rgba(255, 255, 255, 0.08)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(99, 102, 241, 0.3)';
              e.target.style.background = 'rgba(255, 255, 255, 0.05)';
            }}
          />
          <button
            onClick={handleParse}
            disabled={parsing}
            style={{
              marginTop: 12,
              padding: '8px 18px',
              borderRadius: 8,
              background: parsing
                ? 'rgba(99, 102, 241, 0.5)'
                : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: '#fff',
              border: 'none',
              cursor: parsing ? 'not-allowed' : 'pointer',
              fontSize: 13,
              fontWeight: 600,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: parsing
                ? 'none'
                : '0 4px 20px rgba(99, 102, 241, 0.3)'
            }}
          >
            {parsing ? 'Parsing...' : 'Auto-fill with AI'}
          </button>
          {parsed && (
            <span style={{
              marginLeft: 12,
              fontSize: 12,
              color: '#a78bfa',
              fontWeight: 500
            }}>
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
            <div key={name} style={{ marginBottom: 16 }}>
              <label style={{
                display: 'block',
                fontSize: 13,
                marginBottom: 6,
                color: 'rgba(255, 255, 255, 0.7)',
                fontWeight: 500
              }}>{label}</label>
              <input
                name={name}
                value={form[name]}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: 10,
                  boxSizing: 'border-box',
                  borderRadius: 8,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                  fontSize: 14,
                  outline: 'none',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(99, 102, 241, 0.5)';
                  e.target.style.background = 'rgba(255, 255, 255, 0.08)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                }}
              />
            </div>
          ))}

          {form.skills_required.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: 'block',
                fontSize: 13,
                marginBottom: 8,
                color: 'rgba(255, 255, 255, 0.7)',
                fontWeight: 500
              }}>
                Skills extracted by AI
              </label>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6
              }}>
                {form.skills_required.map(skill => (
                  <span key={skill} style={{
                    fontSize: 12,
                    padding: '4px 12px',
                    borderRadius: 20,
                    background: 'rgba(99, 102, 241, 0.15)',
                    color: '#a5b4fc',
                    border: '1px solid rgba(99, 102, 241, 0.3)'
                  }}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block',
              fontSize: 13,
              marginBottom: 6,
              color: 'rgba(255, 255, 255, 0.7)',
              fontWeight: 500
            }}>Status</label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 8,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#fff',
                fontSize: 14,
                outline: 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(99, 102, 241, 0.5)';
                e.target.style.background = 'rgba(255, 255, 255, 0.08)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.target.style.background = 'rgba(255, 255, 255, 0.05)';
              }}
            >
              <option value="applied">Applied</option>
              <option value="interview">Interview</option>
              <option value="offer">Offer</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {error && <p style={{
            color: '#fca5a5',
            fontSize: 13,
            marginBottom: 16,
            padding: '10px 14px',
            borderRadius: 8,
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)'
          }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px 20px',
              borderRadius: 10,
              background: loading
                ? 'rgba(99, 102, 241, 0.5)'
                : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: '#fff',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontWeight: 600,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: loading
                ? 'none'
                : '0 4px 20px rgba(99, 102, 241, 0.3)'
            }}
          >
            {loading ? 'Adding...' : 'Add job'}
          </button>
        </form>
      </div>
    </div>
  );
}