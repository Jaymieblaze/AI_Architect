/**
 * Convert a File to base64 data URL
 * @param file - The file to convert
 * @returns Promise<string> - Base64 data URL (e.g., "data:image/png;base64,...")
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as base64'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('FileReader error'));
    };
    
    reader.readAsDataURL(file);
  });
}
