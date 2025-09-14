import { NULL } from '../value.js';
import { isControl, type Control } from '../control.js';
import type { Ast } from '../../index.js';
import type { Value } from '../value.js';
import type { Scope } from '../scope.js';
import type { CallInfo, Evaluator, AsyncEvaluatorContext, SyncEvaluatorContext } from '../context.js';

export class AssignEvaluator implements Evaluator<Ast.Assign> {
	async evalAsync(context: AsyncEvaluatorContext, node: Ast.Assign, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		const target = await context.getReference(node.dest, scope, callStack);
		if (isControl(target)) {
			return target;
		}
		const v = await context.eval(node.expr, scope, callStack);
		if (isControl(v)) {
			return v;
		}

		target.set(v);

		return NULL;
	}

	evalSync(context: SyncEvaluatorContext, node: Ast.Assign, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		const target = context.getReference(node.dest, scope, callStack);
		if (isControl(target)) {
			return target;
		}
		const v = context.eval(node.expr, scope, callStack);
		if (isControl(v)) {
			return v;
		}

		target.set(v);

		return NULL;
	}
};
