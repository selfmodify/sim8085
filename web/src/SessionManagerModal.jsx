import { useState, useEffect } from 'react';
import { saveSession, loadSession, deleteSession, listSessions } from './indexedDBService.js';
import './SessionManagerModal.css';

export function SessionManagerModal({ isOpen, onClose, onLoad, currentSource, currentFilename }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [savingName, setSavingName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSessions();
    }
  }, [isOpen]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await listSessions();
      setSessions(list);
    } catch (err) {
      setError(`Failed to load sessions: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSession = async () => {
    if (!savingName.trim()) {
      setError('Session name cannot be empty');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      await saveSession({
        name: savingName.trim(),
        source: currentSource,
        filename: currentFilename,
      });
      setSavingName('');
      setShowSaveForm(false);
      await loadSessions();
    } catch (err) {
      setError(`Failed to save session: ${err.message}`);
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadSession = async (sessionId) => {
    try {
      setLoading(true);
      setError(null);
      const session = await loadSession(sessionId);
      if (session) {
        onLoad({
          source: session.source,
          filename: session.filename,
        });
        onClose();
      }
    } catch (err) {
      setError(`Failed to load session: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to delete this session?')) return;

    try {
      setError(null);
      await deleteSession(sessionId);
      await loadSessions();
    } catch (err) {
      setError(`Failed to delete session: ${err.message}`);
      console.error(err);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="session-modal-backdrop" onClick={onClose} />
      <div className="session-manager-modal">
        <div className="session-modal-header">
          <h2>Session Manager</h2>
          <button className="session-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="session-modal-content">
          {error && <div className="session-error">{error}</div>}

          {!showSaveForm ? (
            <button
              className="session-save-btn"
              onClick={() => setShowSaveForm(true)}
              disabled={loading || isSaving}
            >
              + Save Current Session
            </button>
          ) : (
            <div className="session-save-form">
              <input
                type="text"
                className="session-name-input"
                placeholder="Enter session name..."
                value={savingName}
                onChange={(e) => setSavingName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleSaveSession();
                }}
                disabled={isSaving}
                autoFocus
              />
              <div className="session-save-actions">
                <button
                  onClick={handleSaveSession}
                  disabled={isSaving || !savingName.trim()}
                  className="session-save-confirm"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setShowSaveForm(false);
                    setSavingName('');
                  }}
                  disabled={isSaving}
                  className="session-save-cancel"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="session-list">
            {loading ? (
              <div className="session-loading">Loading sessions...</div>
            ) : sessions.length === 0 ? (
              <div className="session-empty">No saved sessions yet</div>
            ) : (
              sessions.map((session) => (
                <div key={session.id} className="session-item">
                  <div className="session-item-info">
                    <div className="session-item-name">{session.name}</div>
                    <div className="session-item-meta">
                      {session.filename && <span className="session-file">{session.filename}</span>}
                      <span className="session-date">{new Date(session.timestamp).toLocaleString()}</span>
                    </div>
                    {session.source && (
                      <div className="session-preview">
                        {session.source.split('\n')[0].substring(0, 60)}...
                      </div>
                    )}
                  </div>
                  <div className="session-item-actions">
                    <button
                      className="session-load-btn"
                      onClick={() => handleLoadSession(session.id)}
                      disabled={loading}
                    >
                      Load
                    </button>
                    <button
                      className="session-delete-btn"
                      onClick={() => handleDeleteSession(session.id)}
                      disabled={loading}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
