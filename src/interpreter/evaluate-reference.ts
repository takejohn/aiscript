import { AiScriptRuntimeError } from '../error.js';
import { isControl } from './control.js';
import { Reference } from './reference.js';
import { assertNumber, assertObject, assertString, isArray, isObject, reprValue } from './util.js';
import type { Ast, Scope } from '../index.js';
import type { AsyncEvaluatorContext, SyncEvaluatorContext } from './context.js';
import type { Control } from './control.js';
import type { CallInfo } from './types.js';

interface ReferenceEvaluator<N extends Ast.Node> {
	evalAsync(
		context: AsyncEvaluatorContext,
		node: N,
		scope: Scope,
		callStack: readonly CallInfo[]
	): Promise<Reference | Control>;

	evalSync(
		context: SyncEvaluatorContext,
		node: N,
		scope: Scope,
		callStack: readonly CallInfo[]
	): Reference | Control;
}

const identifierReferenceEvaluator: ReferenceEvaluator<Ast.Identifier> = {
	async evalAsync(context, node, scope) {
		return Reference.variable(node.name, scope);
	},

	evalSync(context, node, scope) {
		return Reference.variable(node.name, scope);
	},
};

const indexReferenceEvaluator: ReferenceEvaluator<Ast.Index> = {
	async evalAsync(context, node, scope, callStack) {
		const assignee = await context.eval(node.target, scope, callStack);
		if (isControl(assignee)) {
			return assignee;
		}
		const i = await context.eval(node.index, scope, callStack);
		if (isControl(i)) {
			return i;
		}
		if (isArray(assignee)) {
			assertNumber(i);
			return Reference.index(assignee, i.value);
		} else if (isObject(assignee)) {
			assertString(i);
			return Reference.prop(assignee, i.value);
		} else {
			throw new AiScriptRuntimeError(`Cannot read prop (${reprValue(i)}) of ${assignee.type}.`);
		}
	},

	evalSync(context, node, scope, callStack) {
		const assignee = context.eval(node.target, scope, callStack);
		if (isControl(assignee)) {
			return assignee;
		}
		const i = context.eval(node.index, scope, callStack);
		if (isControl(i)) {
			return i;
		}
		if (isArray(assignee)) {
			assertNumber(i);
			return Reference.index(assignee, i.value);
		} else if (isObject(assignee)) {
			assertString(i);
			return Reference.prop(assignee, i.value);
		} else {
			throw new AiScriptRuntimeError(`Cannot read prop (${reprValue(i)}) of ${assignee.type}.`);
		}
	},
};

const propReferenceEvaluator: ReferenceEvaluator<Ast.Prop> = {
	async evalAsync(context, node, scope, callStack) {
		const assignee = await context.eval(node.target, scope, callStack);
		if (isControl(assignee)) {
			return assignee;
		}
		assertObject(assignee);

		return Reference.prop(assignee, node.name);
	},

	evalSync(context, node, scope, callStack) {
		const assignee = context.eval(node.target, scope, callStack);
		if (isControl(assignee)) {
			return assignee;
		}
		assertObject(assignee);

		return Reference.prop(assignee, node.name);
	},
};

const arrReferenceEvaluator: ReferenceEvaluator<Ast.Arr> = {
	async evalAsync(context, node, scope, callStack) {
		const items: Reference[] = [];
		for (const item of node.value) {
			const ref = await evaluateReferenceAsync(context, item, scope, callStack);
			if (isControl(ref)) {
				return ref;
			}
			items.push(ref);
		}
		return Reference.arr(items);
	},

	evalSync(context, node, scope, callStack) {
		const items: Reference[] = [];
		for (const item of node.value) {
			const ref = evaluateReferenceSync(context, item, scope, callStack);
			if (isControl(ref)) {
				return ref;
			}
			items.push(ref);
		}
		return Reference.arr(items);
	},
};

const objReferenceEvaluator: ReferenceEvaluator<Ast.Obj> = {
	async evalAsync(context, node, scope, callStack) {
		const entries = new Map<string, Reference>();
		for (const [key, item] of node.value.entries()) {
			const ref = await evaluateReferenceAsync(context, item, scope, callStack);
			if (isControl(ref)) {
				return ref;
			}
			entries.set(key, ref);
		}
		return Reference.obj(entries);
	},

	evalSync(context, node, scope, callStack) {
		const entries = new Map<string, Reference>();
		for (const [key, item] of node.value.entries()) {
			const ref = evaluateReferenceSync(context, item, scope, callStack);
			if (isControl(ref)) {
				return ref;
			}
			entries.set(key, ref);
		}
		return Reference.obj(entries);
	},
};

const referenceEvaluatorMap: { [T in Ast.Node['type']]?: ReferenceEvaluator<Ast.Node & { type: T }>} = {
	'identifier': identifierReferenceEvaluator,
	'index': indexReferenceEvaluator,
	'prop': propReferenceEvaluator,
	'arr': arrReferenceEvaluator,
	'obj': objReferenceEvaluator,
};

function selectReferenceEvaluator<T extends Ast.Node['type']>(type: T): ReferenceEvaluator<Ast.Node & { type: T }> {
	const referenceEvaluator = referenceEvaluatorMap[type];
	if (referenceEvaluator === undefined) {
		throw new AiScriptRuntimeError('The left-hand side of an assignment expression must be a variable or a property/index access.');
	}
	return referenceEvaluator;
}

export async function evaluateReferenceAsync<T extends Ast.Node['type']>(
	context: AsyncEvaluatorContext,
	node: Ast.Node & { type: T },
	scope: Scope,
	callStack: readonly CallInfo[]
): Promise<Reference | Control> {
	const referenceEvaluator = selectReferenceEvaluator(node.type);
	return await referenceEvaluator.evalAsync(context, node, scope, callStack);
}

export function evaluateReferenceSync<T extends Ast.Node['type']>(
	context: SyncEvaluatorContext,
	node: Ast.Node & { type: T },
	scope: Scope,
	callStack: readonly CallInfo[]
): Reference | Control {
	const evaluator = selectReferenceEvaluator(node.type);
	return evaluator.evalSync(context, node, scope, callStack);
}
