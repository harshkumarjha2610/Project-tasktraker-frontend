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
  
  // Replace line breaking elements with spaces/newlines
  let text = html
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
 * Parses raw note content string. Handles JSON serialized tabs format or legacy plain text/HTML.
 */
export function parseNoteContent(rawContent: string): { tabs: NoteTab[]; plainText: string } {
  if (!rawContent) {
    return {
      tabs: [{ id: '1', name: 'Main', content: '' }],
      plainText: '',
    };
  }

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
      };
    }
  } catch (e) {
    // Content is plain string or HTML, not JSON
  }

  const cleanText = stripHtml(rawContent);
  return {
    tabs: [{ id: '1', name: 'Main', content: rawContent }],
    plainText: cleanText,
  };
}
