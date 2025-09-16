import { isControl, RETURN, type Control } from '../control.js';
import type { Ast } from '../../index.js';
import type { Value } from '../value.js';
import type { Scope } from '../scope.js';
import type { AsyncEvaluatorContext, SyncEvaluatorContext } from '../context.js';
import type { CallInfo, Evaluator } from '../types.js';

export const ReturnEvaluator: Evaluator<Ast.Return> = {
	async evalAsync(context: AsyncEvaluatorContext, node: Ast.Return, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		const val = await context.eval(node.expr, scope, callStack);
		if (isControl(val)) {
			return val;
		}
		context.log('block:return', { scope: scope.name, val: val });
		return RETURN(val);
	},

	evalSync(context: SyncEvaluatorContext, node: Ast.Return, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		const val = context.eval(node.expr, scope, callStack);
		if (isControl(val)) {
			return val;
		}
		context.log('block:return', { scope: scope.name, val: val });
		return RETURN(val);
	},
};
