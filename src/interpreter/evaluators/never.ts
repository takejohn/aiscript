import { autobind } from '../../utils/mini-autobind.js';
import type { Ast } from '../../index.js';
import type { Evaluator } from '../types.js';

export class NeverEvaluator implements Evaluator<Ast.Node> {
	@autobind
	async evalAsync(): Promise<never> {
		throw new Error('invalid node type');
	}

	@autobind
	evalSync(): never {
		throw new Error('invalid node type');
	}
};
