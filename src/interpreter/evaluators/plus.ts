import { isControl, type Control } from '../control.js';
import { assertNumber } from '../util.js';
import type { Ast } from '../../index.js';
import type { Value } from '../value.js';
import type { Scope } from '../scope.js';
import type { CallInfo, Evaluator, AsyncEvaluatorContext, SyncEvaluatorContext } from '../context.js';

export class PlusEvaluator implements Evaluator<Ast.Plus> {
	async evalAsync(context: AsyncEvaluatorContext, node: Ast.Plus, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		const v = await context.eval(node.expr, scope, callStack);
		if (isControl(v)) {
			return v;
		}
		assertNumber(v);
		return v;
	}

	evalSync(context: SyncEvaluatorContext, node: Ast.Plus, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		const v = context.eval(node.expr, scope, callStack);
		if (isControl(v)) {
			return v;
		}
		assertNumber(v);
		return v;
	}
};
