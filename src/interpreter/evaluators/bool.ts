import { type Control } from '../control.js';
import { BOOL } from '../value.js';
import type { Scope } from '../scope.js';
import type * as Ast from '../../node.js';
import type { Value } from '../value.js';
import type { AsyncEvaluationContext, CallInfo, Evaluator, SyncEvaluationContext } from '../evaluation.js';

export const boolEvaluator: Evaluator<Ast.Node & { type: 'bool' }> = {
	async evalAsync(context: AsyncEvaluationContext, node: Ast.Node & { type: 'bool' }, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		return BOOL(node.value);
	},

	evalSync(context: SyncEvaluationContext, node: Ast.Node & { type: 'bool' }, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		return BOOL(node.value);
	},
};
