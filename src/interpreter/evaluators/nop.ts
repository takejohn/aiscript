import { NULL } from '../value.js';
import type { Ast } from '../../index.js';
import type { Control } from '../control.js';
import type { Value } from '../value.js';
import type { Evaluator } from '../context.js';

export class NopEvaluator implements Evaluator<Ast.Node> {
	async evalAsync(): Promise<Value | Control> {
		return NULL;
	}

	evalSync(): Value | Control {
		return NULL;
	}
};
