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

export const callEvaluator: Evaluator<Ast.Node & { type: 'call' }> = {
	async evalAsync(context: AsyncEvaluationContext, node: Ast.Node & { type: 'call' }, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		const callee = await context._eval(node.target, scope, callStack);
		if (isControl(callee)) {
			return callee;
		}
		assertFunction(callee);
		const args = [];
		for (const expr of node.args) {
			const arg = await context._eval(expr, scope, callStack);
			if (isControl(arg)) {
				return arg;
			}
			args.push(arg);
		}
		return context._fn(callee, args, callStack, node.loc.start);
	},

	evalSync(context: SyncEvaluationContext, node: Ast.Node & { type: 'call' }, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		const callee = context._evalSync(node.target, scope, callStack);
		if (isControl(callee)) {
			return callee;
		}
		assertFunction(callee);
		const args = [];
		for (const expr of node.args) {
			const arg = context._evalSync(expr, scope, callStack);
			if (isControl(arg)) {
				return arg;
			}
			args.push(arg);
		}
		return context._fnSync(callee, args, callStack, node.loc.start);
	},
};
