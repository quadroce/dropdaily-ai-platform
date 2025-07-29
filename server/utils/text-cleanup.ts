/**
 * Text cleanup utilities for RSS and content processing
 */

export function cleanContentDescription(description: string | undefined): string {
  if (!description) return '';
  
  return description
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove HTML entities
    .replace(/&[^;]+;/g, ' ')
    // Remove RSS footer patterns
    .replace(/Continue reading.*$/i, '')
    .replace(/The post .* appeared first on.*$/i, '')
    .replace(/Read more.*$/i, '')
    .replace(/\[…\]/g, '')
    // Clean up multiple dots
    .replace(/\.{3,}/g, '...')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractCleanExcerpt(text: string, maxLength: number = 150): string {
  const cleaned = cleanContentDescription(text);
  
  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  
  // Find the last complete sentence within the limit
  const truncated = cleaned.substring(0, maxLength);
  const lastSentence = truncated.lastIndexOf('.');
  
  if (lastSentence > maxLength * 0.6) {
    return truncated.substring(0, lastSentence + 1);
  }
  
  // If no good sentence break, find last complete word
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > 0) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}