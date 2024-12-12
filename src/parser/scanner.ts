import { AiScriptSyntaxError, AiScriptUnexpectedEOFError } from '../error.js';
import { CharStream } from './streams/char-stream.js';
import { TOKEN, TokenKind } from './token.js';
import { unexpectedTokenError } from './utils.js';

import type { ITokenStream } from './streams/token-stream.js';
import type { Token, TokenComment, TokenPosition } from './token.js';

const spaceChars = [' ', '\t'];
const lineBreakChars = ['\r', '\n'];
const digit = /^[0-9]$/;
const wordChar = /^[A-Za-z0-9_]$/;

/**
 * 入力文字列からトークンを読み取るクラス
*/
export class Scanner implements ITokenStream {
	private stream: CharStream;
	private _tokens: Token[] = [];
	private comments: TokenComment[] = [];

	constructor(source: string)
	constructor(stream: CharStream)
	constructor(x: string | CharStream) {
		if (typeof x === 'string') {
			this.stream = new CharStream(x);
		} else {
			this.stream = x;
		}
		this._tokens.push(this.readToken());
	}

	/**
	 * カーソル位置にあるトークンを取得します。
	*/
	public getToken(): Token {
		return this._tokens[0]!;
	}

	/**
	 * カーソル位置にあるトークンの種類が指定したトークンの種類と一致するかどうかを示す値を取得します。
	*/
	public is(kind: TokenKind): boolean {
		return this.getTokenKind() === kind;
	}

	/**
	 * カーソル位置にあるトークンの種類を取得します。
	*/
	public getTokenKind(): TokenKind {
		return this.getToken().kind;
	}

	/**
	 * カーソル位置にあるトークンに含まれる値を取得します。
	*/
	public getTokenValue(): string {
		return this.getToken().value!;
	}

	/**
	 * カーソル位置にあるトークンの位置情報を取得します。
	*/
	public getPos(): TokenPosition {
		return this.getToken().pos;
	}

	/**
	 * カーソル位置を次のトークンへ進めます。
	*/
	public next(): void {
		// 現在のトークンがEOFだったら次のトークンに進まない
		if (this._tokens[0]!.kind === TokenKind.EOF) {
			return;
		}

		this._tokens.shift();

		if (this._tokens.length === 0) {
			this._tokens.push(this.readToken());
		}
	}

	/**
	 * トークンの先読みを行います。カーソル位置は移動されません。
	*/
	public lookahead(offset: number): Token {
		while (this._tokens.length <= offset) {
			this._tokens.push(this.readToken());
		}

		return this._tokens[offset]!;
	}

	/**
	 * カーソル位置にあるトークンの種類が指定したトークンの種類と一致することを確認します。
	 * 一致しなかった場合には文法エラーを発生させます。
	*/
	public expect(kind: TokenKind): void {
		if (!this.is(kind)) {
			throw unexpectedTokenError(this.getTokenKind(), this.getPos());
		}
	}

