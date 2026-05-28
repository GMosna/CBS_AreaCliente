function extractDriveFileId(url: string): string | null {
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];

  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];

  return null;
}

export function resolveLogoUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  if (url.includes('drive.google.com') || url.includes('googleusercontent.com/d/')) {
    const fileId = extractDriveFileId(url) ?? url.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1];
    if (fileId) return `https://lh3.googleusercontent.com/d/${fileId}`;
  }

  return url;
}
