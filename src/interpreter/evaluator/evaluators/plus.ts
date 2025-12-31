import { isControl, type Control } from '../../control.js';
import { assertNumber } from '../../util.js';
import type { Scope } from '../../scope.js';
import type * as Ast from '../../../node.js';
import type { Value } from '../../value.js';
import type { AsyncEvaluationContext, CallInfo, Evaluator, SyncEvaluationContext } from '../context.js';

export const plusEvaluator: Evaluator<Ast.Node & { type: 'plus' }> = {
	async evalAsync(context: AsyncEvaluationContext, node: Ast.Node & { type: 'plus' }, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		const v = await context._eval(node.expr, scope, callStack);
		if (isControl(v)) {
			return v;
		}
		assertNumber(v);
		return v;
	},

	evalSync(context: SyncEvaluationContext, node: Ast.Node & { type: 'plus' }, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		const v = context._evalSync(node.expr, scope, callStack);
		if (isControl(v)) {
			return v;
		}
		assertNumber(v);
		return v;
	},
};
