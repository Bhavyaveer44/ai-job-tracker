import { useState } from 'react';
import { deleteJob, updateJob } from '../../api/jobs';
import { getMatchScore, generateCoverLetter, getInterviewPrep } from '../../api/ai';

const STATUS_COLORS = {
  applied:   { bg: '#dbeafe', text: '#1e40af' },
  interview: { bg: '#fef9c3', text: '#854d0e' },
  offer:     { bg: '#dcfce7', text: '#166534' },
  rejected:  { bg: '#fee2e2', text: '#991b1b' },
};

export default function JobCard({ job, onDelete, onUpdate }) {
  const [showEdit, setShowEdit] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [form, setForm] = useState({
    company: job.company,
    role: job.role,
    notes: job.notes || '',
    salary_range: job.salary_range || '',
  });
  const [saving, setSaving] = useState(false);

  // match score state
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchReason, setMatchReason] = useState('');

  // cover letter state
  const [coverLetter, setCoverLetter] = useState('');
  const [clLoading, setClLoading] = useState(false);
  const [clError, setClError] = useState('');
  const [copied, setCopied] = useState(false);

  //interview prep state
  const [prepQuestions, setPrepQuestions] = useState([]);
  const [prepLoading, setPrepLoading] = useState(false);
  const [prepError, setPrepError] = useState('');
  const [expandedQ, setExpandedQ] = useState(null);

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

  const handleGenerateCoverLetter = async () => {
    if (!job.job_description) {
      setClError('No job description saved — add this job via the AI parser first so it has a full JD.');
      return;
    }
    setClLoading(true);
    setClError('');
    setCoverLetter('');
    const userSkillsRaw = localStorage.getItem('userSkills') || '';
    const userSkills = userSkillsRaw ? userSkillsRaw.split(',').map(s => s.trim()) : [];
    const userName = localStorage.getItem('userName') || '';
    try {
      const result = await generateCoverLetter({
        jobDescription: job.job_description,
        jobRole: job.role,
        jobCompany: job.company,
        userSkills,
        userName,
      });
      setCoverLetter(result.coverLetter);
    } catch (err) {
      setClError('Generation failed — try again');
      console.error(err);
    }
    setClLoading(false);
  };

  const handleInterviewPrep = async () => {
    if (!job.job_description) {
      setPrepError('No job description saved — add this job via the AI parser first.');
      return;
    }
    setPrepLoading(true);
    setPrepError('');
    setPrepQuestions([]);
    try {
      const result = await getInterviewPrep({
        jobDescription: job.job_description,
        jobRole: job.role,
        jobCompany: job.company,
        seed: Date.now(), // Add timestamp to ensure fresh questions on regenerate
      });
      setPrepQuestions(result.questions || []);
    } catch (err) {
      setPrepError('Failed to generate questions — try again');
      console.error(err);
    }
    setPrepLoading(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(coverLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabStyle = (tab) => ({
    padding: '7px 16px',
    fontSize: 13,
    fontWeight: activeTab === tab ? 500 : 400,
    background: activeTab === tab ? 'white' : 'transparent',
    border: activeTab === tab ? '0.5px solid #e5e7eb' : '0.5px solid transparent',
    borderRadius: 6,
    cursor: 'pointer',
    color: activeTab === tab ? '#111' : '#6b7280',
  });

  return (
    <>
      <div
        onClick={() => setShowEdit(true)}
        style={{
          background: '#1e1e1e',
          borderRadius: 8,
          padding: 14,
          border: '1px solid #3d3d3d',
          marginBottom: 8,
          cursor: 'pointer',
          transition: 'border-color 0.15s'
        }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{flex: 1, textAlign: 'left'}}>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: 'white' }}>{job.role}</p>
            <p style={{ margin: '2px 0 8px', fontSize: 13, color: '#9ca3af' }}>{job.company}</p>
          </div>
          <button onClick={handleDelete}
          style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>
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
            <span style={{ fontSize: 12, color: '#65ce65' }}>Match: {job.match_score}%</span>
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
            width: '100%', maxWidth: 520, boxSizing: 'border-box',
            maxHeight: '90vh', overflowY: 'auto'
          }}>

            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16 }}>{job.role}</h3>
                <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>{job.company}</p>
              </div>
              <button onClick={() => setShowEdit(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9ca3af' }}>×</button>
            </div>

            {/* Tabs */}
            <div style={{
              display: 'flex', gap: 4, background: '#f9fafb',
              padding: 4, borderRadius: 8, marginBottom: 20,
              flexWrap: 'wrap'
            }}>
              {['details', 'match score', 'cover letter', ...(job.status === 'interview' ? ['interview prep'] : [])].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={tabStyle(tab)}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Tab: Details */}
            {activeTab === 'details' && (
              <form onSubmit={handleSave}>
                {[
                  { label: 'Company', name: 'company' },
                  { label: 'Role', name: 'role' },
                  { label: 'Salary range', name: 'salary_range' },
                  { label: 'Notes', name: 'notes' },
                ].map(({ label, name }) => (
                  <div key={name} style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#374151' }}>{label}</label>
                    <input
                      value={form[name]}
                      onChange={e => setForm({ ...form, [name]: e.target.value })}
                      style={{
                        width: '100%', padding: 8, boxSizing: 'border-box',
                        borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 13
                      }}
                    />
                  </div>
                ))}
                {job.skills_required?.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: '#374151' }}>Required skills</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {job.skills_required.map(skill => (
                        <span key={skill} style={{
                          fontSize: 12, padding: '3px 10px', borderRadius: 20,
                          background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe'
                        }}>{skill}</span>
                      ))}
                    </div>
                  </div>
                )}
                <button type="submit" disabled={saving}
                  style={{
                    width: '100%', padding: 10, borderRadius: 6, marginTop: 4,
                    background: '#2563eb', color: 'white', border: 'none',
                    cursor: 'pointer', fontSize: 14
                  }}>
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </form>
            )}

            {/* Tab: Match score */}
            {activeTab === 'match score' && (
              <div>
                <div style={{
                  background: '#f9fafb', borderRadius: 8, padding: 16, marginBottom: 16
                }}>
                  {job.match_score ? (
                    <>
                      <p style={{ margin: '0 0 4px', fontSize: 13, color: '#6b7280' }}>Current score</p>
                      <p style={{ margin: '0 0 8px', fontSize: 32, fontWeight: 700, color: job.match_score >= 70 ? '#16a34a' : job.match_score >= 40 ? '#d97706' : '#dc2626' }}>
                        {job.match_score}%
                      </p>
                      {matchReason && <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>{matchReason}</p>}
                    </>
                  ) : (
                    <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>No score calculated yet</p>
                  )}
                </div>
                <button
                  onClick={handleMatch}
                  disabled={matchLoading}
                  style={{
                    width: '100%', padding: 10, borderRadius: 6,
                    background: 'white', border: '1px solid #e5e7eb',
                    cursor: 'pointer', fontSize: 14
                  }}>
                  {matchLoading ? 'Calculating...' : job.match_score ? 'Recalculate score' : 'Calculate match score'}
                </button>
              </div>
            )}

            {/* Tab: Cover letter */}
            {activeTab === 'cover letter' && (
              <div>
                {!coverLetter ? (
                  <>
                    <p style={{ margin: '0 0 12px', fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
                      AI will write a tailored cover letter using the job description and your saved skills.
                      Your name and skills are read from your browser — enter them once below.
                    </p>

                    {/* Quick profile inputs stored in localStorage */}
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#374151' }}>Your name</label>
                      <input
                        defaultValue={localStorage.getItem('userName') || ''}
                        onChange={e => localStorage.setItem('userName', e.target.value)}
                        placeholder="e.g. John Doe"
                        style={{
                          width: '100%', padding: 8, boxSizing: 'border-box',
                          borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 13
                        }}
                      />
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#374151' }}>Your skills (comma separated)</label>
                      <input
                        defaultValue={localStorage.getItem('userSkills') || ''}
                        onChange={e => localStorage.setItem('userSkills', e.target.value)}
                        placeholder="e.g. React, Node.js, PostgreSQL, Python"
                        style={{
                          width: '100%', padding: 8, boxSizing: 'border-box',
                          borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 13
                        }}
                      />
                    </div>

                    {clError && (
                      <p style={{ fontSize: 13, color: '#dc2626', marginBottom: 12 }}>{clError}</p>
                    )}

                    <button
                      onClick={handleGenerateCoverLetter}
                      disabled={clLoading}
                      style={{
                        width: '100%', padding: 10, borderRadius: 6,
                        background: '#2563eb', color: 'white',
                        border: 'none', cursor: 'pointer', fontSize: 14
                      }}>
                      {clLoading ? 'Writing cover letter...' : 'Generate cover letter'}
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{
                      background: '#f9fafb', borderRadius: 8, padding: 16,
                      marginBottom: 12, fontSize: 13, lineHeight: 1.8,
                      color: '#374151', whiteSpace: 'pre-wrap',
                      maxHeight: 320, overflowY: 'auto',
                      border: '1px solid #e5e7eb'
                    }}>
                      {coverLetter}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={handleCopy}
                        style={{
                          flex: 1, padding: 9, borderRadius: 6,
                          background: copied ? '#16a34a' : '#2563eb',
                          color: 'white', border: 'none', cursor: 'pointer', fontSize: 13
                        }}>
                        {copied ? 'Copied!' : 'Copy to clipboard'}
                      </button>
                      <button
                        onClick={() => { setCoverLetter(''); setClError(''); }}
                        style={{
                          padding: '9px 14px', borderRadius: 6,
                          background: 'white', border: '1px solid #e5e7eb',
                          cursor: 'pointer', fontSize: 13, color: '#6b7280'
                        }}>
                        Regenerate
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Tab: Interview prep */}
            {activeTab === 'interview prep' && (
              <div>
                {prepQuestions.length === 0 ? (
                  <>
                    <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
                      Get 8 tailored interview questions based on this job description — with specific tips on how to answer each one.
                    </p>
                    {prepError && (
                      <p style={{ fontSize: 13, color: '#dc2626', marginBottom: 12 }}>{prepError}</p>
                    )}
                    <button
                      onClick={handleInterviewPrep}
                      disabled={prepLoading}
                      style={{
                        width: '100%', padding: 10, borderRadius: 6,
                        background: '#2563eb', color: 'white',
                        border: 'none', cursor: 'pointer', fontSize: 14
                      }}>
                      {prepLoading ? 'Generating questions...' : 'Generate interview questions'}
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{prepQuestions.length} questions generated</p>
                      <button
                        onClick={() => setPrepQuestions([])}
                        style={{
                          fontSize: 12, padding: '4px 10px', borderRadius: 6,
                          background: 'white', border: '1px solid #e5e7eb',
                          cursor: 'pointer', color: '#6b7280'
                        }}>
                        Regenerate
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {prepQuestions.map((q, i) => {
                        const TYPE_COLORS = {
                          technical:    { bg: '#eff6ff', text: '#1e40af' },
                          behavioral:   { bg: '#fef9c3', text: '#854d0e' },
                          situational:  { bg: '#f3e8ff', text: '#6b21a8' },
                          'culture fit':{ bg: '#dcfce7', text: '#166534' },
                          'role-specific': { bg: '#ffedd5', text: '#9a3412' },
                        };
                        const tc = TYPE_COLORS[q.type] || { bg: '#f1f5f9', text: '#475569' };
                        const isOpen = expandedQ === i;

                        return (
                          <div key={i} style={{
                            border: '1px solid #e5e7eb', borderRadius: 8,
                            overflow: 'hidden', background: 'white'
                          }}>
                            <button
                              onClick={() => setExpandedQ(isOpen ? null : i)}
                              style={{
                                width: '100%', padding: '10px 12px', background: 'none',
                                border: 'none', cursor: 'pointer', textAlign: 'left',
                                display: 'flex', alignItems: 'flex-start', gap: 10
                              }}>
                              <span style={{
                                fontSize: 11, fontWeight: 500, padding: '2px 8px',
                                borderRadius: 20, background: tc.bg, color: tc.text,
                                whiteSpace: 'nowrap', marginTop: 1, flexShrink: 0
                              }}>
                                {q.type}
                              </span>
                              <span style={{ fontSize: 13, color: '#111', flex: 1, textAlign: 'left', lineHeight: 1.5 }}>
                                {q.question}
                              </span>
                              <span style={{ fontSize: 12, color: '#9ca3af', flexShrink: 0, marginTop: 1 }}>
                                {isOpen ? '▲' : '▼'}
                              </span>
                            </button>

                            {isOpen && (
                              <div style={{
                                padding: '0 12px 12px 12px',
                                borderTop: '1px solid #f3f4f6'
                              }}>
                                <p style={{ margin: '10px 0 4px', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  Answer tip
                                </p>
                                <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
                                  {q.tip}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}