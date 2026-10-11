import { bootClient } from '@salla.sa/twilight-theme-engine/boot';
import appCssUrl from './styles/app.css?url';

bootClient({ stylesheet: appCssUrl, load: () => import('./hydrate') });
