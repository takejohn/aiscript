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

export const eachEvaluator: Evaluator<Ast.Node & { type: 'each' }> = {
	async evalAsync(context: AsyncEvaluationContext, node: Ast.Node & { type: 'each' }, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		const items = await context._eval(node.items, scope, callStack);
		if (isControl(items)) {
			return items;
		}
		assertArray(items);
		for (const item of items.value) {
			const eachScope = scope.createChildScope();
			context.define(eachScope, node.var, item, false);
			const v = await context._eval(node.for, eachScope, callStack);
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

	evalSync(context: SyncEvaluationContext, node: Ast.Node & { type: 'each' }, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		const items = context._evalSync(node.items, scope, callStack);
		if (isControl(items)) {
			return items;
		}
		assertArray(items);
		for (const item of items.value) {
			const eachScope = scope.createChildScope();
			context.define(eachScope, node.var, item, false);
			const v = context._evalSync(node.for, eachScope, callStack);
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
