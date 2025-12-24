import { isControl, type Control } from '../control.js';
import { ARR } from '../value.js';
import type { Scope } from '../scope.js';
import type * as Ast from '../../node.js';
import type { Value } from '../value.js';
import type { AsyncEvaluationContext, CallInfo, Evaluator, SyncEvaluationContext } from '../evaluation.js';

export const arrEvaluator: Evaluator<Ast.Node & { type: 'arr' }> = {
	async evalAsync(context: AsyncEvaluationContext, node: Ast.Node & { type: 'arr' }, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		const value = [];
		for (const item of node.value) {
			const valueItem = await context._eval(item, scope, callStack);
			if (isControl(valueItem)) {
				return valueItem;
			}
			value.push(valueItem);
		}
		return ARR(value);
	},

	evalSync(context: SyncEvaluationContext, node: Ast.Node & { type: 'arr' }, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		const value = [];
		for (const item of node.value) {
			const valueItem = context._evalSync(item, scope, callStack);
			if (isControl(valueItem)) {
				return valueItem;
			}
			value.push(valueItem);
		}
		return ARR(value);
	},
};
