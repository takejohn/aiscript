import { evalCall } from './value-evaluators/call.js';
import { evalIf } from './value-evaluators/if.js';
import { evalMatch } from './value-evaluators/match.js';
import { evalLoop } from './value-evaluators/loop.js';
import { evalFor } from './value-evaluators/for.js';
import { evalEach } from './value-evaluators/each.js';
import { evalDefinition } from './value-evaluators/definition.js';
import { evalIdentifier } from './value-evaluators/identifier.js';
import { evalAssign } from './value-evaluators/assign.js';
import { evalAddAssign } from './value-evaluators/add-assign.js';
import { evalSubAssign } from './value-evaluators/sub-assign.js';
import { evalBool, evalNull, evalNum, evalStr } from './value-evaluators/constant.js';
import { evalArr } from './value-evaluators/arr.js';
import { evalObj } from './value-evaluators/obj.js';
import { evalProp } from './value-evaluators/prop.js';
import { evalPlus } from './value-evaluators/plus.js';
import { evalMinus } from './value-evaluators/minus.js';
import { evalNot } from './value-evaluators/not.js';
import { evalFn } from './value-evaluators/fn.js';
import { evalBlock } from './value-evaluators/block.js';
import { evalExists } from './value-evaluators/exists.js';
import { evalTmpl } from './value-evaluators/tmpl.js';
import { evalReturn } from './value-evaluators/return.js';
import { evalBreak } from './value-evaluators/break.js';
import { evalContinue } from './value-evaluators/continue.js';
import { evalNop } from './value-evaluators/nop.js';
import { evalAdd, evalDiv, evalEq, evalGt, evalGteq, evalLt, evalLteq, evalMul, evalNeq, evalPow, evalRem, evalSub } from './value-evaluators/binary-operation.js';
import { evalAnd } from './value-evaluators/and.js';
import { evalOr } from './value-evaluators/or.js';
import { evalIndex } from './value-evaluators/index.js';
import { evalNever } from './value-evaluators/never.js';
import { evaluationStepsToEvaluator } from './step.js';
import type { Logger } from '../logger.js';
import type { CallInfo } from '../types.js';
import type { Control } from '../control.js';
import type { Value } from '../value.js';
import type { AsyncEvaluatorContext, SyncEvaluatorContext } from './context.js';
import type { Ast, Scope } from '../../index.js';
import type { EvaluationStepResult } from './step.js';

function evalNode(node: Ast.Node, scope: Scope, logger: Logger): EvaluationStepResult {
	switch (node.type) {
		case 'call': return evalCall(node, scope);
		case 'if': return evalIf(node, scope);
		case 'match': return evalMatch(node, scope);
		case 'loop': return evalLoop(node, scope);
		case 'for': return evalFor(node, scope);
		case 'each': return evalEach(node, scope);
		case 'def': return evalDefinition(node, scope);
		case 'identifier': return evalIdentifier(node, scope);
		case 'assign': return evalAssign(node, scope);
		case 'addAssign': return evalAddAssign(node, scope);
		case 'subAssign': return evalSubAssign(node, scope);
		case 'null': return evalNull();
		case 'bool': return evalBool(node);
		case 'num': return evalNum(node);
		case 'str': return evalStr(node);
		case 'arr': return evalArr(node, scope);
		case 'obj': return evalObj(node, scope);
		case 'prop': return evalProp(node, scope);
		case 'index': return evalIndex(node, scope);
		case 'plus': return evalPlus(node, scope);
		case 'minus': return evalMinus(node, scope);
		case 'not': return evalNot(node, scope);
		case 'fn': return evalFn(node, scope);
		case 'block': return evalBlock(node, scope);
		case 'exists': return evalExists(node, scope);
		case 'tmpl': return evalTmpl(node, scope);
		case 'return': return evalReturn(node, scope, logger);
		case 'break': return evalBreak(node, scope, logger);
		case 'continue': return evalContinue(node, scope, logger);
		case 'ns': return evalNop();
		case 'meta': return evalNop();
		case 'pow': return evalPow(node, scope);
		case 'mul': return evalMul(node, scope);
		case 'div': return evalDiv(node, scope);
		case 'rem': return evalRem(node, scope);
		case 'add': return evalAdd(node, scope);
		case 'sub': return evalSub(node, scope);
		case 'lt': return evalLt(node, scope);
		case 'lteq': return evalLteq(node, scope);
		case 'gt': return evalGt(node, scope);
		case 'gteq': return evalGteq(node, scope);
		case 'eq': return evalEq(node, scope);
		case 'neq': return evalNeq(node, scope);
		case 'and': return evalAnd(node, scope);
		case 'or': return evalOr(node, scope);
		case 'namedTypeSource': return evalNever();
		case 'fnTypeSource': return evalNever();
		case 'unionTypeSource': return evalNever();
		case 'attr': return evalNever();
	}
};

const evaluator = evaluationStepsToEvaluator(evalNode);

export async function evaluateAsync<T extends Ast.Node['type']>(
	context: AsyncEvaluatorContext,
	node: Ast.Node & { type: T },
	scope: Scope,
	callStack: readonly CallInfo[]
): Promise<Value | Control> {
	return await evaluator.evalAsync(context, node, scope, callStack);
}

export function evaluateSync<T extends Ast.Node['type']>(
	context: SyncEvaluatorContext,
	node: Ast.Node & { type: T },
	scope: Scope,
	callStack: readonly CallInfo[]
): Value | Control {
	return evaluator.evalSync(context, node, scope, callStack);
}
