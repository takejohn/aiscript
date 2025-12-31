import type { Value } from './value.js';
import type { Variable } from './variable.js';

export type LogObject = {
	scope?: string;
	var?: string;
	val?: Value | Variable;
};
