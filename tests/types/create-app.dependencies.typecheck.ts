import { createApp } from '../../server/app';

// @ts-expect-error createApp requires all dependencies
createApp();
// @ts-expect-error database is required
createApp({ evidenceRoot: 'test-results' });
// @ts-expect-error evidenceRoot is required
createApp({ database: {} as never });
