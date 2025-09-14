import { BOOL } from '../value.js';
import { isControl, type Control } from '../control.js';
import { assertBoolean } from '../util.js';
import type { Ast } from '../../index.js';
import type { Value } from '../value.js';
import type { Scope } from '../scope.js';
import type { CallInfo, Evaluator, AsyncEvaluatorContext, SyncEvaluatorContext } from '../context.js';

export class NotEvaluator implements Evaluator<Ast.Not> {
	async evalAsync(context: AsyncEvaluatorContext, node: Ast.Not, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		const v = await context.eval(node.expr, scope, callStack);
		if (isControl(v)) {
			return v;
		}
		assertBoolean(v);
		return BOOL(!v.value);
	}

	evalSync(context: SyncEvaluatorContext, node: Ast.Not, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		const v = context.eval(node.expr, scope, callStack);
		if (isControl(v)) {
			return v;
		}
		assertBoolean(v);
		return BOOL(!v.value);
	}
};
