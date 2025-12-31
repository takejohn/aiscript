import { isControl, type Control } from '../../control.js';
import { assertNumber } from '../../util.js';
import { NUM } from '../../value.js';
import type { Scope } from '../../scope.js';
import type * as Ast from '../../../node.js';
import type { Value } from '../../value.js';
import type { AsyncEvaluationContext, CallInfo, Evaluator, SyncEvaluationContext } from '../context.js';

export const minusEvaluator: Evaluator<Ast.Node & { type: 'minus' }> = {
	async evalAsync(context: AsyncEvaluationContext, node: Ast.Node & { type: 'minus' }, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		const v = await context._eval(node.expr, scope, callStack);
		if (isControl(v)) {
			return v;
		}
		assertNumber(v);
		return NUM(-v.value);
	},

	evalSync(context: SyncEvaluationContext, node: Ast.Node & { type: 'minus' }, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		const v = context._evalSync(node.expr, scope, callStack);
		if (isControl(v)) {
			return v;
		}
		assertNumber(v);
		return NUM(-v.value);
	},
};