	private readToken(): Token {
		let hasLeftSpacing = false;

		while (true) {
			if (this.stream.eof) {
				return this.TOKEN(TokenKind.EOF, this.stream.getPos(), { hasLeftSpacing });
			}
			// skip spasing
			if (spaceChars.includes(this.stream.char)) {
				this.stream.next();
				hasLeftSpacing = true;
				continue;
			}

			// トークン位置を記憶
			const pos = this.stream.getPos();

			if (lineBreakChars.includes(this.stream.char)) {
				this.skipEmptyLines();
				return this.TOKEN(TokenKind.NewLine, pos, { hasLeftSpacing });
			}

			// noFallthroughCasesInSwitchと関数の返り値の型を利用し、全ての場合分けがreturnかcontinueで適切に処理されることを強制している
			// その都合上、break文の使用ないしこのswitch文の後に処理を書くことは極力避けてほしい
			switch (this.stream.char) {
				case '!': {
					this.stream.next();
					if (!this.stream.eof && (this.stream.char as string) === '=') {
						this.stream.next();
						return this.TOKEN(TokenKind.NotEq, pos, { hasLeftSpacing });
					} else {
						return this.TOKEN(TokenKind.Not, pos, { hasLeftSpacing });
					}
				}
				case '"':
				case '\'': {
					return this.readStringLiteral(hasLeftSpacing);
				}
				case '#': {
					this.stream.next();
					if (!this.stream.eof && (this.stream.char as string) === '#') {
						this.stream.next();
						if (!this.stream.eof && (this.stream.char as string) === '#') {
							this.stream.next();
							return this.TOKEN(TokenKind.Sharp3, pos, { hasLeftSpacing });
						} else {
							throw new AiScriptSyntaxError('invalid sequence of characters: "##"', pos);
						}
					} else if (!this.stream.eof && (this.stream.char as string) === '[') {
						this.stream.next();
						return this.TOKEN(TokenKind.OpenSharpBracket, pos, { hasLeftSpacing });
					} else {
						throw new AiScriptSyntaxError('invalid character: "#"', pos);
					}
				}
				case '%': {
					this.stream.next();
					return this.TOKEN(TokenKind.Percent, pos, { hasLeftSpacing });
				}
				case '&': {
					this.stream.next();
					if (!this.stream.eof && (this.stream.char as string) === '&') {
						this.stream.next();
						return this.TOKEN(TokenKind.And2, pos, { hasLeftSpacing });
					} else {
						throw new AiScriptSyntaxError('invalid character: "&"', pos);
					}
				}
				case '(': {
					this.stream.next();
					return this.TOKEN(TokenKind.OpenParen, pos, { hasLeftSpacing });
				}
				case ')': {
					this.stream.next();
					return this.TOKEN(TokenKind.CloseParen, pos, { hasLeftSpacing });
				}
				case '*': {
					this.stream.next();
					return this.TOKEN(TokenKind.Asterisk, pos, { hasLeftSpacing });
				}
				case '+': {
					this.stream.next();
					if (!this.stream.eof && (this.stream.char as string) === '=') {
						this.stream.next();
						return this.TOKEN(TokenKind.PlusEq, pos, { hasLeftSpacing });
					} else {
						return this.TOKEN(TokenKind.Plus, pos, { hasLeftSpacing });
					}
				}
				case ',': {
					this.stream.next();
					return this.TOKEN(TokenKind.Comma, pos, { hasLeftSpacing });
				}
				case '-': {
					this.stream.next();
					if (!this.stream.eof && (this.stream.char as string) === '=') {
						this.stream.next();
						return this.TOKEN(TokenKind.MinusEq, pos, { hasLeftSpacing });
					} else {
						return this.TOKEN(TokenKind.Minus, pos, { hasLeftSpacing });
					}
				}
				case '.': {
					this.stream.next();
					return this.TOKEN(TokenKind.Dot, pos, { hasLeftSpacing });
				}
				case '/': {
					const startPos = this.stream.getPos();
					this.stream.next();
					if (!this.stream.eof && (this.stream.char as string) === '*') {
						this.stream.next();
						this.skipCommentRange(startPos);
						continue;
					} else if (!this.stream.eof && (this.stream.char as string) === '/') {
						this.stream.next();
						this.skipCommentLine(startPos);
						continue;
					} else {
						return this.TOKEN(TokenKind.Slash, pos, { hasLeftSpacing });
					}
				}
				case ':': {
					this.stream.next();
					if (!this.stream.eof && (this.stream.char as string) === ':') {
						this.stream.next();
						return this.TOKEN(TokenKind.Colon2, pos, { hasLeftSpacing });
					} else {
						return this.TOKEN(TokenKind.Colon, pos, { hasLeftSpacing });
					}
				}
				case ';': {
					this.stream.next();
					return this.TOKEN(TokenKind.SemiColon, pos, { hasLeftSpacing });
				}
				case '<': {
					this.stream.next();
					if (!this.stream.eof && (this.stream.char as string) === '=') {
						this.stream.next();
						return this.TOKEN(TokenKind.LtEq, pos, { hasLeftSpacing });
					} else if (!this.stream.eof && (this.stream.char as string) === ':') {
						this.stream.next();
						return this.TOKEN(TokenKind.Out, pos, { hasLeftSpacing });
					} else {
						return this.TOKEN(TokenKind.Lt, pos, { hasLeftSpacing });
					}
				}
				case '=': {
					this.stream.next();
					if (!this.stream.eof && (this.stream.char as string) === '=') {
						this.stream.next();
						return this.TOKEN(TokenKind.Eq2, pos, { hasLeftSpacing });
					} else if (!this.stream.eof && (this.stream.char as string) === '>') {
						this.stream.next();
						return this.TOKEN(TokenKind.Arrow, pos, { hasLeftSpacing });
					} else {
						return this.TOKEN(TokenKind.Eq, pos, { hasLeftSpacing });
					}
				}
				case '>': {
					this.stream.next();
					if (!this.stream.eof && (this.stream.char as string) === '=') {
						this.stream.next();
						return this.TOKEN(TokenKind.GtEq, pos, { hasLeftSpacing });
					} else {
						return this.TOKEN(TokenKind.Gt, pos, { hasLeftSpacing });
					}
				}
				case '?': {
					this.stream.next();
					return this.TOKEN(TokenKind.Question, pos, { hasLeftSpacing });
				}
				case '@': {
					this.stream.next();
					return this.TOKEN(TokenKind.At, pos, { hasLeftSpacing });
				}
				case '[': {
					this.stream.next();
					return this.TOKEN(TokenKind.OpenBracket, pos, { hasLeftSpacing });
				}
				case '\\': {
					this.stream.next();
					return this.TOKEN(TokenKind.BackSlash, pos, { hasLeftSpacing });
				}
				case ']': {
					this.stream.next();
					return this.TOKEN(TokenKind.CloseBracket, pos, { hasLeftSpacing });
				}
				case '^': {
					this.stream.next();
					return this.TOKEN(TokenKind.Hat, pos, { hasLeftSpacing });
				}
				case '`': {
					return this.readTemplate(hasLeftSpacing);
				}
				case '{': {
					this.stream.next();
					return this.TOKEN(TokenKind.OpenBrace, pos, { hasLeftSpacing });
				}
				case '|': {
					this.stream.next();
					if (!this.stream.eof && (this.stream.char as string) === '|') {
						this.stream.next();
						return this.TOKEN(TokenKind.Or2, pos, { hasLeftSpacing });
					} else {
						throw new AiScriptSyntaxError('invalid character: "|"', pos);
					}
				}
				case '}': {
					this.stream.next();
					return this.TOKEN(TokenKind.CloseBrace, pos, { hasLeftSpacing });
				}
				default: {
					const digitToken = this.tryReadDigits(hasLeftSpacing);
					if (digitToken) return digitToken;

					const wordToken = this.tryReadWord(hasLeftSpacing);
					if (wordToken) return wordToken;

					throw new AiScriptSyntaxError(`invalid character: "${this.stream.char}"`, pos);
				}
			}
			// Use `return` or `continue` before reaching this line.
			// Do not add any more code here. This line should be unreachable.
			break;
		}
		// Use `return` or `continue` before reaching this line.
		// Do not add any more code here. This line should be unreachable.
	}

