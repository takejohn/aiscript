- return文、break文、continue文の挙動が変更されました。
  - Fix: eval式やif式内でreturn文あるいはbreak文、continue文を使用すると不正な値が取り出せる不具合を修正しました。
  - return文は関数スコープ内でないと文法エラーになります。
  - ラベルが省略されたbreak文およびcontinue文は反復処理文(for, each, while, do-while, loop)のスコープ内でないと文法エラーになります。
  - return文は常に関数から脱出します。
  - ラベルが省略されたbreak文は必ず最も内側の反復処理文の処理を中断し、ループから脱出します。
  - continue文は必ず最も内側の反復処理文の処理を中断し、ループの先頭に戻ります。
  - eval, if, match, loop, while, do-while, for, eachにラベルを付けてbreak文やcontinue文で指定したブロックから脱出できるようになります。eval, if, matchから脱出するbreak文には値を指定することができます。
