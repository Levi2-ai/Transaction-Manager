// Backup utilities
const BACKUP_PREFIX = 'ctm:backup:';
const MAIN_KEY = 'ctm:v1:data';

export const createDailyBackup = (data) => {
  const today = new Date().toISOString().slice(0, 10);
  const backupKey = `${BACKUP_PREFIX}${today}`;
  
  try {
    localStorage.setItem(backupKey, JSON.stringify(data));
    // Keep only last 30 days of backups
    cleanupOldBackups();
  } catch (err) {
    console.error('Backup failed:', err);
  }
};

export const listBackups = () => {
  const backups = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith(BACKUP_PREFIX)) {
      const date = key.replace(BACKUP_PREFIX, '');
      backups.push({ date, key });
    }
  }
  return backups.sort((a, b) => b.date.localeCompare(a.date));
};

export const restoreBackup = (backupKey) => {
  try {
    const data = JSON.parse(localStorage.getItem(backupKey));
    if (!data || !data.clients || !data.projects || !data.txns) {
      throw new Error('Invalid backup data');
    }
    localStorage.setItem(MAIN_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    console.error('Restore failed:', err);
    return false;
  }
};

const cleanupOldBackups = () => {
  const backups = listBackups();
  if (backups.length > 30) {
    // Remove older backups, keeping only last 30 days
    backups.slice(30).forEach(backup => {
      localStorage.removeItem(backup.key);
    });
  }
};