	private tryReadWord(hasLeftSpacing: boolean): Token | undefined {
		// read a word
		let value = '';

		const pos = this.stream.getPos();

		while (!this.stream.eof && wordChar.test(this.stream.char)) {
			value += this.stream.char;
			this.stream.next();
		}
		if (value.length === 0) {
			return;
		}
		// check word kind
		switch (value) {
			case 'null': {
				return this.TOKEN(TokenKind.NullKeyword, pos, { hasLeftSpacing });
			}
			case 'true': {
				return this.TOKEN(TokenKind.TrueKeyword, pos, { hasLeftSpacing });
			}
			case 'false': {
				return this.TOKEN(TokenKind.FalseKeyword, pos, { hasLeftSpacing });
			}
			case 'each': {
				return this.TOKEN(TokenKind.EachKeyword, pos, { hasLeftSpacing });
			}
			case 'for': {
				return this.TOKEN(TokenKind.ForKeyword, pos, { hasLeftSpacing });
			}
			case 'loop': {
				return this.TOKEN(TokenKind.LoopKeyword, pos, { hasLeftSpacing });
			}
			case 'do': {
				return this.TOKEN(TokenKind.DoKeyword, pos, { hasLeftSpacing });
			}
			case 'while': {
				return this.TOKEN(TokenKind.WhileKeyword, pos, { hasLeftSpacing });
			}
			case 'break': {
				return this.TOKEN(TokenKind.BreakKeyword, pos, { hasLeftSpacing });
			}
			case 'continue': {
				return this.TOKEN(TokenKind.ContinueKeyword, pos, { hasLeftSpacing });
			}
			case 'match': {
				return this.TOKEN(TokenKind.MatchKeyword, pos, { hasLeftSpacing });
			}
			case 'case': {
				return this.TOKEN(TokenKind.CaseKeyword, pos, { hasLeftSpacing });
			}
			case 'default': {
				return this.TOKEN(TokenKind.DefaultKeyword, pos, { hasLeftSpacing });
			}
			case 'if': {
				return this.TOKEN(TokenKind.IfKeyword, pos, { hasLeftSpacing });
			}
			case 'elif': {
				return this.TOKEN(TokenKind.ElifKeyword, pos, { hasLeftSpacing });
			}
			case 'else': {
				return this.TOKEN(TokenKind.ElseKeyword, pos, { hasLeftSpacing });
			}
			case 'return': {
				return this.TOKEN(TokenKind.ReturnKeyword, pos, { hasLeftSpacing });
			}
			case 'eval': {
				return this.TOKEN(TokenKind.EvalKeyword, pos, { hasLeftSpacing });
			}
			case 'var': {
				return this.TOKEN(TokenKind.VarKeyword, pos, { hasLeftSpacing });
			}
			case 'let': {
				return this.TOKEN(TokenKind.LetKeyword, pos, { hasLeftSpacing });
			}
			case 'exists': {
				return this.TOKEN(TokenKind.ExistsKeyword, pos, { hasLeftSpacing });
			}
			default: {
				return this.TOKEN(TokenKind.Identifier, pos, { hasLeftSpacing, value });
			}
		}
	}

