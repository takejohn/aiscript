import { STR } from '../value.js';
import { isControl, type Control } from '../control.js';
import { reprValue } from '../util.js';
import type { Ast } from '../../index.js';
import type { Value } from '../value.js';
import type { Scope } from '../scope.js';
import type { AsyncEvaluatorContext, SyncEvaluatorContext } from '../context.js';
import type { CallInfo, Evaluator } from '../types.js';

export const TmplEvaluator: Evaluator<Ast.Tmpl> = {
	async evalAsync(context: AsyncEvaluatorContext, node: Ast.Tmpl, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		let str = '';
		for (const x of node.tmpl) {
			if (typeof x === 'string') {
				str += x;
			} else {
				const v = await context.eval(x, scope, callStack);
				if (isControl(v)) {
					return v;
				}
				str += reprValue(v);
			}
		}
		return STR(str);
	},

	evalSync(context: SyncEvaluatorContext, node: Ast.Tmpl, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		let str = '';
		for (const x of node.tmpl) {
			if (typeof x === 'string') {
				str += x;
			} else {
				const v = context.eval(x, scope, callStack);
				if (isControl(v)) {
					return v;
				}
				str += reprValue(v);
			}
		}
		return STR(str);
	},
};
