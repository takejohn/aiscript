import { type Control } from '../../control.js';
import { BOOL } from '../../value.js';
import type { Scope } from '../../scope.js';
import type * as Ast from '../../../node.js';
import type { Value } from '../../value.js';
import type { AsyncEvaluationContext, CallInfo, Evaluator, SyncEvaluationContext } from '../context.js';

export const existsEvaluator: Evaluator<Ast.Node & { type: 'exists' }> = {
	async evalAsync(context: AsyncEvaluationContext, node: Ast.Node & { type: 'exists' }, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		return BOOL(scope.exists(node.identifier.name));
	},

	evalSync(context: SyncEvaluationContext, node: Ast.Node & { type: 'exists' }, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		return BOOL(scope.exists(node.identifier.name));
	},
};
