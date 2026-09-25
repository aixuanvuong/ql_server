// filepath: frontend/src/types/update.types.ts

export interface CheckUpdateResponse {
  success: boolean;
  isUpdating: boolean;
  hasUpdate: boolean;
  behindCount: number;
  localCommit: string;
  remoteCommit: string;
  localBranch: string;
  commitMessage: string;
  lastChecked: string;
  error?: string;
}

export interface UpdateStatusResponse {
  success: boolean;
  data: {
    isUpdating: boolean;
    logs: string[];
    lastChecked: string | null;
  };
}
