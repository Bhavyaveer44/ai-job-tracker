import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { createJob } from '../../api/jobs';

const REQUIRED_COLUMNS = ['company', 'role'];
const KNOWN_COLUMNS = ['company', 'role', 'status', 'salary_range', 'notes'];
const VALID_STATUSES = ['applied', 'interview', 'offer', 'rejected'];

const STEPS = {
  UPLOAD: 'upload',
  MAP: 'map',
  PREVIEW: 'preview',
  IMPORTING: 'importing',
  DONE: 'done',
};

export default function ImportCSV({ onClose, onImportDone }) {
  const [step, setStep] = useState(STEPS.UPLOAD);
  const [rawData, setRawData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [preview, setPreview] = useState([]);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState([]);
  const [imported, setImported] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef();

  const parseFile = (file) => {
    setFileName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const cols = result.meta.fields || [];
        setHeaders(cols);
        setRawData(result.data);

        // auto-map columns by fuzzy matching headers to known fields
        const autoMap = {};
        cols.forEach(col => {
          const lower = col.toLowerCase().trim();
          if (lower.includes('company')) autoMap[col] = 'company';
          else if (lower.includes('role') || lower.includes('title') || lower.includes('position')) autoMap[col] = 'role';
          else if (lower.includes('status')) autoMap[col] = 'status';
          else if (lower.includes('salary') || lower.includes('pay') || lower.includes('compensation') || lower.includes('ctc')) autoMap[col] = 'salary_range';
          else if (lower.includes('note')) autoMap[col] = 'notes';
          else autoMap[col] = 'notes_extra'; // unmapped → notes
        });
        setMapping(autoMap);
        setStep(STEPS.MAP);
      },
      error: () => setErrors(['Failed to parse file — make sure it is a valid CSV or Excel file']),
    });
  };

  const handleFile = (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      setErrors(['Only CSV, XLSX, and XLS files are supported']);
      return;
    }
    setErrors([]);
    parseFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const buildPreview = () => {
    // validate mapping has required columns covered
    const mappedValues = Object.values(mapping);
    const missingRequired = REQUIRED_COLUMNS.filter(r => !mappedValues.includes(r));
    if (missingRequired.length > 0) {
      setErrors([`Please map at least: ${missingRequired.join(', ')}`]);
      return;
    }
    setErrors([]);

    const rows = rawData.slice(0, 5).map(row => buildJob(row));
    setPreview(rows);
    setStep(STEPS.PREVIEW);
  };

  const buildJob = (row) => {
    const job = {
      company: '',
      role: '',
      status: 'applied',
      salary_range: '',
      notes: '',
    };

    const extraParts = [];

    Object.entries(mapping).forEach(([csvCol, field]) => {
      const val = (row[csvCol] || '').toString().trim();
      if (!val) return;

      if (field === 'company') job.company = val;
      else if (field === 'role') job.role = val;
      else if (field === 'status') {
        const normalized = val.toLowerCase();
        job.status = VALID_STATUSES.find(s => normalized.includes(s)) || 'applied';
      }
      else if (field === 'salary_range') job.salary_range = val;
      else if (field === 'notes') job.notes = val;
      else if (field === 'notes_extra') {
        // unmapped columns go into notes as "Column: value"
        extraParts.push(`${csvCol}: ${val}`);
      }
      else if (field === 'skip') {
        // intentionally skipped
      }
    });

    if (extraParts.length > 0) {
      job.notes = [job.notes, extraParts.join(' | ')].filter(Boolean).join('\n');
    }

    return job;
  };

  const handleImport = async () => {
    setStep(STEPS.IMPORTING);
    setProgress(0);

    const allJobs = rawData.map(row => buildJob(row))
      .filter(j => j.company && j.role);

    let successCount = 0;
    const importErrors = [];

    for (let i = 0; i < allJobs.length; i++) {
      try {
        await createJob(allJobs[i]);
        successCount++;
      } catch {
        importErrors.push(`Row ${i + 2}: failed to import ${allJobs[i].company} — ${allJobs[i].role}`);
      }
      setProgress(Math.round(((i + 1) / allJobs.length) * 100));
    }

    setImported(successCount);
    setErrors(importErrors);
    setStep(STEPS.DONE);
    if (successCount > 0) onImportDone();
  };

  const fieldOptions = [
    { value: 'company', label: 'Company' },
    { value: 'role', label: 'Role / Job title' },
    { value: 'status', label: 'Status' },
    { value: 'salary_range', label: 'Salary range' },
    { value: 'notes', label: 'Notes' },
    { value: 'notes_extra', label: 'Add to notes (extra data)' },
    { value: 'skip', label: 'Skip this column' },
  ];

  const inputStyle = {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'rgba(255, 255, 255, 0.05)',
    color: '#fff',
    fontSize: 13,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'all 0.2s ease'
  };

  const STATUS_PILLS = {
    applied:   { bg: 'rgba(99, 102, 241, 0.15)', text: '#a5b4fc', border: 'rgba(99, 102, 241, 0.3)' },
    interview: { bg: 'rgba(168, 85, 247, 0.15)', text: '#c4b5fd', border: 'rgba(168, 85, 247, 0.3)' },
    offer:     { bg: 'rgba(167, 139, 250, 0.15)', text: '#a78bfa', border: 'rgba(167, 139, 250, 0.3)' },
    rejected:  { bg: 'rgba(196, 181, 253, 0.15)', text: '#c4b5fd', border: 'rgba(196, 181, 253, 0.3)' },
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
      zIndex: 200
    }}>
      <div style={{
        background: 'rgba(15, 15, 26, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: 16,
        padding: 28,
        width: '100%',
        maxWidth: 620,
        boxSizing: 'border-box',
        maxHeight: '90vh',
        overflowY: 'auto',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)'
      }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#fff' }}>
              Import from CSV / Excel
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255, 255, 255, 0.5)' }}>
              {step === STEPS.UPLOAD && 'Upload your spreadsheet to get started'}
              {step === STEPS.MAP && `Mapping columns from "${fileName}"`}
              {step === STEPS.PREVIEW && 'Preview first 5 rows before importing'}
              {step === STEPS.IMPORTING && 'Importing your jobs...'}
              {step === STEPS.DONE && 'Import complete'}
            </p>
          </div>
          {step !== STEPS.IMPORTING && (
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.4)',
                fontSize: 24,
                cursor: 'pointer',
                lineHeight: 1,
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
          )}
        </div>

        {/* Step indicators */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 26 }}>
          {['Upload', 'Map columns', 'Preview', 'Done'].map((label, i) => {
            const stepIndex = [STEPS.UPLOAD, STEPS.MAP, STEPS.PREVIEW, STEPS.DONE].indexOf(step);
            const isActive = i === stepIndex || (step === STEPS.IMPORTING && i === 2);
            const isDone = i < stepIndex || (step === STEPS.DONE && i < 3);
            return (
              <div key={label} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{
                  height: 4,
                  borderRadius: 4,
                  marginBottom: 6,
                  background: isDone
                    ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                    : isActive
                      ? '#a78bfa'
                      : 'rgba(255, 255, 255, 0.08)',
                  transition: 'background 0.3s'
                }} />
                <span style={{
                  fontSize: 12,
                  fontWeight: isActive || isDone ? 600 : 400,
                  color: isActive || isDone ? '#a5b4fc' : 'rgba(255, 255, 255, 0.4)'
                }}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── STEP: UPLOAD ── */}
        {step === STEPS.UPLOAD && (
          <div>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current.click()}
              style={{
                border: `2px dashed ${dragOver ? '#818cf8' : 'rgba(255, 255, 255, 0.15)'}`,
                borderRadius: 12,
                padding: '44px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: dragOver ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                marginBottom: 20
              }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📂</div>
              <p style={{ margin: '0 0 6px', color: '#fff', fontWeight: 600, fontSize: 16 }}>
                Drop your file here or click to browse
              </p>
              <p style={{ margin: 0, fontSize: 13, color: 'rgba(255, 255, 255, 0.45)' }}>
                Supports CSV, XLSX, XLS
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files[0])}
              />
            </div>

            {/* Template download hint */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 12,
              padding: 16,
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 500, color: 'rgba(255, 255, 255, 0.7)' }}>
                Recommended column names for auto-mapping:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {['company', 'role', 'status', 'salary_range', 'notes'].map(col => (
                  <span key={col} style={{
                    fontSize: 12,
                    padding: '4px 10px',
                    borderRadius: 20,
                    background: 'rgba(99, 102, 241, 0.15)',
                    color: '#a5b4fc',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    fontFamily: 'monospace'
                  }}>
                    {col}
                  </span>
                ))}
              </div>
              <p style={{ margin: '10px 0 0', fontSize: 12, color: 'rgba(255, 255, 255, 0.4)', lineHeight: 1.5 }}>
                Any extra columns will be mapped to notes automatically. Status values: applied, interview, offer, rejected.
              </p>
            </div>

            {errors.length > 0 && errors.map((e, i) => (
              <p key={i} style={{
                color: '#fca5a5',
                fontSize: 13,
                marginTop: 14,
                padding: '10px 14px',
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)'
              }}>{e}</p>
            ))}
          </div>
        )}

        {/* ── STEP: MAP ── */}
        {step === STEPS.MAP && (
          <div>
            <p style={{ margin: '0 0 18px', fontSize: 13, color: 'rgba(255, 255, 255, 0.6)' }}>
              We detected <strong style={{ color: '#fff' }}>{headers.length} columns</strong> and <strong style={{ color: '#fff' }}>{rawData.length} rows</strong>. Map each column to a field — we've auto-filled our best guess.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24, maxHeight: 340, overflowY: 'auto', paddingRight: 4 }}>
              {headers.map(col => (
                <div key={col} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto 1fr',
                  alignItems: 'center',
                  gap: 12
                }}>
                  {/* CSV column name */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 8,
                    padding: '8px 12px',
                  }}>
                    <p style={{ margin: 0, fontSize: 11, color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CSV column</p>
                    <p style={{ margin: 0, fontSize: 14, color: '#fff', fontWeight: 600 }}>{col}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255, 255, 255, 0.4)' }}>
                      e.g. "{(rawData[0]?.[col] || '—').toString().slice(0, 22)}"
                    </p>
                  </div>

                  {/* Arrow */}
                  <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: 16 }}>→</span>

                  {/* Mapping select */}
                  <div>
                    <select
                      value={mapping[col] || 'notes_extra'}
                      onChange={e => setMapping(prev => ({ ...prev, [col]: e.target.value }))}
                      style={{
                        ...inputStyle,
                        color: mapping[col] === 'skip' ? 'rgba(255, 255, 255, 0.4)' : '#fff'
                      }}>
                      {fieldOptions.map(opt => (
                        <option key={opt.value} value={opt.value} style={{ background: '#1a1a2e', color: '#fff' }}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            {errors.length > 0 && errors.map((e, i) => (
              <p key={i} style={{
                color: '#fca5a5',
                fontSize: 13,
                marginBottom: 14,
                padding: '10px 14px',
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)'
              }}>{e}</p>
            ))}

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setStep(STEPS.UPLOAD)}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  borderRadius: 10,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: 'rgba(255, 255, 255, 0.7)',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                }}
              >
                Back
              </button>
              <button
                onClick={buildPreview}
                style={{
                  flex: 2,
                  padding: '12px 20px',
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                Preview import →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: PREVIEW ── */}
        {step === STEPS.PREVIEW && (
          <div>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'rgba(255, 255, 255, 0.6)' }}>
              Showing first 5 rows of <strong style={{ color: '#fff' }}>{rawData.length} total</strong>. Verify the data looks right before importing.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {preview.map((job, i) => {
                const pill = STATUS_PILLS[job.status] || STATUS_PILLS.applied;
                return (
                  <div key={i} style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: 10,
                    padding: '14px 16px',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: '#fff' }}>{job.role || '—'}</p>
                        <p style={{ margin: '2px 0 8px', fontSize: 13, color: 'rgba(255, 255, 255, 0.5)' }}>{job.company || '—'}</p>
                      </div>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '3px 10px',
                        borderRadius: 20,
                        background: pill.bg,
                        color: pill.text,
                        border: `1px solid ${pill.border}`,
                        textTransform: 'capitalize'
                      }}>
                        {job.status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      {job.salary_range && (
                        <span style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)' }}>💰 {job.salary_range}</span>
                      )}
                      {job.notes && (
                        <span style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)' }}>
                          📝 {job.notes.slice(0, 60)}{job.notes.length > 60 ? '...' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              borderRadius: 10,
              padding: 14,
              marginBottom: 20
            }}>
              <p style={{ margin: 0, fontSize: 13, color: '#a5b4fc', lineHeight: 1.5 }}>
                Ready to import <strong>{rawData.filter(r => r[Object.keys(mapping).find(k => mapping[k] === 'company')] && r[Object.keys(mapping).find(k => mapping[k] === 'role')]).length} valid jobs</strong> into your board.
                Rows missing company or role will be skipped.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setStep(STEPS.MAP)}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  borderRadius: 10,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: 'rgba(255, 255, 255, 0.7)',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                  transition: 'all 0.2s ease'
                }}
              >
                Back
              </button>
              <button
                onClick={handleImport}
                style={{
                  flex: 2,
                  padding: '12px 20px',
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                Import {rawData.length} jobs →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: IMPORTING ── */}
        {step === STEPS.IMPORTING && (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <p style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 600, color: '#fff' }}>
              Importing your jobs...
            </p>
            <div style={{
              background: 'rgba(255, 255, 255, 0.06)',
              borderRadius: 100,
              height: 8,
              overflow: 'hidden',
              marginBottom: 14
            }}>
              <div style={{
                height: '100%',
                borderRadius: 100,
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                width: `${progress}%`,
                transition: 'width 0.2s ease',
                boxShadow: '0 0 12px rgba(99, 102, 241, 0.5)'
              }} />
            </div>
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255, 255, 255, 0.5)' }}>{progress}% complete</p>
          </div>
        )}

        {/* ── STEP: DONE ── */}
        {step === STEPS.DONE && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>
              {imported > 0 ? '✨' : '⚠️'}
            </div>
            <p style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: '#fff' }}>
              {imported > 0 ? `${imported} jobs imported!` : 'Nothing was imported'}
            </p>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: 'rgba(255, 255, 255, 0.5)', lineHeight: 1.5 }}>
              {imported > 0
                ? 'Your board has been updated. You can edit any job from the board.'
                : 'Check that your file has company and role columns.'}
            </p>

            {errors.length > 0 && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 10,
                padding: 14,
                marginBottom: 20,
                textAlign: 'left',
                maxHeight: 120,
                overflowY: 'auto'
              }}>
                <p style={{ margin: '0 0 6px', fontSize: 12, color: '#fca5a5', fontWeight: 600 }}>
                  {errors.length} row(s) failed:
                </p>
                {errors.map((e, i) => (
                  <p key={i} style={{ margin: '2px 0', fontSize: 12, color: 'rgba(255, 255, 255, 0.7)' }}>{e}</p>
                ))}
              </div>
            )}

            <button
              onClick={onClose}
              style={{
                width: '100%',
                padding: '12px 20px',
                borderRadius: 10,
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}>
              Go to board
            </button>
          </div>
        )}

      </div>
    </div>
  );
}