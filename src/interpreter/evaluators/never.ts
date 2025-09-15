import type { Ast } from '../../index.js';
import type { Evaluator } from '../types.js';

export class NeverEvaluator implements Evaluator<Ast.Node> {
	async evalAsync(): Promise<never> {
		throw new Error('invalid node type');
	}

	evalSync(): never {
		throw new Error('invalid node type');
	}
};
