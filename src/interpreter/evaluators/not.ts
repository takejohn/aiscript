import { isControl, type Control } from '../control.js';
import { assertBoolean } from '../util.js';
import { BOOL } from '../value.js';
import type { Scope } from '../scope.js';
import type * as Ast from '../../node.js';
import type { Value } from '../value.js';
import type { AsyncEvaluationContext, CallInfo, Evaluator, SyncEvaluationContext } from '../evaluation.js';

export const notEvaluator: Evaluator<Ast.Node & { type: 'not' }> = {
	async evalAsync(context: AsyncEvaluationContext, node: Ast.Node & { type: 'not' }, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		const v = await context._eval(node.expr, scope, callStack);
		if (isControl(v)) {
			return v;
		}
		assertBoolean(v);
		return BOOL(!v.value);
	},

	evalSync(context: SyncEvaluationContext, node: Ast.Node & { type: 'not' }, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		const v = context._evalSync(node.expr, scope, callStack);
		if (isControl(v)) {
			return v;
		}
		assertBoolean(v);
		return BOOL(!v.value);
	},
};
