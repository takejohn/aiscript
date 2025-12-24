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

export const defEvaluator: Evaluator<Ast.Node & { type: 'def' }> = {
	async evalAsync(context: AsyncEvaluationContext, node: Ast.Node & { type: 'def' }, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		const value = await context._eval(node.expr, scope, callStack);
		if (isControl(value)) {
			return value;
		}
		await context.evalAndSetAttr(node.attr, value, scope, callStack);
		if (
			node.expr.type === 'fn'
			&& node.dest.type === 'identifier'
			&& isFunction(value)
			&& !value.native
		) {
			value.name = node.dest.name;
		}
		context.define(scope, node.dest, value, node.mut);
		return NULL;
	},

	evalSync(context: SyncEvaluationContext, node: Ast.Node & { type: 'def' }, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		const value = context._evalSync(node.expr, scope, callStack);
		if (isControl(value)) {
			return value;
		}
		context.evalAndSetAttrSync(node.attr, value, scope, callStack);
		if (
			node.expr.type === 'fn'
			&& node.dest.type === 'identifier'
			&& isFunction(value)
			&& !value.native
		) {
			value.name = node.dest.name;
		}
		context.define(scope, node.dest, value, node.mut);
		return NULL;
	},
};
