import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		coverage: {
			include: ['src'],
		},
		include: ['test/**'],
		exclude: ['test/testutils.ts', 'test/setup/**'],
		setupFiles: ['test/setup/index.ts'],
	},
});
