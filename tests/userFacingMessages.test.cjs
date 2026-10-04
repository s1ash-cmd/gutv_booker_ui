const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { after, test } = require("node:test");

const root = path.resolve(__dirname, "..");
const compiled = mkdtempSync(path.join(tmpdir(), "gutv-messages-"));
after(() => rmSync(compiled, { recursive: true, force: true }));
execFileSync(
  path.join(root, "node_modules/.bin/tsc"),
  [
    "--ignoreConfig",
    "--target",
    "ES2022",
    "--module",
    "commonjs",
    "--skipLibCheck",
    "--outDir",
    compiled,
    path.join(root, "src/lib/userFacingMessages.ts"),
  ],
  { cwd: root, stdio: "pipe" },
);
const { getErrorMessage } = require(
  path.join(compiled, "userFacingMessages.js"),
);

test("GraphQL details take precedence and preserve distinct messages without metadata", () => {
  const error = new Error("Request failed");
  error.details = [
    {
      message: "Нет доступа",
      path: ["createBooking"],
      extensions: { code: "FORBIDDEN" },
    },
    { message: "Нет доступа" },
    { message: "Недостаточно техники" },
  ];
  assert.equal(
    getErrorMessage(error, "Ошибка"),
    "Нет доступа\nНедостаточно техники",
  );
});

test("validation field errors use the same extractor as GraphQL errors", () => {
  assert.equal(
    getErrorMessage(
      {
        details: {
          name: ["Название обязательно"],
          quantity: ["Количество должно быть больше 0"],
        },
      },
      "Ошибка",
    ),
    "Название обязательно\nКоличество должно быть больше 0",
  );
});

test("empty details fall back to the error message and unknown values use a local fallback", () => {
  assert.equal(
    getErrorMessage({ details: [], message: "  Сбой сети  " }, "Ошибка"),
    "Сбой сети",
  );
  for (const error of [
    null,
    undefined,
    42,
    "failure",
    {},
    { message: "  " },
    { message: 123 },
  ]) {
    assert.equal(
      getErrorMessage(error, "Не удалось сохранить"),
      "Не удалось сохранить",
    );
  }
});
