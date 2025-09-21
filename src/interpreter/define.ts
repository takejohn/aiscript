import { AiScriptRuntimeError } from '../error.js';
import { assertArray, assertObject, isFunction } from './util.js';
import { NULL } from './value.js';
import type { Ast } from '../index.js';
import type { Scope } from './scope.js';
import type { Value } from './value.js';

export function define(scope: Scope, dest: Ast.Expression, value: Value, isMutable: boolean): void {
	switch (dest.type) {
		case 'identifier': {
			scope.add(dest.name, { isMutable, value });
			break;
		}
		case 'arr': {
			assertArray(value);
			dest.value.map(
				(item, index) => define(scope, item, value.value[index] ?? NULL, isMutable),
			);
			break;
		}
		case 'obj': {
			assertObject(value);
			[...dest.value].map(
				([key, item]) => define(scope, item, value.value.get(key) ?? NULL, isMutable),
			);
			break;
		}
		default: {
			throw new AiScriptRuntimeError('The left-hand side of an definition expression must be a variable.');
		}
	}
}

export function defineByDefinitionNode(node: Ast.Definition, scope: Scope, value: Value): void {
	if (
		node.expr.type === 'fn'
				&& node.dest.type === 'identifier'
				&& isFunction(value)
				&& !value.native
	) {
		value.name = scope.getNsPrefix() + node.dest.name;
	}
	define(scope, node.dest, value, node.mut);
}
