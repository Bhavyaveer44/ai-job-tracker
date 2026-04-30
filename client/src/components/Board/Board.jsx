import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import toast from 'react-hot-toast';
import { getJobs, updateJob } from '../../api/jobs';
import JobCard from '../JobCard/JobCard';
import AddJobModal from '../AddJobModal/AddJobModal';
import { useDebounce } from 'use-debounce';
const COLUMNS = [
  { id: 'applied',   label: 'Applied',   color: '#2563eb', border: '#2563eb' },
  { id: 'rejected',  label: 'Rejected',  color: '#dc2626', border: '#dc2626' },
  { id: 'interview', label: 'Interview', color: '#d97706', border: '#d97706' },
  { id: 'offer',     label: 'Offer',     color: '#16a34a', border: '#16a34a' },
];

const StatCard = ({ label, value, color }) => (
  <div style={{
    background: '#2a2a2a', borderRadius: 12, padding: '18px 22px',
    border: '1px solid #3d3d3d', flex: 1
  }}>
    <p style={{ margin: '0 0 8px', fontSize: 12, color: '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</p>
    <p style={{ margin: 0, fontSize: 32, fontWeight: 700, color: color || 'white' }}>{value}</p>
  </div>
);

export default function Board() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [debouncedSearch] = useDebounce(search, 300);

  useEffect(() => {
    getJobs()
      .then(setJobs)
      .catch(() => toast.error('Failed to load jobs'))
      .finally(() => setLoading(false));
  }, []);

  const onDragEnd = async (result) => {
    const { draggableId, destination, source } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;
    const newStatus = destination.droppableId;
    setJobs(prev => prev.map(j => j.id === draggableId ? { ...j, status: newStatus } : j));
    try {
      await updateJob(draggableId, { status: newStatus });
      toast.success(`Moved to ${newStatus}`);
    } catch {
      toast.error('Failed to update status');
      setJobs(prev => prev.map(j => j.id === draggableId ? { ...j, status: source.droppableId } : j));
    }
  };

  const handleJobAdded = (newJob) => { setJobs(prev => [newJob, ...prev]); toast.success('Job added'); };
  const handleJobDeleted = (id) => { setJobs(prev => prev.filter(j => j.id !== id)); toast.success('Job deleted'); };
  const handleJobUpdated = (updatedJob) => { setJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j)); toast.success('Job updated'); };

  const total = jobs.length;
  const interviews = jobs.filter(j => j.status === 'interview').length;
  const offers = jobs.filter(j => j.status === 'offer').length;
  const interviewRate = total > 0 ? Math.round(((interviews+offers) / total) * 100) : 0;

  const filteredJobs = jobs.filter(j => {
    const matchesSearch =
      j.role?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      j.company?.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchesStatus = statusFilter === 'all' || j.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const isFiltering = debouncedSearch !== '' || statusFilter !== 'all';

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
      <p style={{ color: '#6b7280' }}>Loading your jobs...</p>
    </div>
  );

  return (
    <div style={{ padding: 24 }}>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 24 }}>
        <StatCard label="Total Applied" value={total} color="#2563eb" />
        <StatCard label="Interviews" value={interviews} color="#d97706" />
        <StatCard label="Interview Rate" value={`${interviewRate}%`} color={interviewRate >= 20 ? '#d97706' : '#d97706'} />
        <StatCard label="Offers" value={offers} color="#16a34a" />
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap'
        }}>

          {/* Search input */}
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <span style={{
              position: 'absolute', left: 12, top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 14, color: '#4b5563', pointerEvents: 'none'
            }}>⌕</span>
            <input
              type="text"
              placeholder="Search role or company..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '8px 14px 8px 34px',
                borderRadius: 8, border: '1px solid #3d3d3d',
                background: '#2a2a2a', color: 'white',
                fontSize: 14, outline: 'none', boxSizing: 'border-box',
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute', right: 10, top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none',
                  color: '#6b7280', cursor: 'pointer', fontSize: 16,
                  lineHeight: 1, padding: 0
                }}>
                ×
              </button>
            )}
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{
              padding: '8px 14px', borderRadius: 8,
              border: '1px solid #3d3d3d',
              background: '#2a2a2a',
              color: statusFilter === 'all' ? '#6b7280' : 'white',
              fontSize: 14, cursor: 'pointer', outline: 'none',
            }}>
            <option value="all">All statuses</option>
            <option value="applied">Applied</option>
            <option value="interview">Interview</option>
            <option value="offer">Offer</option>
            <option value="rejected">Rejected</option>
          </select>

          {/* Clear button — only shows when filtering */}
          {isFiltering && (
            <button
              onClick={() => { setSearch(''); setStatusFilter('all'); }}
              style={{
                padding: '8px 14px', borderRadius: 8,
                border: '1px solid #3d3d3d', background: 'transparent',
                color: '#9ca3af', fontSize: 13, cursor: 'pointer',
                transition: 'color 0.15s'
              }}>
              Clear filters
            </button>
          )}

          {/* Add job */}
          <button
            onClick={() => setShowModal(true)}
            style={{
              padding: '9px 20px', background: '#2563eb', color: 'white',
              border: 'none', borderRadius: 8, cursor: 'pointer',
              fontWeight: 600, fontSize: 14, marginLeft: 'auto'
            }}>
            + Add job
          </button>
        </div>

        {/* Active filter indicator */}
        {isFiltering && (
          <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>
              Showing {filteredJobs.length} of {jobs.length} jobs
            </span>
            {debouncedSearch && (
              <span style={{
                fontSize: 11, padding: '2px 10px', borderRadius: 20,
                background: '#1e3a5f', color: '#60a5fa',
                border: '1px solid #1e40af'
              }}>
                "{debouncedSearch}"
              </span>
            )}
            {statusFilter !== 'all' && (
              <span style={{
                fontSize: 11, padding: '2px 10px', borderRadius: 20,
                background: '#1a2e1a', color: '#4ade80',
                border: '1px solid #166534'
              }}>
                {statusFilter}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Kanban */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {COLUMNS.map(col => (
            <div key={col.id} style={{
              background: '#2a2a2a',
              borderRadius: 12,
              border: `1px solid #3d3d3d`,
              borderTop: `3px solid ${col.border}`,
              padding: 14
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: col.color }} />
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'white' }}>{col.label}</h3>
                <span style={{
                  marginLeft: 'auto', fontSize: 12, color: '#00ff3c',
                  background: '#211f1f', padding: '1px 8px', borderRadius: 20
                }}>
                  {filteredJobs.filter(j => j.status === col.id).length}
                </span>
              </div>

              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      minHeight: 200,
                      maxHeight: 'calc(100vh - 320px)',
                      overflowY: 'auto',
                      background: snapshot.isDraggingOver ? '#333' : 'transparent',
                      borderRadius: 8, transition: 'background 0.2s', padding: 2,
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#3d3d3d transparent',
                    }}>
                    {filteredJobs.filter(j => j.status === col.id).length === 0 && (
                      <div style={{ textAlign: 'center', padding: '40px 0', color: '#ffffff', fontSize: 13 }}>
                        {isFiltering ? 'No matches' : 'No jobs here'}
                      </div>
                    )}
                    {filteredJobs.filter(j => j.status === col.id).map((job, index) => (
                      <Draggable key={job.id} draggableId={job.id} index={index}>
                        {(provided) => (
                          <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                            <JobCard job={job} onDelete={handleJobDeleted} onUpdate={handleJobUpdated} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {showModal && (
        <AddJobModal onClose={() => setShowModal(false)} onJobAdded={handleJobAdded} />
      )}
    </div>
  );
}