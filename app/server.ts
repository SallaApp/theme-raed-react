import { withThemeSentry } from '@salla.sa/twilight-theme-engine/sentry/server';
import handler from '@tanstack/react-start/server-entry';

export default withThemeSentry(handler, 'raed');
