"use strict";

// Safe arithmetic parser. It never uses eval(), Function(), or shell execution.
function tokenize(source) {
  const input = String(source || "").replace(/[×]/g, "*").replace(/[÷]/g, "/").replace(/,/g, ".");
  if (!input.trim() || input.length > 120) throw new Error("Hisob ifodasi bo‘sh yoki juda uzun.");
  const tokens = [];
  let index = 0;
  while (index < input.length) {
    if (/\s/.test(input[index])) { index++; continue; }
    const rest = input.slice(index);
    const number = rest.match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
    if (number) {
      const value = Number(number[0]);
      if (!Number.isFinite(value)) throw new Error("Son noto‘g‘ri.");
      tokens.push({ type: "number", value });
      index += number[0].length;
      continue;
    }
    const char = input[index];
    if ("+-*/%^()".includes(char)) {
      tokens.push({ type: char, value: char });
      index++;
      continue;
    }
    throw new Error("Ifodada ruxsat etilmagan belgi bor.");
  }
  return tokens;
}

function calculateExpression(source) {
  const tokens = tokenize(source);
  let position = 0;
  const peek = () => tokens[position];
  const take = type => {
    const token = peek();
    if (!token || token.type !== type) throw new Error("Matematik ifoda to‘liq yoki to‘g‘ri yozilmagan.");
    position++;
    return token;
  };
  const primary = () => {
    if (peek()?.type === "+") { position++; return primary(); }
    if (peek()?.type === "-") { position++; return -primary(); }
    if (peek()?.type === "(") {
      position++;
      const value = expression();
      take(")");
      return value;
    }
    return take("number").value;
  };
  const power = () => {
    const left = primary();
    if (peek()?.type === "^") { position++; return left ** power(); }
    return left;
  };
  const term = () => {
    let value = power();
    while (["*", "/", "%"].includes(peek()?.type)) {
      const operator = tokens[position++].type;
      const right = power();
      if ((operator === "/" || operator === "%") && right === 0) throw new Error("Nolga bo‘lish mumkin emas.");
      value = operator === "*" ? value * right : operator === "/" ? value / right : value % right;
    }
    return value;
  };
  const expression = () => {
    let value = term();
    while (["+", "-"].includes(peek()?.type)) {
      const operator = tokens[position++].type;
      const right = term();
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  };
  const result = expression();
  if (position !== tokens.length) throw new Error("Ifodaning ortiqcha qismi bor.");
  if (!Number.isFinite(result) || Math.abs(result) > 1e100) throw new Error("Natija hisoblash chegarasidan oshdi.");
  return Object.is(result, -0) ? 0 : result;
}

function findExpression(query) {
  const text = String(query || "").slice(0, 500);
  const beforeEquals = text.split("=")[0];
  const candidates = [beforeEquals, ...(text.match(/[\d.(),+\-*/×÷%^\s]{3,}/g) || [])];
  for (const candidate of candidates) {
    const value = candidate.trim().replace(/[?؟]+$/g, "").trim();
    if (!/[+*/×÷%^()-]/.test(value) || !/\d/.test(value)) continue;
    try {
      const result = calculateExpression(value);
      return { expression: value, result };
    } catch (_) {}
  }
  return null;
}

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toPrecision(12)));
}

module.exports = { calculateExpression, findExpression, formatNumber };
