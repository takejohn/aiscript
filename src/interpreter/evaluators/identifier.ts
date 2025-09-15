import { autobind } from '../../utils/mini-autobind.js';
import type { Ast } from '../../index.js';
import type { Control } from '../control.js';
import type { Value } from '../value.js';
import type { Scope } from '../scope.js';
import type { AsyncEvaluatorContext, SyncEvaluatorContext } from '../context.js';
import type { Evaluator } from '../types.js';

export class IdentifierEvaluator implements Evaluator<Ast.Identifier> {
	@autobind
	async evalAsync(context: AsyncEvaluatorContext, node: Ast.Identifier, scope: Scope): Promise<Value | Control> {
		return scope.get(node.name);
	}

	@autobind
	evalSync(context: SyncEvaluatorContext, node: Ast.Identifier, scope: Scope): Value | Control {
		return scope.get(node.name);
	}
};
