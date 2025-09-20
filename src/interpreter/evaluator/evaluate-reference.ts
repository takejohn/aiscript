import { AiScriptRuntimeError } from '../../error.js';
import { evaluationStepsToEvaluator } from './step.js';
import { evalIdentifierReference } from './reference-evaluators/identifier.js';
import { evalIndexReference } from './reference-evaluators/index.js';
import { evalPropReference } from './reference-evaluators/prop.js';
import { evalArrReference } from './reference-evaluators/arr.js';
import { evalObjReference } from './reference-evaluators/obj.js';
import type { EvaluationStepResult } from './step.js';
import type { Control } from '../control.js';
import type { CallInfo } from '../types.js';
import type { AsyncEvaluatorContext, SyncEvaluatorContext } from './context.js';
import type { Reference } from '../reference.js';
import type { Ast, Scope } from '../../index.js';

function evalReference(node: Ast.Node, scope: Scope): EvaluationStepResult<Reference | Control> {
	switch (node.type) {
		case 'identifier': return evalIdentifierReference(node, scope);
		case 'index': return evalIndexReference(node, scope);
		case 'prop': return evalPropReference(node, scope);
		case 'arr': return evalArrReference(node, scope);
		case 'obj': return evalObjReference(node, scope);
		default: throw new AiScriptRuntimeError('The left-hand side of an assignment expression must be a variable or a property/index access.');
	}
}

const referenceEvaluator = evaluationStepsToEvaluator(evalReference);

export async function evaluateReferenceAsync<T extends Ast.Node['type']>(
	context: AsyncEvaluatorContext,
	node: Ast.Node & { type: T },
	scope: Scope,
	callStack: readonly CallInfo[]
): Promise<Reference | Control> {
	return await referenceEvaluator.evalAsync(context, node, scope, callStack);
}

export function evaluateReferenceSync<T extends Ast.Node['type']>(
	context: SyncEvaluatorContext,
	node: Ast.Node & { type: T },
	scope: Scope,
	callStack: readonly CallInfo[]
): Reference | Control {
	return referenceEvaluator.evalSync(context, node, scope, callStack);
}
