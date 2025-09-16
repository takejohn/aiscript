import { BREAK, isControl, type Control } from '../control.js';
import type { Ast } from '../../index.js';
import type { Value } from '../value.js';
import type { Scope } from '../scope.js';
import type { AsyncEvaluatorContext, SyncEvaluatorContext } from '../context.js';
import type { CallInfo, Evaluator } from '../types.js';

export const BreakEvaluator: Evaluator<Ast.Break> = {
	async evalAsync(context: AsyncEvaluatorContext, node: Ast.Break, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		let val: Value | undefined;
		if (node.expr != null) {
			const valueOrControl = await context.eval(node.expr, scope, callStack);
			if (isControl(valueOrControl)) {
				return valueOrControl;
			}
			val = valueOrControl;
		}
		context.log('block:break', { scope: scope.name });
		return BREAK(node.label, val);
	},

	evalSync(context: SyncEvaluatorContext, node: Ast.Break, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		let val: Value | undefined;
		if (node.expr != null) {
			const valueOrControl = context.eval(node.expr, scope, callStack);
			if (isControl(valueOrControl)) {
				return valueOrControl;
			}
			val = valueOrControl;
		}
		context.log('block:break', { scope: scope.name });
		return BREAK(node.label, val);
	},
};
