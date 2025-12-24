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

export const forEvaluator: Evaluator<Ast.Node & { type: 'for' }> = {
	async evalAsync(context: AsyncEvaluationContext, node: Ast.Node & { type: 'for' }, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		if (node.times) {
			const times = await context._eval(node.times, scope, callStack);
			if (isControl(times)) {
				return times;
			}
			assertNumber(times);
			for (let i = 0; i < times.value; i++) {
				const v = await context._evalClause(node.for, scope, callStack);
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
		} else {
			const from = await context._eval(node.from!, scope, callStack);
			if (isControl(from)) {
				return from;
			}
			const to = await context._eval(node.to!, scope, callStack);
			if (isControl(to)) {
				return to;
			}
			assertNumber(from);
			assertNumber(to);
			for (let i = from.value; i < from.value + to.value; i++) {
				const v = await context._eval(node.for, scope.createChildScope(new Map([
					[node.var!, {
						isMutable: false,
						value: NUM(i),
					}],
				])), callStack);
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
		}
		return NULL;
	},

	evalSync(context: SyncEvaluationContext, node: Ast.Node & { type: 'for' }, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		if (node.times) {
			const times = context._evalSync(node.times, scope, callStack);
			if (isControl(times)) {
				return times;
			}
			assertNumber(times);
			for (let i = 0; i < times.value; i++) {
				const v = context._evalClauseSync(node.for, scope, callStack);
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
		} else {
			const from = context._evalSync(node.from!, scope, callStack);
			if (isControl(from)) {
				return from;
			}
			const to = context._evalSync(node.to!, scope, callStack);
			if (isControl(to)) {
				return to;
			}
			assertNumber(from);
			assertNumber(to);
			for (let i = from.value; i < from.value + to.value; i++) {
				const v = context._evalSync(node.for, scope.createChildScope(new Map([
					[node.var!, {
						isMutable: false,
						value: NUM(i),
					}],
				])), callStack);
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
		}
		return NULL;
	},
};
