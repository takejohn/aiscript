import { type Control } from '../control.js';
import type { Scope } from '../scope.js';
import type * as Ast from '../../node.js';
import type { Value } from '../value.js';
import type { AsyncEvaluationContext, CallInfo, Evaluator, SyncEvaluationContext } from '../evaluation.js';

export const identifierEvaluator: Evaluator<Ast.Node & { type: 'identifier' }> = {
	async evalAsync(context: AsyncEvaluationContext, node: Ast.Node & { type: 'identifier' }, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		return scope.get(node.name);
	},

	evalSync(context: SyncEvaluationContext, node: Ast.Node & { type: 'identifier' }, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		return scope.get(node.name);
	},
};
