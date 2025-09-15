import { NULL } from '../value.js';
import { assertValue, isControl, type Control } from '../control.js';
import { isFunction } from '../util.js';
import { define } from '../define.js';
import { autobind } from '../../utils/mini-autobind.js';
import type { Ast } from '../../index.js';
import type { Value } from '../value.js';
import type { Scope } from '../scope.js';
import type { AsyncEvaluatorContext, SyncEvaluatorContext } from '../context.js';
import type { CallInfo, Evaluator } from '../types.js';

export class DefinitionEvaluator implements Evaluator<Ast.Definition> {
	@autobind
	async evalAsync(context: AsyncEvaluatorContext, node: Ast.Definition, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		const value = await context.eval(node.expr, scope, callStack);
		if (isControl(value)) {
			return value;
		}
		if (node.attr.length > 0) {
			const attrs: Value['attr'] = [];
			for (const nAttr of node.attr) {
				const value = await context.eval(nAttr.value, scope, callStack);
				assertValue(value);
				attrs.push({
					name: nAttr.name,
					value,
				});
			}
			value.attr = attrs;
		}
		if (
			node.expr.type === 'fn'
					&& node.dest.type === 'identifier'
					&& isFunction(value)
					&& !value.native
		) {
			value.name = node.dest.name;
		}
		define(scope, node.dest, value, node.mut);
		return NULL;
	}

	@autobind
	evalSync(context: SyncEvaluatorContext, node: Ast.Definition, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		const value = context.eval(node.expr, scope, callStack);
		if (isControl(value)) {
			return value;
		}
		if (node.attr.length > 0) {
			const attrs: Value['attr'] = [];
			for (const nAttr of node.attr) {
				const value = context.eval(nAttr.value, scope, callStack);
				assertValue(value);
				attrs.push({
					name: nAttr.name,
					value,
				});
			}
			value.attr = attrs;
		}
		if (
			node.expr.type === 'fn'
					&& node.dest.type === 'identifier'
					&& isFunction(value)
					&& !value.native
		) {
			value.name = node.dest.name;
		}
		define(scope, node.dest, value, node.mut);
		return NULL;
	}
};
