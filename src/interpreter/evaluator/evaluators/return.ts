import { RETURN, isControl, type Control } from '../../control.js';
import type { Scope } from '../../scope.js';
import type * as Ast from '../../../node.js';
import type { Value } from '../../value.js';
import type { AsyncEvaluationContext, CallInfo, Evaluator, SyncEvaluationContext } from '../context.js';

export const returnEvaluator: Evaluator<Ast.Node & { type: 'return' }> = {
	async evalAsync(context: AsyncEvaluationContext, node: Ast.Node & { type: 'return' }, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		const val = await context._eval(node.expr, scope, callStack);
		if (isControl(val)) {
			return val;
		}
		context.log('block:return', { scope: scope.name, val: val });
		return RETURN(val);
	},

	evalSync(context: SyncEvaluationContext, node: Ast.Node & { type: 'return' }, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		const val = context._evalSync(node.expr, scope, callStack);
		if (isControl(val)) {
			return val;
		}
		context.log('block:return', { scope: scope.name, val: val });
		return RETURN(val);
	},
};
