import { CONTINUE, type Control } from '../control.js';
import type { Scope } from '../scope.js';
import type * as Ast from '../../node.js';
import type { Value } from '../value.js';
import type { AsyncEvaluationContext, CallInfo, Evaluator, SyncEvaluationContext } from '../evaluation.js';

export const continueEvaluator: Evaluator<Ast.Node & { type: 'continue' }> = {
	async evalAsync(context: AsyncEvaluationContext, node: Ast.Node & { type: 'continue' }, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		context.log('block:continue', { scope: scope.name });
		return CONTINUE(node.label);
	},

	evalSync(context: SyncEvaluationContext, node: Ast.Node & { type: 'continue' }, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		context.log('block:continue', { scope: scope.name });
		return CONTINUE(node.label);
	},
};
