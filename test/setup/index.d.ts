import 'vitest';
import { values } from '../../src';

interface ValueMatchers<R> {
	/**
	 * AiScriptの値が等しいことを確認する。
	 * 対象の値に付与された属性は無視され、比較されない。
	 */
	toEqualValueOf: (expected: values.Value) => R
}

declare module 'vitest' {
	interface Matchers<T = any> extends ValueMatchers<T> {}
}
