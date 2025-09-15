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
import { BOOL, NULL, NUM, STR } from './value.js';
import type { CallInfo, Evaluator } from './types.js';
import type { Control } from './control.js';
import type { Value } from './value.js';
import type { AsyncEvaluatorContext, SyncEvaluatorContext } from './context.js';
import type { Ast, Scope } from '../index.js';

const evaluatorMap: { [T in Ast.Node['type']]: Evaluator<Ast.Node & { type: T }>} = {
	'call': new CallEvaluator(),
	'if': new IfEvaluator(),
	'match': new MatchEvaluator(),
	'loop': new LoopEvaluator(),
	'for': new ForEvaluator(),
	'each': new EachEvaluator(),
	'def': new DefinitionEvaluator(),
	'identifier': new IdentifierEvaluator(),
	'assign': new AssignEvaluator(),
	'addAssign': new AddAssignEvaluator(),
	'subAssign': new SubAssignEvaluator(),
	'null': new ConstantEvaluator(() => NULL),
	'bool': new ConstantEvaluator((node) => BOOL(node.value)),
	'num': new ConstantEvaluator((node) => NUM(node.value)),
	'str': new ConstantEvaluator((node) => STR(node.value)),
	'arr': new ArrEvaluator(),
	'obj': new ObjEvaluator(),
	'prop': new PropEvaluator(),
	'index': new IndexEvaluator(),
	'plus': new PlusEvaluator(),
	'minus': new MinusEvaluator(),
	'not': new NotEvaluator(),
	'fn': new FnEvaluator(),
	'block': new BlockEvaluator(),
	'exists': new ExistsEvaluator(),
	'tmpl': new TmplEvaluator(),
	'return': new ReturnEvaluator(),
	'break': new BreakEvaluator(),
	'continue': new ContinueEvaluator(),
	'ns': new NopEvaluator(),
	'meta': new NopEvaluator(),
	'pow': new BinaryOperationEvaluator('Core:pow'),
	'mul': new BinaryOperationEvaluator('Core:mul'),
	'div': new BinaryOperationEvaluator('Core:div'),
	'rem': new BinaryOperationEvaluator('Core:mod'),
	'add': new BinaryOperationEvaluator('Core:add'),
	'sub': new BinaryOperationEvaluator('Core:sub'),
	'lt': new BinaryOperationEvaluator('Core:lt'),
	'lteq': new BinaryOperationEvaluator('Core:lteq'),
	'gt': new BinaryOperationEvaluator('Core:gt'),
	'gteq': new BinaryOperationEvaluator('Core:gteq'),
	'eq': new BinaryOperationEvaluator('Core:eq'),
	'neq': new BinaryOperationEvaluator('Core:neq'),
	'and': new AndEvaluator(),
	'or': new OrEvaluator(),
	'namedTypeSource': new NeverEvaluator(),
	'fnTypeSource': new NeverEvaluator(),
	'unionTypeSource': new NeverEvaluator(),
	'attr': new NeverEvaluator(),
};

export async function evaluateAsync<T extends Ast.Node['type']>(
	context: AsyncEvaluatorContext,
	node: Ast.Node & { type: T },
	scope: Scope,
	callStack: readonly CallInfo[]
): Promise<Value | Control> {
	const evaluator = evaluatorMap[node.type];
	return await evaluator.evalAsync(context, node, scope, callStack);
}

export function evaluateSync<T extends Ast.Node['type']>(
	context: SyncEvaluatorContext,
	node: Ast.Node & { type: T },
	scope: Scope,
	callStack: readonly CallInfo[]
): Value | Control {
	const evaluator = evaluatorMap[node.type];
	return evaluator.evalSync(context, node, scope, callStack);
}
