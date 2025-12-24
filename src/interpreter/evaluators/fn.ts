import { autobind } from '../../utils/mini-autobind.js';
import { AiScriptError, NonAiScriptError, AiScriptNamespaceError, AiScriptIndexOutOfRangeError, AiScriptRuntimeError, AiScriptHostsideError } from '../../error.js';
import * as Ast from '../../node.js';
import { nodeToJs } from '../../utils/node-to-js.js';
import { Scope } from '../scope.js';
import { std } from '../lib/std.js';
import { RETURN, unWrapRet, BREAK, CONTINUE, assertValue, isControl, type Control, unWrapLabeledBreak } from '../control.js';
import { assertNumber, assertString, assertFunction, assertBoolean, assertObject, assertArray, eq, isObject, isArray, expectAny, reprValue, isFunction } from '../util.js';
import { NULL, FN_NATIVE, BOOL, NUM, STR, ARR, OBJ, FN, ERROR } from '../value.js';
import { getPrimProp } from '../primitive-props.js';
import { Variable } from '../variable.js';
import { Reference } from '../reference.js';
import type { JsValue } from '../util.js';
import type { Value, VFn, VUserFn } from '../value.js';
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
