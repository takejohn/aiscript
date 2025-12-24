import { type Control } from '../control.js';
import type { Scope } from '../scope.js';
import type * as Ast from '../../node.js';
import type { Value } from '../value.js';
import type { AsyncEvaluationContext, CallInfo, Evaluator, SyncEvaluationContext } from '../evaluation.js';

export const namedTypeSourceFnTypeSourceUnionTypeSourceAttrEvaluator: Evaluator<Ast.Node & { type: 'namedTypeSource' | 'fnTypeSource' | 'unionTypeSource' | 'attr' }> = {
	async evalAsync(context: AsyncEvaluationContext, node: Ast.Node & { type: 'namedTypeSource' | 'fnTypeSource' | 'unionTypeSource' | 'attr' }, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		throw new Error('invalid node type');
	},

	evalSync(context: SyncEvaluationContext, node: Ast.Node & { type: 'namedTypeSource' | 'fnTypeSource' | 'unionTypeSource' | 'attr' }, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		throw new Error('invalid node type');
	},
};
