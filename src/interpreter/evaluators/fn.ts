import { FN, NULL } from '../value.js';
import { isControl, type Control } from '../control.js';
import { autobind } from '../../utils/mini-autobind.js';
import type { Ast } from '../../index.js';
import type { Value, VUserFn } from '../value.js';
import type { Scope } from '../scope.js';
import type { AsyncEvaluatorContext, SyncEvaluatorContext } from '../context.js';
import type { CallInfo, Evaluator } from '../types.js';

export class FnEvaluator implements Evaluator<Ast.Fn> {
	@autobind
	async evalAsync(context: AsyncEvaluatorContext, node: Ast.Fn, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		const params = await Promise.all(node.params.map(async (param) => {
			return {
				dest: param.dest,
				default:
					param.default ? await context.eval(param.default, scope, callStack) :
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
	}

	@autobind
	evalSync(context: SyncEvaluatorContext, node: Ast.Fn, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		const params = node.params.map((param) => {
			return {
				dest: param.dest,
				default:
					param.default ? context.eval(param.default, scope, callStack) :
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
	}
};
