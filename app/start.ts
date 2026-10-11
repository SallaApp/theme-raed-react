import { createStart } from '@tanstack/react-start';
import { twilightMiddleware, earlyHintsMiddleware } from '@salla.sa/twilight-theme-engine/tanstack';

export const startInstance = createStart(() => {
  return {
    requestMiddleware: [twilightMiddleware(), earlyHintsMiddleware()],
  };
});
