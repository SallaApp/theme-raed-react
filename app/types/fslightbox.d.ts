// fslightbox ships no types; importing it installs `window.refreshFsLightbox`.
declare module 'fslightbox';

interface Window {
  refreshFsLightbox?: () => void;
}
