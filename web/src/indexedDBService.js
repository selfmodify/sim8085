// IndexedDB service for persisting simulator sessions
// Stores: source code, filename, registers, memory, breakpoints, execution trace

const DB_NAME = 'sim8085-sessions';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';

let db = null;

async function initDB() {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('name', 'name', { unique: false });
      }
    };
  });
}

export async function saveSession(sessionData) {
  try {
    const database = await initDB();
    const session = {
      name: sessionData.name || `Session-${new Date().toLocaleString()}`,
      timestamp: Date.now(),
      source: sessionData.source,
      filename: sessionData.filename || '',
      breakpoints: sessionData.breakpoints || [],
    };

    return new Promise((resolve, reject) => {
      const tx = database.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.add(session);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  } catch (error) {
    console.error('Failed to save session:', error);
    throw error;
  }
}

export async function updateSession(id, sessionData) {
  try {
    const database = await initDB();
    const session = {
      id,
      name: sessionData.name,
      timestamp: Date.now(),
      source: sessionData.source,
      filename: sessionData.filename || '',
      breakpoints: sessionData.breakpoints || [],
    };

    return new Promise((resolve, reject) => {
      const tx = database.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(session);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  } catch (error) {
    console.error('Failed to update session:', error);
    throw error;
  }
}

export async function loadSession(id) {
  try {
    const database = await initDB();
    return new Promise((resolve, reject) => {
      const tx = database.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  } catch (error) {
    console.error('Failed to load session:', error);
    throw error;
  }
}

export async function deleteSession(id) {
  try {
    const database = await initDB();
    return new Promise((resolve, reject) => {
      const tx = database.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.error('Failed to delete session:', error);
    throw error;
  }
}

export async function listSessions() {
  try {
    const database = await initDB();
    return new Promise((resolve, reject) => {
      const tx = database.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const request = index.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const sessions = request.result.sort((a, b) => b.timestamp - a.timestamp);
        resolve(sessions);
      };
    });
  } catch (error) {
    console.error('Failed to list sessions:', error);
    throw error;
  }
}

export async function deleteAllSessions() {
  try {
    const database = await initDB();
    return new Promise((resolve, reject) => {
      const tx = database.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.error('Failed to delete all sessions:', error);
    throw error;
  }
}
