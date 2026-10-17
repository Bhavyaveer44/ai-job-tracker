import { useState } from 'react';
import { createPortal } from 'react-dom';
import { deleteJob, updateJob } from '../../api/jobs';
import { getMatchScore, generateCoverLetter, getInterviewPrep, scoreResume } from '../../api/ai';

const STATUS_COLORS = {
  applied:   { bg: 'rgba(99, 102, 241, 0.15)', text: '#a5b4fc', border: 'rgba(99, 102, 241, 0.3)' },
  interview: { bg: 'rgba(168, 85, 247, 0.15)', text: '#c4b5fd', border: 'rgba(168, 85, 247, 0.3)' },
  offer:     { bg: 'rgba(167, 139, 250, 0.15)', text: '#a78bfa', border: 'rgba(167, 139, 250, 0.3)' },
  rejected:  { bg: 'rgba(196, 181, 253, 0.15)', text: '#c4b5fd', border: 'rgba(196, 181, 253, 0.3)' },
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

  // ATS scanner state
  const [atsResult, setAtsResult] = useState(null);
  const [atsLoading, setAtsLoading] = useState(false);
  const [atsError, setAtsError] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);

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

  const handleResumeScore = async () => {
    if (!resumeFile) return setAtsError('Please upload your resume PDF first');
    if (!job.job_description) return setAtsError('This job has no description — add it via AI parser first');
    setAtsLoading(true);
    setAtsError('');
    setAtsResult(null);
    try {
      const result = await scoreResume(resumeFile, job.job_description, job.role, job.company);
      setAtsResult(result);
    } catch (err) {
      setAtsError(err.response?.data?.error || 'Scoring failed — try again');
    }
    setAtsLoading(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(coverLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabStyle = (tab) => ({
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: activeTab === tab ? 600 : 500,
    background: activeTab === tab
      ? 'rgba(99, 102, 241, 0.15)'
      : 'transparent',
    border: activeTab === tab
      ? '1px solid rgba(99, 102, 241, 0.3)'
      : '1px solid transparent',
    borderRadius: 8,
    cursor: 'pointer',
    color: activeTab === tab ? '#a5b4fc' : 'rgba(255, 255, 255, 0.5)',
    transition: 'all 0.2s ease'
  });

  return (
    <>
      <div
        onClick={() => setShowEdit(true)}
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(10px)',
          borderRadius: 12,
          padding: 16,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: 12,
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
        onMouseEnter={(e) => {
          e.target.style.background = 'rgba(255, 255, 255, 0.05)';
          e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)';
          e.target.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = 'rgba(255, 255, 255, 0.03)';
          e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)';
          e.target.style.transform = 'translateY(0)';
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{flex: 1, textAlign: 'left'}}>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: '#fff' }}>{job.role}</p>
            <p style={{ margin: '4px 0 10px', fontSize: 13, color: 'rgba(255, 255, 255, 0.5)' }}>{job.company}</p>
          </div>
          <button
            onClick={handleDelete}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.3)',
              cursor: 'pointer',
              fontSize: 20,
              lineHeight: 1,
              padding: 4,
              borderRadius: 6,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.color = 'rgba(196, 181, 253, 0.8)';
              e.target.style.background = 'rgba(196, 181, 253, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.target.style.color = 'rgba(255, 255, 255, 0.3)';
              e.target.style.background = 'transparent';
            }}
          >
            ×
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            padding: '4px 12px',
            borderRadius: 20,
            background: colors.bg,
            color: colors.text,
            border: `1px solid ${colors.border}`,
            textTransform: 'capitalize'
          }}>
            {job.status}
          </span>
          {job.match_score && (
            <span style={{
              fontSize: 12,
              color: '#a78bfa',
              fontWeight: 500
            }}>Match: {job.match_score}%</span>
          )}
        </div>
      </div>

      {showEdit && createPortal(
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'rgba(15, 15, 26, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: 16,
            padding: 28,
            width: '100%',
            maxWidth: 600,
            boxSizing: 'border-box',
            maxHeight: '90vh',
            overflowY: 'auto',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>

            {/* Modal header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 24
            }}>
              <div>
                <h3 style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 600,
                  color: '#fff'
                }}>{job.role}</h3>
                <p style={{
                  margin: 0,
                  fontSize: 14,
                  color: 'rgba(255, 255, 255, 0.5)'
                }}>{job.company}</p>
              </div>
              <button
                onClick={() => setShowEdit(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 24,
                  cursor: 'pointer',
                  color: 'rgba(255, 255, 255, 0.4)',
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

            {/* Tabs */}
            <div style={{
              display: 'flex',
              gap: 4,
              background: 'rgba(255, 255, 255, 0.03)',
              padding: 4,
              borderRadius: 10,
              marginBottom: 24,
              overflowX: 'auto'
            }}>
              {['details', 'match score', 'cover letter', 'ats scanner', ...(job.status === 'interview' ? ['interview prep'] : [])].map(tab => (
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
                  <div key={name} style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'rgba(255, 255, 255, 0.7)', fontWeight: 500 }}>{label}</label>
                    <input
                      value={form[name]}
                      onChange={e => setForm({ ...form, [name]: e.target.value })}
                      style={{
                        width: '100%', padding: '10px 14px', boxSizing: 'border-box',
                        borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.1)',
                        background: 'rgba(255, 255, 255, 0.05)', color: '#fff', fontSize: 14, outline: 'none'
                      }}
                    />
                  </div>
                ))}
                {job.skills_required?.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'rgba(255, 255, 255, 0.7)', fontWeight: 500 }}>Required skills</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {job.skills_required.map(skill => (
                        <span key={skill} style={{
                          fontSize: 12, padding: '4px 12px', borderRadius: 20,
                          background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.3)'
                        }}>{skill}</span>
                      ))}
                    </div>
                  </div>
                )}
                <button type="submit" disabled={saving}
                  style={{
                    width: '100%', padding: '12px 20px', borderRadius: 10, marginTop: 8,
                    background: saving ? 'rgba(99, 102, 241, 0.5)' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    color: '#fff', border: 'none',
                    cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600,
                    boxShadow: saving ? 'none' : '0 4px 20px rgba(99, 102, 241, 0.3)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}>
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </form>
            )}

            {/* Tab: Match score */}
            {activeTab === 'match score' && (
              <div>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 12, padding: 20, marginBottom: 16
                }}>
                  {job.match_score ? (
                    <>
                      <p style={{ margin: '0 0 4px', fontSize: 13, color: 'rgba(255, 255, 255, 0.5)' }}>Current score</p>
                      <p style={{ margin: '0 0 8px', fontSize: 36, fontWeight: 700, color: job.match_score >= 70 ? '#a78bfa' : job.match_score >= 40 ? '#8b5cf6' : '#c4b5fd', letterSpacing: '-1px' }}>
                        {job.match_score}%
                      </p>
                      {matchReason && <p style={{ margin: 0, fontSize: 13, color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.5 }}>{matchReason}</p>}
                    </>
                  ) : (
                    <p style={{ margin: 0, fontSize: 14, color: 'rgba(255, 255, 255, 0.4)' }}>No score calculated yet</p>
                  )}
                </div>
                <button
                  onClick={handleMatch}
                  disabled={matchLoading}
                  style={{
                    width: '100%', padding: '12px 20px', borderRadius: 10,
                    background: matchLoading ? 'rgba(99, 102, 241, 0.5)' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    border: 'none', color: '#fff',
                    cursor: matchLoading ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600,
                    boxShadow: matchLoading ? 'none' : '0 4px 20px rgba(99, 102, 241, 0.3)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
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
                    <p style={{ margin: '0 0 16px', fontSize: 13, color: 'rgba(255, 255, 255, 0.6)', lineHeight: 1.6 }}>
                      AI will write a tailored cover letter using the job description and your saved skills.
                      Your name and skills are read from your browser — enter them once below.
                    </p>

                    {/* Quick profile inputs stored in localStorage */}
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'rgba(255, 255, 255, 0.7)', fontWeight: 500 }}>Your name</label>
                      <input
                        defaultValue={localStorage.getItem('userName') || ''}
                        onChange={e => localStorage.setItem('userName', e.target.value)}
                        placeholder="e.g. John Doe"
                        style={{
                          width: '100%', padding: '10px 14px', boxSizing: 'border-box',
                          borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.1)',
                          background: 'rgba(255, 255, 255, 0.05)', color: '#fff', fontSize: 14, outline: 'none'
                        }}
                      />
                    </div>
                    <div style={{ marginBottom: 20 }}>
                      <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'rgba(255, 255, 255, 0.7)', fontWeight: 500 }}>Your skills (comma separated)</label>
                      <input
                        defaultValue={localStorage.getItem('userSkills') || ''}
                        onChange={e => localStorage.setItem('userSkills', e.target.value)}
                        placeholder="e.g. React, Node.js, PostgreSQL, Python"
                        style={{
                          width: '100%', padding: '10px 14px', boxSizing: 'border-box',
                          borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.1)',
                          background: 'rgba(255, 255, 255, 0.05)', color: '#fff', fontSize: 14, outline: 'none'
                        }}
                      />
                    </div>

                    {clError && (
                      <p style={{
                        fontSize: 13, color: '#fca5a5', marginBottom: 16,
                        padding: '10px 14px', borderRadius: 8,
                        background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)'
                      }}>{clError}</p>
                    )}

                    <button
                      onClick={handleGenerateCoverLetter}
                      disabled={clLoading}
                      style={{
                        width: '100%', padding: '12px 20px', borderRadius: 10,
                        background: clLoading ? 'rgba(99, 102, 241, 0.5)' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        color: '#fff', border: 'none', cursor: clLoading ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600,
                        boxShadow: clLoading ? 'none' : '0 4px 20px rgba(99, 102, 241, 0.3)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}>
                      {clLoading ? 'Writing cover letter...' : 'Generate cover letter'}
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{
                      background: 'rgba(0, 0, 0, 0.3)', borderRadius: 12, padding: 18,
                      marginBottom: 16, fontSize: 13, lineHeight: 1.8,
                      color: 'rgba(255, 255, 255, 0.85)', whiteSpace: 'pre-wrap',
                      maxHeight: 320, overflowY: 'auto',
                      border: '1px solid rgba(255, 255, 255, 0.08)'
                    }}>
                      {coverLetter}
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        onClick={handleCopy}
                        style={{
                          flex: 1, padding: '10px 16px', borderRadius: 8,
                          background: copied ? '#10b981' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                          color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                          boxShadow: '0 4px 15px rgba(99, 102, 241, 0.25)',
                          transition: 'all 0.2s ease'
                        }}>
                        {copied ? 'Copied!' : 'Copy to clipboard'}
                      </button>
                      <button
                        onClick={() => { setCoverLetter(''); setClError(''); }}
                        style={{
                          padding: '10px 16px', borderRadius: 8,
                          background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)',
                          cursor: 'pointer', fontSize: 13, color: 'rgba(255, 255, 255, 0.7)', fontWeight: 500,
                          transition: 'all 0.2s ease'
                        }}>
                        Regenerate
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Tab: ATS Scanner */}
            {activeTab === 'ats scanner' && (
              <div>
                {!atsResult ? (
                  <>
                    <p style={{ margin: '0 0 16px', fontSize: 13, color: 'rgba(255, 255, 255, 0.6)', lineHeight: 1.6 }}>
                      Upload your resume PDF and AI will score it against this job description, find missing keywords, and rewrite weak bullets.
                    </p>

                    {/* Drop zone */}
                    <div
                      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={e => {
                        e.preventDefault();
                        setDragOver(false);
                        const file = e.dataTransfer.files[0];
                        if (file?.type === 'application/pdf') setResumeFile(file);
                        else setAtsError('Only PDF files are accepted');
                      }}
                      onClick={() => document.getElementById(`resume-upload-${job.id}`).click()}
                      style={{
                        border: `2px dashed ${dragOver ? '#818cf8' : 'rgba(255, 255, 255, 0.15)'}`,
                        borderRadius: 12, padding: '32px 20px', textAlign: 'center',
                        cursor: 'pointer', marginBottom: 16,
                        background: dragOver ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                        transition: 'all 0.2s ease'
                      }}>
                      <input
                        id={`resume-upload-${job.id}`}
                        type="file"
                        accept=".pdf"
                        style={{ display: 'none' }}
                        onChange={e => {
                          const file = e.target.files[0];
                          if (file) { setResumeFile(file); setAtsError(''); }
                        }}
                      />
                      {resumeFile ? (
                        <div>
                          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#a78bfa' }}>
                            {resumeFile.name}
                          </p>
                          <p style={{ margin: '6px 0 0', fontSize: 12, color: 'rgba(255, 255, 255, 0.5)' }}>
                            Click to change file
                          </p>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#fff' }}>
                            Drop your resume PDF here
                          </p>
                          <p style={{ margin: '6px 0 0', fontSize: 12, color: 'rgba(255, 255, 255, 0.4)' }}>
                            or click to browse — max 5MB
                          </p>
                        </div>
                      )}
                    </div>

                    {atsError && (
                      <p style={{
                        fontSize: 13, color: '#fca5a5', marginBottom: 14,
                        padding: '10px 14px', borderRadius: 8,
                        background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)'
                      }}>{atsError}</p>
                    )}

                    <button
                      onClick={handleResumeScore}
                      disabled={atsLoading || !resumeFile}
                      style={{
                        width: '100%', padding: '12px 20px', borderRadius: 10,
                        background: atsLoading || !resumeFile
                          ? 'rgba(255, 255, 255, 0.05)'
                          : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        color: atsLoading || !resumeFile ? 'rgba(255, 255, 255, 0.3)' : '#fff',
                        border: 'none', cursor: atsLoading || !resumeFile ? 'not-allowed' : 'pointer',
                        fontSize: 14, fontWeight: 600,
                        boxShadow: atsLoading || !resumeFile ? 'none' : '0 4px 20px rgba(99, 102, 241, 0.3)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}>
                      {atsLoading ? 'Analysing resume...' : 'Score my resume'}
                    </button>
                  </>
                ) : (
                  <div>
                    {/* Score header */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 20,
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 12, padding: '18px 20px', marginBottom: 16
                    }}>
                      <div style={{ textAlign: 'center', minWidth: 70 }}>
                        <p style={{ margin: 0, fontSize: 36, fontWeight: 700, color: atsResult.ats_score >= 70 ? '#a78bfa' : atsResult.ats_score >= 50 ? '#8b5cf6' : '#c4b5fd', letterSpacing: '-1px' }}>
                          {atsResult.ats_score}
                        </p>
                        <p style={{ margin: 0, fontSize: 11, color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ATS score</p>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 500, color: '#fff' }}>{atsResult.verdict}</p>
                        <p style={{ margin: 0, fontSize: 12, color: 'rgba(255, 255, 255, 0.5)' }}>
                          {atsResult.pages} page resume · {Math.round(atsResult.resume_length / 5)} words estimated
                        </p>
                      </div>
                    </div>

                    {/* Top tip */}
                    <div style={{
                      background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.25)',
                      borderRadius: 10, padding: '12px 16px', marginBottom: 16
                    }}>
                      <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 600, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TOP TIP</p>
                      <p style={{ margin: 0, fontSize: 13, color: 'rgba(255, 255, 255, 0.85)', lineHeight: 1.5 }}>{atsResult.top_tip}</p>
                    </div>

                    {/* Keywords side by side */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                      <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 10, padding: 14 }}>
                        <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: '#6ee7b7' }}>Matched keywords</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {atsResult.matched_keywords?.map(kw => (
                            <span key={kw} style={{
                              fontSize: 11, padding: '3px 9px', borderRadius: 20,
                              background: 'rgba(52, 211, 153, 0.15)', color: '#6ee7b7',
                              border: '1px solid rgba(52, 211, 153, 0.3)'
                            }}>{kw}</span>
                          ))}
                        </div>
                      </div>
                      <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 10, padding: 14 }}>
                        <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: '#fca5a5' }}>Missing keywords</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {atsResult.missing_keywords?.map(kw => (
                            <span key={kw} style={{
                              fontSize: 11, padding: '3px 9px', borderRadius: 20,
                              background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5',
                              border: '1px solid rgba(239, 68, 68, 0.3)'
                            }}>{kw}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Gap analysis */}
                    <div style={{ marginBottom: 16 }}>
                      <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600, color: '#fff' }}>Gap analysis</p>
                      {atsResult.gap_analysis?.map((gap, i) => (
                        <div key={i} style={{
                          display: 'flex', gap: 12, alignItems: 'flex-start',
                          padding: '10px 0', borderBottom: i < atsResult.gap_analysis.length - 1 ? '1px solid rgba(255, 255, 255, 0.06)' : 'none'
                        }}>
                          <span style={{
                            fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                            background: gap.status === 'strong' ? 'rgba(52, 211, 153, 0.15)' : gap.status === 'weak' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: gap.status === 'strong' ? '#6ee7b7' : gap.status === 'weak' ? '#fcd34d' : '#fca5a5',
                            border: `1px solid ${gap.status === 'strong' ? 'rgba(52, 211, 153, 0.3)' : gap.status === 'weak' ? 'rgba(251, 191, 36, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                            whiteSpace: 'nowrap', marginTop: 2
                          }}>{gap.status}</span>
                          <div>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#fff' }}>{gap.area}</p>
                            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255, 255, 255, 0.6)', lineHeight: 1.5 }}>{gap.suggestion}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Bullet rewrites */}
                    <div style={{ marginBottom: 16 }}>
                      <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600, color: '#fff' }}>Bullet rewrites</p>
                      {atsResult.bullet_rewrites?.map((b, i) => (
                        <div key={i} style={{
                          background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: 10, padding: 14, marginBottom: 8
                        }}>
                          <p style={{ margin: '0 0 6px', fontSize: 12, color: 'rgba(255, 255, 255, 0.4)', textDecoration: 'line-through' }}>{b.original}</p>
                          <p style={{ margin: 0, fontSize: 13, color: '#a78bfa', lineHeight: 1.5, fontWeight: 500 }}>{b.improved}</p>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => { setAtsResult(null); setResumeFile(null); }}
                      style={{
                        width: '100%', padding: '10px 16px', borderRadius: 8,
                        background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: 'rgba(255, 255, 255, 0.7)', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                        transition: 'all 0.2s ease'
                      }}>
                      Scan again with different resume
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Interview prep */}
            {activeTab === 'interview prep' && (
              <div>
                {prepQuestions.length === 0 ? (
                  <>
                    <p style={{ margin: '0 0 16px', fontSize: 13, color: 'rgba(255, 255, 255, 0.6)', lineHeight: 1.6 }}>
                      Get 8 tailored interview questions based on this job description — with specific tips on how to answer each one.
                    </p>
                    {prepError && (
                      <p style={{
                        fontSize: 13, color: '#fca5a5', marginBottom: 14,
                        padding: '10px 14px', borderRadius: 8,
                        background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)'
                      }}>{prepError}</p>
                    )}
                    <button
                      onClick={handleInterviewPrep}
                      disabled={prepLoading}
                      style={{
                        width: '100%', padding: '12px 20px', borderRadius: 10,
                        background: prepLoading ? 'rgba(99, 102, 241, 0.5)' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        color: '#fff', border: 'none', cursor: prepLoading ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600,
                        boxShadow: prepLoading ? 'none' : '0 4px 20px rgba(99, 102, 241, 0.3)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}>
                      {prepLoading ? 'Generating questions...' : 'Generate interview questions'}
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#fff' }}>{prepQuestions.length} questions generated</p>
                      <button
                        onClick={() => setPrepQuestions([])}
                        style={{
                          fontSize: 12, padding: '6px 14px', borderRadius: 8,
                          background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)',
                          cursor: 'pointer', color: 'rgba(255, 255, 255, 0.7)', fontWeight: 500,
                          transition: 'all 0.2s ease'
                        }}>
                        Regenerate
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {prepQuestions.map((q, i) => {
                        const TYPE_COLORS = {
                          technical:    { bg: 'rgba(99, 102, 241, 0.15)', text: '#a5b4fc', border: 'rgba(99, 102, 241, 0.3)' },
                          behavioral:   { bg: 'rgba(251, 191, 36, 0.15)', text: '#fcd34d', border: 'rgba(251, 191, 36, 0.3)' },
                          situational:  { bg: 'rgba(168, 85, 247, 0.15)', text: '#c4b5fd', border: 'rgba(168, 85, 247, 0.3)' },
                          'culture fit':{ bg: 'rgba(52, 211, 153, 0.15)', text: '#6ee7b7', border: 'rgba(52, 211, 153, 0.3)' },
                          'role-specific': { bg: 'rgba(249, 115, 22, 0.15)', text: '#fdba74', border: 'rgba(249, 115, 22, 0.3)' },
                        };
                        const tc = TYPE_COLORS[q.type] || { bg: 'rgba(255, 255, 255, 0.08)', text: 'rgba(255, 255, 255, 0.7)', border: 'rgba(255, 255, 255, 0.15)' };
                        const isOpen = expandedQ === i;

                        return (
                          <div key={i} style={{
                            border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 10,
                            overflow: 'hidden', background: 'rgba(255, 255, 255, 0.03)'
                          }}>
                            <button
                              onClick={() => setExpandedQ(isOpen ? null : i)}
                              style={{
                                width: '100%', padding: '12px 14px', background: 'none',
                                border: 'none', cursor: 'pointer', textAlign: 'left',
                                display: 'flex', alignItems: 'flex-start', gap: 12
                              }}>
                              <span style={{
                                fontSize: 11, fontWeight: 600, padding: '3px 8px',
                                borderRadius: 20, background: tc.bg, color: tc.text,
                                border: `1px solid ${tc.border}`,
                                whiteSpace: 'nowrap', marginTop: 1, flexShrink: 0
                              }}>
                                {q.type}
                              </span>
                              <span style={{ fontSize: 14, color: '#fff', flex: 1, textAlign: 'left', lineHeight: 1.5, fontWeight: 500 }}>
                                {q.question}
                              </span>
                              <span style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.4)', flexShrink: 0, marginTop: 3 }}>
                                {isOpen ? '▲' : '▼'}
                              </span>
                            </button>

                            {isOpen && (
                              <div style={{
                                padding: '12px 14px 14px',
                                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                                background: 'rgba(0, 0, 0, 0.2)'
                              }}>
                                <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  Answer tip
                                </p>
                                <p style={{ margin: 0, fontSize: 13, color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.6 }}>
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
        </div>,
        document.body
      )}
    </>
  );
}