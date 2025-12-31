import { type Control } from '../../control.js';
import { NUM } from '../../value.js';
import type { Scope } from '../../scope.js';
import type * as Ast from '../../../node.js';
import type { Value } from '../../value.js';
import type { AsyncEvaluationContext, CallInfo, Evaluator, SyncEvaluationContext } from '../context.js';

export const numEvaluator: Evaluator<Ast.Node & { type: 'num' }> = {
	async evalAsync(context: AsyncEvaluationContext, node: Ast.Node & { type: 'num' }, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		return NUM(node.value);
	},

	evalSync(context: SyncEvaluationContext, node: Ast.Node & { type: 'num' }, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		return NUM(node.value);
	},
};
