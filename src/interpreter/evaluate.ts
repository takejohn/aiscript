import { CallEvaluator } from './evaluators/call.js';
import { IfEvaluator } from './evaluators/if.js';
import { MatchEvaluator } from './evaluators/match.js';
import { LoopEvaluator } from './evaluators/loop.js';
import { ForEvaluator } from './evaluators/for.js';
import { EachEvaluator } from './evaluators/each.js';
import { DefinitionEvaluator } from './evaluators/definition.js';
import { IdentifierEvaluator } from './evaluators/identifier.js';
import { AssignEvaluator } from './evaluators/assign.js';
import { AddAssignEvaluator } from './evaluators/add-assign.js';
import { SubAssignEvaluator } from './evaluators/sub-assign.js';
import { ConstantEvaluator } from './evaluators/constant.js';
import { ArrEvaluator } from './evaluators/arr.js';
import { ObjEvaluator } from './evaluators/obj.js';
import { PropEvaluator } from './evaluators/prop.js';
import { PlusEvaluator } from './evaluators/plus.js';
import { MinusEvaluator } from './evaluators/minus.js';
import { NotEvaluator } from './evaluators/not.js';
import { FnEvaluator } from './evaluators/fn.js';
import { BlockEvaluator } from './evaluators/block.js';
import { ExistsEvaluator } from './evaluators/exists.js';
import { TmplEvaluator } from './evaluators/tmpl.js';
import { ReturnEvaluator } from './evaluators/return.js';
import { BreakEvaluator } from './evaluators/break.js';
import { ContinueEvaluator } from './evaluators/continue.js';
import { NopEvaluator } from './evaluators/nop.js';
import { BinaryOperationEvaluator } from './evaluators/binary-operation.js';
import { AndEvaluator } from './evaluators/and.js';
import { OrEvaluator } from './evaluators/or.js';
import { IndexEvaluator } from './evaluators/index.js';
import { NeverEvaluator } from './evaluators/never.js';
import type { CallInfo, NodeEvaluator } from './types.js';
import type { Control } from './control.js';
import type { Value } from './value.js';
import type { AsyncEvaluatorContext, SyncEvaluatorContext } from './context.js';
import type { Ast, Scope } from '../index.js';

const evaluatorMap: { [T in Ast.Node['type']]: NodeEvaluator<Ast.Node & { type: T }>} = {
	'call': CallEvaluator,
	'if': IfEvaluator,
	'match': MatchEvaluator,
	'loop': LoopEvaluator,
	'for': ForEvaluator,
	'each': EachEvaluator,
	'def': DefinitionEvaluator,
	'identifier': IdentifierEvaluator,
	'assign': AssignEvaluator,
	'addAssign': AddAssignEvaluator,
	'subAssign': SubAssignEvaluator,
	'null': ConstantEvaluator.NULL,
	'bool': ConstantEvaluator.BOOL,
	'num': ConstantEvaluator.NUM,
	'str': ConstantEvaluator.STR,
	'arr': ArrEvaluator,
	'obj': ObjEvaluator,
	'prop': PropEvaluator,
	'index': IndexEvaluator,
	'plus': PlusEvaluator,
	'minus': MinusEvaluator,
	'not': NotEvaluator,
	'fn': FnEvaluator,
	'block': BlockEvaluator,
	'exists': ExistsEvaluator,
	'tmpl': TmplEvaluator,
	'return': ReturnEvaluator,
	'break': BreakEvaluator,
	'continue': ContinueEvaluator,
	'ns': NopEvaluator,
	'meta': NopEvaluator,
	'pow': BinaryOperationEvaluator.POW,
	'mul': BinaryOperationEvaluator.MUL,
	'div': BinaryOperationEvaluator.DIV,
	'rem': BinaryOperationEvaluator.REM,
	'add': BinaryOperationEvaluator.ADD,
	'sub': BinaryOperationEvaluator.SUB,
	'lt': BinaryOperationEvaluator.LT,
	'lteq': BinaryOperationEvaluator.LTEQ,
	'gt': BinaryOperationEvaluator.GT,
	'gteq': BinaryOperationEvaluator.GTEQ,
	'eq': BinaryOperationEvaluator.EQ,
	'neq': BinaryOperationEvaluator.NEQ,
	'and': AndEvaluator,
	'or': OrEvaluator,
	'namedTypeSource': NeverEvaluator,
	'fnTypeSource': NeverEvaluator,
	'unionTypeSource': NeverEvaluator,
	'attr': NeverEvaluator,
};

function selectEvaluator<T extends Ast.Node['type']>(type: T): NodeEvaluator<Ast.Node & { type: T }> {
	if (!Object.hasOwn(evaluatorMap, type)) {
		throw new Error('invalid node type');
	}
	const evaluator = evaluatorMap[type];
	return evaluator;
}

export async function evaluateAsync<T extends Ast.Node['type']>(
	context: AsyncEvaluatorContext,
	node: Ast.Node & { type: T },
	scope: Scope,
	callStack: readonly CallInfo[]
): Promise<Value | Control> {
	const evaluator = selectEvaluator(node.type);
	return await evaluator.evalAsync(context, node, scope, callStack);
}

export function evaluateSync<T extends Ast.Node['type']>(
	context: SyncEvaluatorContext,
	node: Ast.Node & { type: T },
	scope: Scope,
	callStack: readonly CallInfo[]
): Value | Control {
	const evaluator = selectEvaluator(node.type);
	return evaluator.evalSync(context, node, scope, callStack);
}
