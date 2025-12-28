import { isControl, type Control } from '../../control.js';
import { isObject } from '../../util.js';
import { NULL } from '../../value.js';
import { getPrimProp } from '../../primitive-props.js';
import type { Scope } from '../../scope.js';
import type * as Ast from '../../../node.js';
import type { Value } from '../../value.js';
import type { AsyncEvaluationContext, CallInfo, Evaluator, SyncEvaluationContext } from '../evaluation.js';

export const propEvaluator: Evaluator<Ast.Node & { type: 'prop' }> = {
	async evalAsync(context: AsyncEvaluationContext, node: Ast.Node & { type: 'prop' }, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		const target = await context._eval(node.target, scope, callStack);
		if (isControl(target)) {
			return target;
		}
		if (isObject(target)) {
			if (target.value.has(node.name)) {
				return target.value.get(node.name)!;
			} else {
				return NULL;
			}
		} else {
			return getPrimProp(target, node.name);
		}
	},

	evalSync(context: SyncEvaluationContext, node: Ast.Node & { type: 'prop' }, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		const target = context._evalSync(node.target, scope, callStack);
		if (isControl(target)) {
			return target;
		}
		if (isObject(target)) {
			if (target.value.has(node.name)) {
				return target.value.get(node.name)!;
			} else {
				return NULL;
			}
		} else {
			return getPrimProp(target, node.name);
		}
	},
};
