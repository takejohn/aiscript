import { type Control } from '../../control.js';
import { NULL } from '../../value.js';
import type { Scope } from '../../scope.js';
import type * as Ast from '../../../node.js';
import type { Value } from '../../value.js';
import type { AsyncEvaluationContext, CallInfo, Evaluator, SyncEvaluationContext } from '../context.js';

export const metaEvaluator: Evaluator<Ast.Node & { type: 'meta' }> = {
	async evalAsync(context: AsyncEvaluationContext, node: Ast.Node & { type: 'meta' }, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		return NULL; // nop
	},

	evalSync(context: SyncEvaluationContext, node: Ast.Node & { type: 'meta' }, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		return NULL; // nop
	},
};
