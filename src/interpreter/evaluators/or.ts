import { isControl, type Control } from '../control.js';
import { assertBoolean } from '../util.js';
import type { Ast } from '../../index.js';
import type { Value } from '../value.js';
import type { Scope } from '../scope.js';
import type { AsyncEvaluatorContext, SyncEvaluatorContext } from '../context.js';
import type { CallInfo, Evaluator } from '../types.js';

export const OrEvaluator: Evaluator<Ast.Or> = {
	async evalAsync(context: AsyncEvaluatorContext, node: Ast.Or, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		const leftValue = await context.eval(node.left, scope, callStack);
		if (isControl(leftValue)) {
			return leftValue;
		}
		assertBoolean(leftValue);

		if (leftValue.value) {
			return leftValue;
		} else {
			const rightValue = await context.eval(node.right, scope, callStack);
			if (isControl(rightValue)) {
				return rightValue;
			}
			assertBoolean(rightValue);
			return rightValue;
		}
	},

	evalSync(context: SyncEvaluatorContext, node: Ast.Or, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		const leftValue = context.eval(node.left, scope, callStack);
		if (isControl(leftValue)) {
			return leftValue;
		}
		assertBoolean(leftValue);

		if (leftValue.value) {
			return leftValue;
		} else {
			const rightValue = context.eval(node.right, scope, callStack);
			if (isControl(rightValue)) {
				return rightValue;
			}
			assertBoolean(rightValue);
			return rightValue;
		}
	},
};
