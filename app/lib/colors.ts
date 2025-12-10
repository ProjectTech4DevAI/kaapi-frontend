/**
 * Centralized color configuration
 * Modify these values to change the entire app's color scheme
 */

export const colors = {
  // Backgrounds
  bg: {
    primary: '#ffffff',
    secondary: '#fafafa',
  },

  // Text
  text: {
    primary: '#171717',
    secondary: '#737373',
  },

  // Borders
  border: '#e5e5e5',

  // Accent (used for primary actions, active states)
  accent: {
    primary: '#171717',
    hover: '#404040',
  },

  // Status colors
  status: {
    success: '#16a34a',
    error: '#dc2626',
    warning: '#f59e0b',
  }
} as const;
