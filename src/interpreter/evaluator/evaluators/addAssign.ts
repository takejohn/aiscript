import { isControl, type Control } from '../../control.js';
import { assertNumber } from '../../util.js';
import { NULL, NUM } from '../../value.js';
import type { Scope } from '../../scope.js';
import type * as Ast from '../../../node.js';
import type { Value } from '../../value.js';
import type { AsyncEvaluationContext, CallInfo, Evaluator, SyncEvaluationContext } from '../context.js';

export const addAssignEvaluator: Evaluator<Ast.Node & { type: 'addAssign' }> = {
	async evalAsync(context: AsyncEvaluationContext, node: Ast.Node & { type: 'addAssign' }, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		const target = await context.getReference(node.dest, scope, callStack);
		if (isControl(target)) {
			return target;
		}
		const v = await context._eval(node.expr, scope, callStack);
		if (isControl(v)) {
			return v;
		}
		assertNumber(v);
		const targetValue = target.get();
		assertNumber(targetValue);

		target.set(NUM(targetValue.value + v.value));
		return NULL;
	},

	evalSync(context: SyncEvaluationContext, node: Ast.Node & { type: 'addAssign' }, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		const target = context.getReferenceSync(node.dest, scope, callStack);
		if (isControl(target)) {
			return target;
		}
		const v = context._evalSync(node.expr, scope, callStack);
		if (isControl(v)) {
			return v;
		}
		assertNumber(v);
		const targetValue = target.get();
		assertNumber(targetValue);

		target.set(NUM(targetValue.value + v.value));
		return NULL;
	},
};
