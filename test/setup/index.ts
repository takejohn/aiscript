import { expect } from 'vitest';
import { utils, values } from '../../src/index.js';

const pickTypeAndValue = (value: object): { type?: unknown, value?: unknown } => {
	const result: { type?: unknown, value?: unknown } = {};
	if ('type' in value) {
		result.type = value.type;
	}
	if ('value' in value) {
		result.value = value.value;
	}
	return result;
}

expect.extend({
	toEqualValueOf(received: unknown, expected: values.Value) {
		const expectedValue = pickTypeAndValue(expected);
		if (typeof received === 'object' && received !== null) {
			const receivedValue = pickTypeAndValue(received);
			return {
				pass: this.equals(receivedValue, expectedValue),
				message: () => `expected ${utils.valToString(receivedValue as values.Value)} to equal AiScript value ${utils.valToString(expected)}`,
				actual: receivedValue,
				expected: expectedValue,
			};
		} else {
			return {
				pass: false,
				message: () => `expected ${this.utils.stringify(received)} to equal AiScript value ${utils.valToString(expected)}`,
				actual: received,
				expected: expectedValue,
			};
		}
	}
});
