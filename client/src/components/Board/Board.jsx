import { useState, useEffect } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
} from '@hello-pangea/dnd';
import toast from 'react-hot-toast';
import { useDebounce } from 'use-debounce';

import { getJobs, updateJob } from '../../api/jobs';
import JobCard from '../JobCard/JobCard';
import AddJobModal from '../AddJobModal/AddJobModal';
import ImportCSV from '../ImportCSV/ImportCSV';

const COLUMNS = [
  {
    id: 'applied',
    label: 'Applied',
    color: '#6366f1',
    border: '#6366f1',
  },
  {
    id: 'rejected',
    label: 'Rejected',
    color: '#c4b5fd',
    border: '#c4b5fd',
  },
  {
    id: 'interview',
    label: 'Interview',
    color: '#8b5cf6',
    border: '#8b5cf6',
  },
  {
    id: 'offer',
    label: 'Offer',
    color: '#a78bfa',
    border: '#a78bfa',
  },
];

const StatCard = ({ label, value, color }) => (
  <div
    style={{
      background: 'rgba(255, 255, 255, 0.03)',
      backdropFilter: 'blur(10px)',
      borderRadius: 16,
      padding: '20px 24px',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      flex: 1,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    }}
  >
    <p
      style={{
        margin: '0 0 8px',
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.5)',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        fontWeight: 600
      }}
    >
      {label}
    </p>

    <p
      style={{
        margin: 0,
        fontSize: 36,
        fontWeight: 700,
        color: color || '#fff',
        letterSpacing: '-1px'
      }}
    >
      {value}
    </p>
  </div>
);

