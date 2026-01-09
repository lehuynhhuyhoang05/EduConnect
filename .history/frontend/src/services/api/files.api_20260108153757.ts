import api from './axios';

interface FileInfo {
  id: number;
  originalName: string;
  storedName: string;
  path: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

interface FileListParams {
  type?: 'image' | 'video' | 'audio' | 'document' | 'other';
  uploadedBy?: number;
  page?: number;
  limit?: number;
}

/**
 * Upload a single file
 */
export async function uploadFile(file: File): Promise<FileInfo> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post<FileInfo>('/files/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

/**
 * Upload multiple files
 */
export async function uploadMultipleFiles(files: File[]): Promise<FileInfo[]> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });
  
  const response = await api.post<FileInfo[]>('/files/upload-multiple', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

/**
 * Get file list
 */
export async function getFiles(params?: FileListParams): Promise<{
  data: FileInfo[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}> {
  const response = await api.get('/files', { params });
  return response.data;
}

/**
 * Get file info
 */
export async function getFileInfo(id: string | number): Promise<FileInfo> {
  const response = await api.get<FileInfo>(`/files/${id}`);
  return response.data;
}

/**
 * Download file
 */
export async function downloadFile(id: string | number): Promise<Blob> {
  const response = await api.get(`/files/${id}/download`, {
    responseType: 'blob',
  });
  return response.data;
}

/**
 * Delete file
 */
export async function deleteFile(id: string | number): Promise<void> {
  await api.delete(`/files/${id}`);
}

/**
 * Get file URL
 */
export function getFileUrl(path: string): string {
  return `${api.defaults.baseURL}/files/download/${path}`;
}
