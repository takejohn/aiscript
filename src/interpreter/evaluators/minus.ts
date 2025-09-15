import { NUM } from '../value.js';
import { isControl, type Control } from '../control.js';
import { assertNumber } from '../util.js';
import type { Ast } from '../../index.js';
import type { Value } from '../value.js';
import type { Scope } from '../scope.js';
import type { AsyncEvaluatorContext, SyncEvaluatorContext } from '../context.js';
import type { CallInfo, Evaluator } from '../types.js';

export class MinusEvaluator implements Evaluator<Ast.Minus> {
	async evalAsync(context: AsyncEvaluatorContext, node: Ast.Minus, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		const v = await context.eval(node.expr, scope, callStack);
		if (isControl(v)) {
			return v;
		}
		assertNumber(v);
		return NUM(-v.value);
	}

	evalSync(context: SyncEvaluatorContext, node: Ast.Minus, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		const v = context.eval(node.expr, scope, callStack);
		if (isControl(v)) {
			return v;
		}
		assertNumber(v);
		return NUM(-v.value);
	}
};
