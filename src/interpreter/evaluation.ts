import type { Control } from './control.js';
import type * as Ast from '../node.js';
import type { Value, VFn } from './value.js';
import type { Scope } from './scope.js';
import type { Variable } from './variable.js';
import type { Reference } from './reference.js';

export type LogObject = {
	scope?: string;
	var?: string;
	val?: Value | Variable;
};

export type CallInfo = {
	name: string;
	pos: Ast.Pos | undefined;
};

export interface Evaluator<N extends Ast.Node> {
	evalAsync(context: AsyncEvaluationContext, node: N, scope: Scope, callstack: readonly CallInfo[]): Promise<Value | Control>;
	evalSync(context: SyncEvaluationContext, node: N, scope: Scope, callstack: readonly CallInfo[]): Value | Control;
}

interface EvaluationContext {
	define(scope: Scope, dest: Ast.Expression, value: Value, isMutable: boolean): void;
	log(type: string, params: LogObject): void;
}

export interface AsyncEvaluationContext extends EvaluationContext {
	_eval(node: Ast.Node, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control>;
	_evalBinaryOperation(op: string, leftExpr: Ast.Expression, rightExpr: Ast.Expression, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control>;
	_evalClause(node: Ast.Statement | Ast.Expression, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control>;
	_fn(fn: VFn, args: Value[], callStack: readonly CallInfo[], pos?: Ast.Pos): Promise<Value>;
	_run(program: Ast.Node[], scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control>;
	evalAndSetAttr(attr: Ast.Attribute[], value: Value, scope: Scope, callStack: readonly CallInfo[]): Promise<void>;
	getReference(dest: Ast.Expression, scope: Scope, callStack: readonly CallInfo[]): Promise<Reference | Control>;
}

export interface SyncEvaluationContext extends EvaluationContext {
	_evalSync(node: Ast.Node, scope: Scope, callStack: readonly CallInfo[]): Value | Control;
	_evalBinaryOperationSync(op: string, leftExpr: Ast.Expression, rightExpr: Ast.Expression, scope: Scope, callStack: readonly CallInfo[]): Value | Control;
	_evalClauseSync(node: Ast.Statement | Ast.Expression, scope: Scope, callStack: readonly CallInfo[]): Value | Control;
	_fnSync(fn: VFn, args: Value[], callStack: readonly CallInfo[], pos?: Ast.Pos): Value;
	_runSync(program: Ast.Node[], scope: Scope, callStack: readonly CallInfo[]): Value | Control;
	evalAndSetAttrSync(attr: Ast.Attribute[], value: Value, scope: Scope, callStack: readonly CallInfo[]): void;
	getReferenceSync(dest: Ast.Expression, scope: Scope, callStack: readonly CallInfo[]): Reference | Control;
}
