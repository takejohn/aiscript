import { BREAK, isControl, type Control } from '../control.js';
import type { Scope } from '../scope.js';
import type * as Ast from '../../node.js';
import type { Value } from '../value.js';
import type { AsyncEvaluationContext, CallInfo, Evaluator, SyncEvaluationContext } from '../evaluation.js';

export const breakEvaluator: Evaluator<Ast.Node & { type: 'break' }> = {
	async evalAsync(context: AsyncEvaluationContext, node: Ast.Node & { type: 'break' }, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		let val: Value | undefined;
		if (node.expr != null) {
			const valueOrControl = await context._eval(node.expr, scope, callStack);
			if (isControl(valueOrControl)) {
				return valueOrControl;
			}
			val = valueOrControl;
		}
		context.log('block:break', { scope: scope.name });
		return BREAK(node.label, val);
	},

	evalSync(context: SyncEvaluationContext, node: Ast.Node & { type: 'break' }, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		let val: Value | undefined;
		if (node.expr != null) {
			const valueOrControl = context._evalSync(node.expr, scope, callStack);
			if (isControl(valueOrControl)) {
				return valueOrControl;
			}
			val = valueOrControl;
		}
		context.log('block:break', { scope: scope.name });
		return BREAK(node.label, val);
	},
};
