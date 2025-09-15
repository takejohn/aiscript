import { BOOL } from '../value.js';
import { autobind } from '../../utils/mini-autobind.js';
import type { Ast } from '../../index.js';
import type { Control } from '../control.js';
import type { Value } from '../value.js';
import type { Scope } from '../scope.js';
import type { AsyncEvaluatorContext, SyncEvaluatorContext } from '../context.js';
import type { Evaluator } from '../types.js';

export class ExistsEvaluator implements Evaluator<Ast.Exists> {
	@autobind
	async evalAsync(context: AsyncEvaluatorContext, node: Ast.Exists, scope: Scope): Promise<Value | Control> {
		return BOOL(scope.exists(node.identifier.name));
	}

	@autobind
	evalSync(context: SyncEvaluatorContext, node: Ast.Exists, scope: Scope): Value | Control {
		return BOOL(scope.exists(node.identifier.name));
	}
};
