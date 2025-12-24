import { type Control } from '../control.js';
import type { Scope } from '../scope.js';
import type * as Ast from '../../node.js';
import type { Value } from '../value.js';
import type { AsyncEvaluationContext, CallInfo, Evaluator, SyncEvaluationContext } from '../evaluation.js';

export const eqEvaluator: Evaluator<Ast.Node & { type: 'eq' }> = {
	async evalAsync(context: AsyncEvaluationContext, node: Ast.Node & { type: 'eq' }, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		return context._evalBinaryOperation('Core:eq', node.left, node.right, scope, callStack);
	},

	evalSync(context: SyncEvaluationContext, node: Ast.Node & { type: 'eq' }, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		return context._evalBinaryOperationSync('Core:eq', node.left, node.right, scope, callStack);
	},
};
