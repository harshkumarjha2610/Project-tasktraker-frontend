export interface NoteTab {
  id: string;
  name: string;
  content: string;
}

/**
 * Strips HTML tags from a string and converts HTML entities into clean plain text.
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  
  // Replace line breaking elements and strip img tags
  let text = html
    .replace(/<img[^>]*>/gi, '')
    .replace(/<\/(p|h1|h2|h3|h4|h5|h6|li|tr|div)>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ');

  // Create temporary parser using DOMParser if in browser environment
  if (typeof window !== 'undefined') {
    const doc = new DOMParser().parseFromString(text, 'text/html');
    text = doc.body.textContent || '';
  } else {
    // Fallback for SSR
    text = text.replace(/<[^>]+>/g, '');
  }

  // Normalize whitespace
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Extracts all image URLs (src attributes) from raw note content.
 */
export function extractImagesFromContent(rawContent: string): string[] {
  if (!rawContent) return [];
  const images: string[] = [];

  const collectFromHtml = (html: string) => {
    if (!html) return;
    const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
    let match;
    while ((match = imgRegex.exec(html)) !== null) {
      if (match[1]) {
        images.push(match[1]);
      }
    }
  };

  try {
    const parsed = JSON.parse(rawContent);
    if (Array.isArray(parsed)) {
      parsed.forEach((tab: NoteTab) => {
        if (tab.content) collectFromHtml(tab.content);
      });
      return images;
    }
  } catch (e) {
    // Content is plain string or HTML, not JSON
  }

  collectFromHtml(rawContent);
  return images;
}

/**
 * Compresses an Image File into an optimized JPEG Data URL.
 */
export function compressImageFile(file: File, maxWidth = 1200, quality = 0.82): Promise<string> {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('image/')) {
      resolve('');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        resolve('');
        return;
      }

      // Create an HTML Image object to resize
      const img = typeof window !== 'undefined' ? new window.Image() : null;
      if (!img) {
        resolve(dataUrl);
        return;
      }

      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
          } else {
            resolve(dataUrl);
          }
        } catch (err) {
          resolve(dataUrl);
        }
      };

      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };

    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

/**
 * Parses raw note content string. Handles JSON serialized tabs format or legacy plain text/HTML.
 */
export function parseNoteContent(rawContent: string): { tabs: NoteTab[]; plainText: string; images: string[] } {
  if (!rawContent) {
    return {
      tabs: [{ id: '1', name: 'Main', content: '' }],
      plainText: '',
      images: [],
    };
  }

  const images = extractImagesFromContent(rawContent);

  try {
    const parsed = JSON.parse(rawContent);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const validTabs: NoteTab[] = parsed.map((t, idx) => ({
        id: t.id || String(idx + 1),
        name: t.name || `Section ${idx + 1}`,
        content: t.content || '',
      }));

      const allPlainText = validTabs
        .map((tab) => stripHtml(tab.content))
        .filter(Boolean)
        .join(' ');

      return {
        tabs: validTabs,
        plainText: allPlainText,
        images,
      };
    }
  } catch (e) {
    // Content is plain string or HTML, not JSON
  }

  const cleanText = stripHtml(rawContent);
  return {
    tabs: [{ id: '1', name: 'Main', content: rawContent }],
    plainText: cleanText,
    images,
  };
}
