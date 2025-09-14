import type { Ast } from '../../index.js';
import type { Control } from '../control.js';
import type { Value } from '../value.js';
import type { Scope } from '../scope.js';
import type { Evaluator, AsyncEvaluatorContext, SyncEvaluatorContext } from '../context.js';

export class IdentifierEvaluator implements Evaluator<Ast.Identifier> {
	async evalAsync(context: AsyncEvaluatorContext, node: Ast.Identifier, scope: Scope): Promise<Value | Control> {
		return scope.get(node.name);
	}

	evalSync(context: SyncEvaluatorContext, node: Ast.Identifier, scope: Scope): Value | Control {
		return scope.get(node.name);
	}
};