export default function Board() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [debouncedSearch] = useDebounce(search, 300);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const data = await getJobs();
        setJobs(data);
      } catch (error) {
        console.error(error);
        toast.error('Failed to load jobs');
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  const onDragEnd = async (result) => {
    const { draggableId, destination, source } = result;

    if (!destination) return;

    if (destination.droppableId === source.droppableId) {
      return;
    }

    const newStatus = destination.droppableId;

    // Optimistic UI update
    setJobs((prev) =>
      prev.map((job) =>
        String(job.id) === draggableId
          ? { ...job, status: newStatus }
          : job
      )
    );

    try {
      await updateJob(draggableId, {
        status: newStatus,
      });

      toast.success(`Moved to ${newStatus}`);
    } catch (error) {
      console.error(error);

      toast.error('Failed to update status');

      // Rollback
      setJobs((prev) =>
        prev.map((job) =>
          String(job.id) === draggableId
            ? { ...job, status: source.droppableId }
            : job
        )
      );
    }
  };

  const handleJobAdded = (newJob) => {
    setJobs((prev) => [newJob, ...prev]);
    toast.success('Job added');
  };

  const handleJobDeleted = (id) => {
    setJobs((prev) => prev.filter((job) => job.id !== id));
    toast.success('Job deleted');
  };

  const handleJobUpdated = (updatedJob) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === updatedJob.id ? updatedJob : job
      )
    );

    toast.success('Job updated');
  };

  const total = jobs.length;

  const interviews = jobs.filter(
    (job) => job.status === 'interview'
  ).length;

  const offers = jobs.filter(
    (job) => job.status === 'offer'
  ).length;

  const interviewRate =
    total > 0
      ? Math.round(((interviews + offers) / total) * 100)
      : 0;

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.role
        ?.toLowerCase()
        .includes(debouncedSearch.toLowerCase()) ||
      job.company
        ?.toLowerCase()
        .includes(debouncedSearch.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      job.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const isFiltering =
    debouncedSearch !== '' || statusFilter !== 'all';

  const handleImportDone = async () => {
    try {
      const data = await getJobs();
      setJobs(data);

      toast.success('Jobs imported successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to refresh jobs');
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: 300,
        }}
      >
        <p style={{ color: '#6b7280' }}>
          Loading your jobs...
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: 32 }}>
      {/* Stats */}
      <div
        style={{
          display: 'flex',
          gap: 20,
          marginBottom: 32,
          flexWrap: 'wrap',
        }}
      >
        <StatCard
          label="Total Applied"
          value={total}
          color="#6366f1"
        />

        <StatCard
          label="Interviews"
          value={interviews}
          color="#8b5cf6"
        />

        <StatCard
          label="Interview Rate"
          value={`${interviewRate}%`}
          color={
            interviewRate >= 35
              ? '#a78bfa'
              : '#8b5cf6'
          }
        />

        <StatCard
          label="Offers"
          value={offers}
          color={
            offers >=2
            ? '#a78bfa'
            : '#8b5cf6'
          }
        />
      </div>

      {/* Controls */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <input
            type="text"
            placeholder="Search by role or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              minWidth: 220,
              padding: '10px 16px',
              borderRadius: 10,
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

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value)
            }
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(255, 255, 255, 0.05)',
              color:
                statusFilter === 'all'
                  ? 'rgba(255, 255, 255, 0.5)'
                  : '#fff',
              fontSize: 14,
              cursor: 'pointer',
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
            <option value="all">All statuses</option>
            <option value="applied">Applied</option>
            <option value="interview">Interview</option>
            <option value="offer">Offer</option>
            <option value="rejected">Rejected</option>
          </select>

          {(search || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
              }}
              style={{
                padding: '10px 16px',
                borderRadius: 10,
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: 'transparent',
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: 14,
                cursor: 'pointer',
                fontWeight: 500,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
              }}
            >
              Clear
            </button>
          )}

          <button
            onClick={() => setShowImport(true)}
            style={{
              padding: '10px 20px',
              borderRadius: 10,
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: 'transparent',
              color: 'rgba(255, 255, 255, 0.7)',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.05)';
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent';
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            }}
          >
            Import CSV
          </button>

          <button
            onClick={() => setShowModal(true)}
            style={{
              padding: '10px 20px',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 8px 30px rgba(99, 102, 241, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 20px rgba(99, 102, 241, 0.3)';
            }}
          >
            + Add job
          </button>
        </div>

        {/* Active Filters */}
        {isFiltering && (
          <div
            style={{
              marginTop: 10,
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontSize: 13,
                color: 'rgba(255, 255, 255, 0.5)',
                fontWeight: 500,
              }}
            >
              Showing {filteredJobs.length} of {jobs.length} jobs
            </span>

            {debouncedSearch && (
              <span
                style={{
                  fontSize: 12,
                  padding: '3px 12px',
                  borderRadius: 20,
                  background: 'rgba(99, 102, 241, 0.15)',
                  color: '#a5b4fc',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  fontWeight: 500
                }}
              >
                "{debouncedSearch}"
              </span>
            )}

            {statusFilter !== 'all' && (
              <span
                style={{
                  fontSize: 12,
                  padding: '3px 12px',
                  borderRadius: 20,
                  background: 'rgba(168, 85, 247, 0.15)',
                  color: '#c4b5fd',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  fontWeight: 500
                }}
              >
                {statusFilter}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 20,
            alignItems: 'start',
            overflowX: 'auto',
          }}
        >
          {COLUMNS.map((col) => {
            const columnJobs = filteredJobs.filter(
              (job) => job.status === col.id
            );

            return (
              <div
                key={col.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: 16,
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderTop: `3px solid ${col.border}`,
                  padding: 16,
                  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)'
                }}
              >
                {/* Column Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: col.color,
                      boxShadow: `0 0 10px ${col.color}`
                    }}
                  />

                  <h3
                    style={{
                      margin: 0,
                      fontSize: 15,
                      fontWeight: 600,
                      color: '#fff',
                    }}
                  >
                    {col.label}
                  </h3>

                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'rgba(255, 255, 255, 0.7)',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      padding: '2px 10px',
                      borderRadius: 20,
                    }}
                  >
                    {columnJobs.length}
                  </span>
                </div>

                {/* Droppable */}
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      style={{
                        minHeight: 200,
                        maxHeight: 'calc(100vh - 320px)',
                        overflowY: 'auto',
                        background:
                          snapshot.isDraggingOver
                            ? 'rgba(99, 102, 241, 0.08)'
                            : 'transparent',
                        borderRadius: 12,
                        transition: 'background 0.2s ease',
                        padding: 4,
                        scrollbarWidth: 'thin',
                        scrollbarColor: 'rgba(255, 255, 255, 0.1) transparent',
                      }}
                    >
                      {columnJobs.length === 0 && (
                        <div
                          style={{
                            textAlign: 'center',
                            padding: '48px 0',
                            color: 'rgba(255, 255, 255, 0.35)',
                            fontSize: 13,
                          }}
                        >
                          {isFiltering
                            ? 'No matches'
                            : 'No jobs here'}
                        </div>
                      )}

                      {columnJobs.map((job, index) => (
                        <Draggable
                          key={String(job.id)}
                          draggableId={String(job.id)}
                          index={index}
                        >
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <JobCard
                                job={job}
                                onDelete={
                                  handleJobDeleted
                                }
                                onUpdate={
                                  handleJobUpdated
                                }
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}

                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Add Job Modal */}
      {showModal && (
        <AddJobModal
          onClose={() => setShowModal(false)}
          onJobAdded={handleJobAdded}
        />
      )}

      {/* Import CSV Modal */}
      {showImport && (
        <ImportCSV
          onClose={() => setShowImport(false)}
          onImportDone={handleImportDone}
        />
      )}
    </div>
  );
}