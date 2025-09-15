import { NULL } from '../value.js';
import { autobind } from '../../utils/mini-autobind.js';
import type { Ast } from '../../index.js';
import type { Control } from '../control.js';
import type { Value } from '../value.js';
import type { Evaluator } from '../types.js';

export class NopEvaluator implements Evaluator<Ast.Node> {
	@autobind
	async evalAsync(): Promise<Value | Control> {
		return NULL;
	}

	@autobind
	evalSync(): Value | Control {
		return NULL;
	}
};