	private tryReadDigits(hasLeftSpacing: boolean): Token | undefined {
		let wholeNumber = '';
		let fractional = '';

		const pos = this.stream.getPos();

		while (!this.stream.eof && digit.test(this.stream.char)) {
			wholeNumber += this.stream.char;
			this.stream.next();
		}
		if (wholeNumber.length === 0) {
			return;
		}
		if (!this.stream.eof && this.stream.char === '.') {
			this.stream.next();
			while (!this.stream.eof as boolean && digit.test(this.stream.char as string)) {
				fractional += this.stream.char;
				this.stream.next();
			}
			if (fractional.length === 0) {
				throw new AiScriptSyntaxError('digit expected', pos);
			}
		}
		let value: string;
		if (fractional.length > 0) {
			value = wholeNumber + '.' + fractional;
		} else {
			value = wholeNumber;
		}
		return this.TOKEN(TokenKind.NumberLiteral, pos, { hasLeftSpacing, value });
	}

	private readStringLiteral(hasLeftSpacing: boolean): Token {
		let value = '';
		const literalMark = this.stream.char;
		let state: 'string' | 'escape' | 'finish' = 'string';

		const pos = this.stream.getPos();
		this.stream.next();

		while (state !== 'finish') {
			switch (state) {
				case 'string': {
					if (this.stream.eof) {
						throw new AiScriptUnexpectedEOFError(pos);
					}
					if (this.stream.char === '\\') {
						this.stream.next();
						state = 'escape';
						break;
					}
					if (this.stream.char === literalMark) {
						this.stream.next();
						state = 'finish';
						break;
					}
					value += this.stream.char;
					this.stream.next();
					break;
				}
				case 'escape': {
					if (this.stream.eof) {
						throw new AiScriptUnexpectedEOFError(pos);
					}
					value += this.stream.char;
					this.stream.next();
					state = 'string';
					break;
				}
			}
		}
		return this.TOKEN(TokenKind.StringLiteral, pos, { hasLeftSpacing, value });
	}

