import { type Control } from '../control.js';
import type { Scope } from '../scope.js';
import type * as Ast from '../../node.js';
import type { Value } from '../value.js';
import type { AsyncEvaluationContext, CallInfo, Evaluator, SyncEvaluationContext } from '../evaluation.js';

export const neqEvaluator: Evaluator<Ast.Node & { type: 'neq' }> = {
	async evalAsync(context: AsyncEvaluationContext, node: Ast.Node & { type: 'neq' }, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		return context._evalBinaryOperation('Core:neq', node.left, node.right, scope, callStack);
	},

	evalSync(context: SyncEvaluationContext, node: Ast.Node & { type: 'neq' }, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		return context._evalBinaryOperationSync('Core:neq', node.left, node.right, scope, callStack);
	},
};
