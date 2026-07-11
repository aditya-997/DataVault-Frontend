import React from 'react';
import {
  FileText,
  FileImage,
  File,
  Music,
  Video,
  Archive,
  Code,
  Table2,
  Presentation,
} from 'lucide-react';

export default function FileTypeIcon({ fileName, className = 'w-5 h-5' }) {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  // Images
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
    return <FileImage className={className} />;
  }

  // Documents
  if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext)) {
    return <FileText className={className} />;
  }

  // Spreadsheets
  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return <Table2 className={className} />;
  }

  // Presentations
  if (['ppt', 'pptx'].includes(ext)) {
    return <Presentation className={className} />;
  }

  // Audio
  if (['mp3', 'wav', 'flac', 'aac', 'm4a'].includes(ext)) {
    return <Music className={className} />;
  }

  // Video
  if (['mp4', 'avi', 'mkv', 'mov', 'wmv', 'webm'].includes(ext)) {
    return <Video className={className} />;
  }

  // Archives
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return <Archive className={className} />;
  }

  // Code
  if (['js', 'ts', 'tsx', 'jsx', 'py', 'java', 'cpp', 'c', 'go', 'rs', 'rb', 'php', 'html', 'css'].includes(ext)) {
    return <Code className={className} />;
  }

  // Default
  return <File className={className} />;
}
