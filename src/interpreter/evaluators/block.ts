import { type Control, unWrapLabeledBreak } from '../control.js';
import type { Scope } from '../scope.js';
import type * as Ast from '../../node.js';
import type { Value } from '../value.js';
import type { AsyncEvaluationContext, CallInfo, Evaluator, SyncEvaluationContext } from '../evaluation.js';

export const blockEvaluator: Evaluator<Ast.Node & { type: 'block' }> = {
	async evalAsync(context: AsyncEvaluationContext, node: Ast.Node & { type: 'block' }, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		return unWrapLabeledBreak(await context._run(node.statements, scope.createChildScope(), callStack), node.label);
	},

	evalSync(context: SyncEvaluationContext, node: Ast.Node & { type: 'block' }, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		return unWrapLabeledBreak(context._runSync(node.statements, scope.createChildScope(), callStack), node.label);
	},
};
