import { isControl, type Control } from '../control.js';
import { NULL, FN } from '../value.js';
import type { Scope } from '../scope.js';
import type * as Ast from '../../node.js';
import type { Value, VUserFn } from '../value.js';
import type { AsyncEvaluationContext, CallInfo, Evaluator, SyncEvaluationContext } from '../evaluation.js';

export const fnEvaluator: Evaluator<Ast.Node & { type: 'fn' }> = {
	async evalAsync(context: AsyncEvaluationContext, node: Ast.Node & { type: 'fn' }, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		const params = await Promise.all(node.params.map(async (param) => {
			return {
				dest: param.dest,
				default:
					param.default ? await context._eval(param.default, scope, callStack) :
					param.optional ? NULL :
					undefined,
				// type: (TODO)
			};
		}));
		const control = params
			.map((param) => param.default)
			.filter((value) => value != null)
			.find(isControl);
		if (control != null) {
			return control;
		}
		return FN(
			params as VUserFn['params'],
			node.children,
			scope,
		);
	},

	evalSync(context: SyncEvaluationContext, node: Ast.Node & { type: 'fn' }, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		const params = node.params.map((param) => {
			return {
				dest: param.dest,
				default:
					param.default ? context._evalSync(param.default, scope, callStack) :
					param.optional ? NULL :
					undefined,
				// type: (TODO)
			};
		});
		const control = params
			.map((param) => param.default)
			.filter((value) => value != null)
			.find(isControl);
		if (control != null) {
			return control;
		}
		return FN(
			params as VUserFn['params'],
			node.children,
			scope,
		);
	},
};
