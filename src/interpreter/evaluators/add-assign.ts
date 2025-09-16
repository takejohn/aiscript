import { NULL, NUM } from '../value.js';
import { isControl, type Control } from '../control.js';
import { assertNumber } from '../util.js';
import { evaluateReferenceAsync, evaluateReferenceSync } from '../evaluate-reference.js';
import type { Ast } from '../../index.js';
import type { Value } from '../value.js';
import type { Scope } from '../scope.js';
import type { AsyncEvaluatorContext, SyncEvaluatorContext } from '../context.js';
import type { CallInfo, Evaluator } from '../types.js';

export const AddAssignEvaluator: Evaluator<Ast.AddAssign> = {
	async evalAsync(context: AsyncEvaluatorContext, node: Ast.AddAssign, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		const target = await evaluateReferenceAsync(context, node.dest, scope, callStack);
		if (isControl(target)) {
			return target;
		}
		const v = await context.eval(node.expr, scope, callStack);
		if (isControl(v)) {
			return v;
		}
		assertNumber(v);
		const targetValue = target.get();
		assertNumber(targetValue);

		target.set(NUM(targetValue.value + v.value));
		return NULL;
	},

	evalSync(context: SyncEvaluatorContext, node: Ast.AddAssign, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		const target = evaluateReferenceSync(context, node.dest, scope, callStack);
		if (isControl(target)) {
			return target;
		}
		const v = context.eval(node.expr, scope, callStack);
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
