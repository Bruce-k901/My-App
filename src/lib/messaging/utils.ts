// Utility functions for messaging system

/**
 * Extract user mentions from message content (@username)
 * Returns array of user IDs that were mentioned
 */
export function extractMentions(content: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const matches = content.match(mentionRegex);
  if (!matches) return [];
  
  // Extract usernames (without @)
  const usernames = matches.map(match => match.substring(1));
  
  // In a real implementation, you'd look up user IDs from usernames
  // For now, return empty array - this should be implemented with a user lookup
  return [];
}

/**
 * Format message content with mentions highlighted
 */
export function formatMessageContent(content: string): string {
  // Replace @username with highlighted version
  return content.replace(/@(\w+)/g, '<span class="text-[#D37E91] font-medium">@$1</span>');
}

/**
 * Get conversation display name
 */
export function getConversationDisplayName(
  conversation: {
    name?: string | null;
    type: 'direct' | 'group' | 'site' | 'team';
    participants?: Array<{ user?: { full_name: string | null } | null }>;
  },
  currentUserId?: string
): string {
  if (conversation.name) return conversation.name;
  
  if (conversation.type === 'direct' && conversation.participants) {
    const otherParticipant = conversation.participants.find(
      (p: any) => p.user_id !== currentUserId
    );
    return otherParticipant?.user?.full_name || 'Direct Message';
  }
  
  return 'Unnamed Conversation';
}

/**
 * Check if message is unread
 */
export function isMessageUnread(
  message: { sender_id: string; read_by?: string[] },
  currentUserId: string
): boolean {
  if (message.sender_id === currentUserId) return false;
  return !message.read_by || !message.read_by.includes(currentUserId);
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get file icon based on file type
 */
export function getFileIcon(fileType: string): string {
  if (fileType.startsWith('image/')) return '🖼️';
  if (fileType.includes('pdf')) return '📄';
  if (fileType.includes('word') || fileType.includes('document')) return '📝';
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
  if (fileType.includes('video')) return '🎥';
  if (fileType.includes('audio')) return '🎵';
  return '📎';
}

/**
 * Compress and optimize image while maintaining high resolution
 * Uses canvas API to resize and compress images
 * 
 * @param file - Original image file
 * @param maxWidth - Maximum width (default: 1920px for high res)
 * @param maxHeight - Maximum height (default: 1920px for high res)
 * @param quality - JPEG quality 0-1 (default: 0.92 for high quality)
 * @returns Promise<File> - Compressed image file
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1920,
  quality: number = 0.92
): Promise<File> {
  return new Promise((resolve, reject) => {
    // Only compress image files
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }
        
        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Use high-quality image rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw the resized image
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to blob with compression
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }
            
            // Create new File with original name but compressed data
            const compressedFile = new File(
              [blob],
              file.name,
              {
                type: file.type, // Keep original MIME type
                lastModified: Date.now(),
              }
            );
            
            // Only use compressed version if it's actually smaller
            // This prevents unnecessary compression of already small images
            if (compressedFile.size < file.size) {
              resolve(compressedFile);
            } else {
              // If compression didn't help, return original
              resolve(file);
            }
          },
          file.type, // Use original MIME type (JPEG, PNG, etc.)
          quality // Compression quality
        );
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
}

