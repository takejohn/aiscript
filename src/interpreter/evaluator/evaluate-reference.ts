import { AiScriptRuntimeError } from '../../error.js';
import { evaluationStepsToEvaluator } from './step.js';
import { evalIdentifierReference } from './reference-evaluators/identifier.js';
import { evalIndexReference } from './reference-evaluators/index.js';
import { evalPropReference } from './reference-evaluators/prop.js';
import { evalArrReference } from './reference-evaluators/arr.js';
import { evalObjReference } from './reference-evaluators/obj.js';
import type { NodeEvaluator } from './types.js';
import type { Control } from '../control.js';
import type { CallInfo } from '../types.js';
import type { AsyncEvaluatorContext, SyncEvaluatorContext } from './context.js';
import type { Reference } from '../reference.js';
import type { Ast, Scope } from '../../index.js';

const referenceEvaluatorMap: { [T in Ast.Node['type']]?: NodeEvaluator<Ast.Node & { type: T }, Reference | Control>} = {
	'identifier': evaluationStepsToEvaluator(evalIdentifierReference),
	'index': evaluationStepsToEvaluator(evalIndexReference),
	'prop': evaluationStepsToEvaluator(evalPropReference),
	'arr': evaluationStepsToEvaluator(evalArrReference),
	'obj': evaluationStepsToEvaluator(evalObjReference),
};

function selectReferenceEvaluator<T extends Ast.Node['type']>(type: T): NodeEvaluator<Ast.Node & { type: T }, Reference | Control> {
	if (!Object.hasOwn(referenceEvaluatorMap, type)) {
		throw new AiScriptRuntimeError('The left-hand side of an assignment expression must be a variable or a property/index access.');
	}
	const referenceEvaluator = referenceEvaluatorMap[type]!;
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
