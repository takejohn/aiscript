import { type Control } from '../control.js';
import { NULL } from '../value.js';
import type { Scope } from '../scope.js';
import type * as Ast from '../../node.js';
import type { Value } from '../value.js';
import type { AsyncEvaluationContext, CallInfo, Evaluator, SyncEvaluationContext } from '../evaluation.js';

export const loopEvaluator: Evaluator<Ast.Node & { type: 'loop' }> = {
	async evalAsync(context: AsyncEvaluationContext, node: Ast.Node & { type: 'loop' }, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		// eslint-disable-next-line no-constant-condition
		while (true) {
			const v = await context._run(node.statements, scope.createChildScope(), callStack);
			if (v.type === 'break') {
				if (v.label != null && v.label !== node.label) {
					return v;
				}
				break;
			} else if (v.type === 'continue') {
				if (v.label != null && v.label !== node.label) {
					return v;
				}
			} else if (v.type === 'return') {
				return v;
			}
		}
		return NULL;
	},

	evalSync(context: SyncEvaluationContext, node: Ast.Node & { type: 'loop' }, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		// eslint-disable-next-line no-constant-condition
		while (true) {
			const v = context._runSync(node.statements, scope.createChildScope(), callStack);
			if (v.type === 'break') {
				if (v.label != null && v.label !== node.label) {
					return v;
				}
				break;
			} else if (v.type === 'continue') {
				if (v.label != null && v.label !== node.label) {
					return v;
				}
			} else if (v.type === 'return') {
				return v;
			}
		}
		return NULL;
	},
};
