import { isControl, type Control } from '../../control.js';
import { assertFunction } from '../../util.js';
import type { Scope } from '../../scope.js';
import type * as Ast from '../../../node.js';
import type { Value } from '../../value.js';
import type { AsyncEvaluationContext, CallInfo, Evaluator, SyncEvaluationContext } from '../evaluation.js';

export const callEvaluator: Evaluator<Ast.Node & { type: 'call' }> = {
	async evalAsync(context: AsyncEvaluationContext, node: Ast.Node & { type: 'call' }, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		const callee = await context._eval(node.target, scope, callStack);
		if (isControl(callee)) {
			return callee;
		}
		assertFunction(callee);
		const args = [];
		for (const expr of node.args) {
			const arg = await context._eval(expr, scope, callStack);
			if (isControl(arg)) {
				return arg;
			}
			args.push(arg);
		}
		return context._fn(callee, args, callStack, node.loc.start);
	},

	evalSync(context: SyncEvaluationContext, node: Ast.Node & { type: 'call' }, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		const callee = context._evalSync(node.target, scope, callStack);
		if (isControl(callee)) {
			return callee;
		}
		assertFunction(callee);
		const args = [];
		for (const expr of node.args) {
			const arg = context._evalSync(expr, scope, callStack);
			if (isControl(arg)) {
				return arg;
			}
			args.push(arg);
		}
		return context._fnSync(callee, args, callStack, node.loc.start);
	},
};
