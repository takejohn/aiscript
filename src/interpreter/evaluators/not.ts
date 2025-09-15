import { BOOL } from '../value.js';
import { isControl, type Control } from '../control.js';
import { assertBoolean } from '../util.js';
import { autobind } from '../../utils/mini-autobind.js';
import type { Ast } from '../../index.js';
import type { Value } from '../value.js';
import type { Scope } from '../scope.js';
import type { AsyncEvaluatorContext, SyncEvaluatorContext } from '../context.js';
import type { CallInfo, Evaluator } from '../types.js';

export class NotEvaluator implements Evaluator<Ast.Not> {
	@autobind
	async evalAsync(context: AsyncEvaluatorContext, node: Ast.Not, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		const v = await context.eval(node.expr, scope, callStack);
		if (isControl(v)) {
			return v;
		}
		assertBoolean(v);
		return BOOL(!v.value);
	}

	@autobind
	evalSync(context: SyncEvaluatorContext, node: Ast.Not, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		const v = context.eval(node.expr, scope, callStack);
		if (isControl(v)) {
			return v;
		}
		assertBoolean(v);
		return BOOL(!v.value);
	}
};