	private readTemplate(hasLeftSpacing: boolean): Token {
		const elements: Token[] = [];
		let buf = '';
		let tokenBuf: Token[] = [];
		let state: 'string' | 'escape' | 'expr' | 'finish' = 'string';
		let exprBracketDepth = 0;

		const pos = this.stream.getPos();
		let elementPos = pos;
		this.stream.next();

		while (state !== 'finish') {
			switch (state) {
				case 'string': {
					// テンプレートの終了が無いままEOFに達した
					if (this.stream.eof) {
						throw new AiScriptUnexpectedEOFError(pos);
					}
					// エスケープ
					if (this.stream.char === '\\') {
						this.stream.next();
						state = 'escape';
						break;
					}
					// テンプレートの終了
					if (this.stream.char === '`') {
						this.stream.next();
						if (buf.length > 0) {
							elements.push(this.TOKEN(TokenKind.TemplateStringElement, elementPos, { hasLeftSpacing, value: buf }));
						}
						state = 'finish';
						break;
					}
					// 埋め込み式の開始
					if (this.stream.char === '{') {
						this.stream.next();
						if (buf.length > 0) {
							elements.push(this.TOKEN(TokenKind.TemplateStringElement, elementPos, { hasLeftSpacing, value: buf }));
							buf = '';
						}
						// ここから式エレメントになるので位置を更新
						elementPos = this.stream.getPos();
						state = 'expr';
						break;
					}
					buf += this.stream.char;
					this.stream.next();
					break;
				}
				case 'escape': {
					// エスケープ対象の文字が無いままEOFに達した
					if (this.stream.eof) {
						throw new AiScriptUnexpectedEOFError(pos);
					}
					// 普通の文字として取り込み
					buf += this.stream.char;
					this.stream.next();
					// 通常の文字列に戻る
					state = 'string';
					break;
				}
				case 'expr': {
					// 埋め込み式の終端記号が無いままEOFに達した
					if (this.stream.eof) {
						throw new AiScriptUnexpectedEOFError(pos);
					}
					// skip spasing
					if (spaceChars.includes(this.stream.char)) {
						this.stream.next();
						continue;
					}
					if (this.stream.char === '{') {
						exprBracketDepth++;
					}
					if ((this.stream.char as string) === '}') {
						// 埋め込み式の終了
						if (exprBracketDepth === 0) {
							elements.push(this.TOKEN(TokenKind.TemplateExprElement, elementPos, { hasLeftSpacing, children: tokenBuf }));
							// ここから文字列エレメントになるので位置を更新
							elementPos = this.stream.getPos();
							// TemplateExprElementトークンの終了位置をTokenStreamが取得するためのEOFトークンを追加
							tokenBuf.push(this.TOKEN(TokenKind.EOF, elementPos));
							tokenBuf = [];
							state = 'string';
							this.stream.next();
							break;
						}
						exprBracketDepth--;
					}
					const token = this.readToken();
					tokenBuf.push(token);
					break;
				}
			}
		}

		return this.TOKEN(TokenKind.Template, pos, { hasLeftSpacing, children: elements });
	}

	private skipEmptyLines(): void {
		while (!this.stream.eof) {
			// skip spacing
			if (spaceChars.includes(this.stream.char) || lineBreakChars.includes(this.stream.char)) {
				this.stream.next();
				continue;
			}

			const startPos = this.stream.getPos();
			if (this.stream.char === '/') {
				this.stream.next();
				if (!this.stream.eof && (this.stream.char as string) === '*') {
					this.stream.next();
					this.skipCommentRange(startPos);
					continue;
				} else if (!this.stream.eof && (this.stream.char as string) === '/') {
					this.stream.next();
					this.skipCommentLine(startPos);
					continue;
				} else {
					this.stream.prev();
					break;
				}
			}
			break;
		}
	}

	private skipCommentLine(startPos: TokenPosition): void {
		let content = '';
		while (true) {
			if (this.stream.eof) {
				break;
			}
			if (this.stream.char === '\n') {
				break;
			}
			content += this.stream.char;
			this.stream.next();
		}
		this.comments.push({
			type: 'line',
			start: startPos,
			end: this.stream.getPos(),
			content,
		});
	}

	private skipCommentRange(startPos: TokenPosition): void {
		let content = '';
		while (true) {
			if (this.stream.eof) {
				break;
			}
			if (this.stream.char === '*') {
				this.stream.next();
				if ((this.stream.char as string) === '/') {
					this.stream.next();
					this.comments.push({
						type: 'range',
						start: startPos,
						end: this.stream.getPos(),
						content,
					});
					break;
				}
				content += '*';
				continue;
			}
			content += this.stream.char;
			this.stream.next();
		}
	}

	private TOKEN(kind: TokenKind, pos: TokenPosition, opts?: { hasLeftSpacing?: boolean, value?: Token['value'], children?: Token['children'] }): Token {
		const comments = this.comments;
		if (comments.length === 0) {
			return TOKEN(kind, pos, opts);
		} else {
			this.comments = [];
			return TOKEN(kind, pos, { ...opts, leadingComments: comments });
		}
	}
}
