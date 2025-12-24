import { isControl, type Control } from '../control.js';
import { reprValue } from '../util.js';
import { STR } from '../value.js';
import type { Scope } from '../scope.js';
import type * as Ast from '../../node.js';
import type { Value } from '../value.js';
import type { AsyncEvaluationContext, CallInfo, Evaluator, SyncEvaluationContext } from '../evaluation.js';

export const tmplEvaluator: Evaluator<Ast.Node & { type: 'tmpl' }> = {
	async evalAsync(context: AsyncEvaluationContext, node: Ast.Node & { type: 'tmpl' }, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		let str = '';
		for (const x of node.tmpl) {
			if (typeof x === 'string') {
				str += x;
			} else {
				const v = await context._eval(x, scope, callStack);
				if (isControl(v)) {
					return v;
				}
				str += reprValue(v);
			}
		}
		return STR(str);
	},

	evalSync(context: SyncEvaluationContext, node: Ast.Node & { type: 'tmpl' }, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		let str = '';
		for (const x of node.tmpl) {
			if (typeof x === 'string') {
				str += x;
			} else {
				const v = context._evalSync(x, scope, callStack);
				if (isControl(v)) {
					return v;
				}
				str += reprValue(v);
			}
		}
		return STR(str);
	},
};
