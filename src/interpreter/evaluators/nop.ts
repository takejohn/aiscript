import { NULL } from '../value.js';
import type { Ast } from '../../index.js';
import type { Control } from '../control.js';
import type { Value } from '../value.js';
import type { Evaluator } from '../types.js';

export const NopEvaluator: Evaluator<Ast.Node> = {
	async evalAsync(): Promise<Value | Control> {
		return NULL;
	},

	evalSync(): Value | Control {
		return NULL;
	},
};
