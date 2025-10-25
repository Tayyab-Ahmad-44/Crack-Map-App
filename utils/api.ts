// API configuration and utility functions

export const API_BASE_URL = 'https://preobedient-shanell-superaffluently.ngrok-free.dev';

export const getImageUrl = (imagePath: string): string => {
  // Handle both relative paths (/image/123) and full URLs
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  
  // Ensure path starts with /
  const path = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${API_BASE_URL}${path}`;
};

export const getApiUrl = (endpoint: string): string => {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${path}`;
};
