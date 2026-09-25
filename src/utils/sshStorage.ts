// filepath: frontend/src/utils/sshStorage.ts
import { SavedSshProfile } from '../types/system.types';

const STORAGE_KEY = 'ql_saved_ssh_profiles_v1';

const DEFAULT_PROFILES: SavedSshProfile[] = [
  {
    id: 'default-localhost',
    name: 'Máy chủ Cục bộ (Localhost Agent)',
    host: '127.0.0.1',
    port: 22,
    username: 'ubuntu',
    password: '',
    savePassword: false,
    tag: 'Mặc định',
    lastConnected: 'Hệ thống'
  }
];

export function getSavedSshProfiles(): SavedSshProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PROFILES));
      return DEFAULT_PROFILES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_PROFILES;
  } catch {
    return DEFAULT_PROFILES;
  }
}

export function saveSshProfile(profile: Omit<SavedSshProfile, 'id'> & { id?: string }): SavedSshProfile {
  const profiles = getSavedSshProfiles();
  const id = profile.id || `ssh_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const newProfile: SavedSshProfile = {
    ...profile,
    id,
    password: profile.savePassword ? profile.password : ''
  };

  const existingIndex = profiles.findIndex((p) => p.id === id);
  let updatedProfiles: SavedSshProfile[];

  if (existingIndex >= 0) {
    updatedProfiles = [...profiles];
    updatedProfiles[existingIndex] = newProfile;
  } else {
    updatedProfiles = [newProfile, ...profiles];
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProfiles));
  } catch (err) {
    console.error('Không thể lưu hồ sơ SSH vào localStorage:', err);
  }

  return newProfile;
}

export function deleteSshProfile(id: string): SavedSshProfile[] {
  const profiles = getSavedSshProfiles();
  const filtered = profiles.filter((p) => p.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Không thể xóa hồ sơ SSH khỏi localStorage:', err);
  }
  return filtered;
}

export function updateLastConnected(id: string): void {
  const profiles = getSavedSshProfiles();
  const index = profiles.findIndex((p) => p.id === id);
  if (index >= 0) {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} ${now.getDate()}/${now.getMonth() + 1}`;
    profiles[index].lastConnected = timeStr;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    } catch {
      // Ignore
    }
  }
}
