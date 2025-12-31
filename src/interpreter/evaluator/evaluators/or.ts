import { isControl, type Control } from '../../control.js';
import { assertBoolean } from '../../util.js';
import type { Scope } from '../../scope.js';
import type * as Ast from '../../../node.js';
import type { Value } from '../../value.js';
import type { AsyncEvaluationContext, CallInfo, Evaluator, SyncEvaluationContext } from '../context.js';

export const orEvaluator: Evaluator<Ast.Node & { type: 'or' }> = {
	async evalAsync(context: AsyncEvaluationContext, node: Ast.Node & { type: 'or' }, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		const leftValue = await context._eval(node.left, scope, callStack);
		if (isControl(leftValue)) {
			return leftValue;
		}
		assertBoolean(leftValue);

		if (leftValue.value) {
			return leftValue;
		} else {
			const rightValue = await context._eval(node.right, scope, callStack);
			if (isControl(rightValue)) {
				return rightValue;
			}
			assertBoolean(rightValue);
			return rightValue;
		}
	},

	evalSync(context: SyncEvaluationContext, node: Ast.Node & { type: 'or' }, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		const leftValue = context._evalSync(node.left, scope, callStack);
		if (isControl(leftValue)) {
			return leftValue;
		}
		assertBoolean(leftValue);

		if (leftValue.value) {
			return leftValue;
		} else {
			const rightValue = context._evalSync(node.right, scope, callStack);
			if (isControl(rightValue)) {
				return rightValue;
			}
			assertBoolean(rightValue);
			return rightValue;
		}
	},
};
