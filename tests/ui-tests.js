#!/usr/bin/env node
/* ui-tests — the Daily Doodle page in a real DOM (jsdom). SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0 · (c) 2026 Dr Sohil Momin */
"use strict";
var fs = require("fs"), path = require("path"), { JSDOM } = require("jsdom");
var ROOT = path.join(__dirname, ".."), PLAY = path.join(ROOT, "docs", "play");
var passed = 0, failed = [];
function ok(n, c, d) { if (c) { passed++; return; } failed.push(n + (d ? " — " + d : "")); }
function eq(n, a, b) { ok(n, a === b, "expected " + JSON.stringify(b) + ", got " + JSON.stringify(a)); }
function build(seed) {
  var dom = new JSDOM(fs.readFileSync(path.join(PLAY, "index.html"), "utf8"), { url: "https://example.test/play/index.html", runScripts: "outside-only", pretendToBeVisual: true });
  var w = dom.window;
  if (seed) Object.keys(seed).forEach(function (k) { w.localStorage.setItem(k, seed[k]); });
  w.URL.createObjectURL = function () { return "blob:x"; }; w.URL.revokeObjectURL = function () {};
  w.HTMLAnchorElement.prototype.click = function () {};
  /* a canvas stub: jsdom has no 2d context */
  w.HTMLCanvasElement.prototype.getContext = function () {
    return { clearRect: function () {}, beginPath: function () {}, moveTo: function () {}, lineTo: function () {}, stroke: function () {}, set lineWidth(v) {}, set lineCap(v) {}, set lineJoin(v) {}, set strokeStyle(v) {} };
  };
  w.HTMLCanvasElement.prototype.getBoundingClientRect = function () { return { left: 0, top: 0, width: 900, height: 560 }; };
  ["web-kit.js", "export-kit.js", "doodle-core.js", "app.js"].forEach(function (f) { w.eval(fs.readFileSync(path.join(PLAY, f), "utf8")); });
  return dom;
}
var dom = build(null), w = dom.window, d = w.document, $ = function (id) { return d.getElementById(id); };
ok("the engine loaded", !!w.DoodleCore);
ok("the prompt is on the page", $("prompt").textContent.length > 4, $("prompt").textContent);
eq("the streak starts at zero", $("streakCount").textContent, "0 days");

$("saveBtn").click();
ok("saving an empty pad is refused", /Draw something first/.test($("status").textContent), $("status").textContent);

/* draw a stroke with pointer events */
function ev(type, x, y) {
  var e = new w.Event(type, { bubbles: true });
  Object.defineProperty(e, "clientX", { value: x });
  Object.defineProperty(e, "clientY", { value: y });
  return e;
}
$("pad").dispatchEvent(ev("pointerdown", 10, 10));
$("pad").dispatchEvent(ev("pointermove", 40, 40));
$("pad").dispatchEvent(ev("pointerup", 40, 40));
$("saveBtn").click();
ok("the doodle is kept", /Kept the doodle for/.test($("status").textContent), $("status").textContent);
eq("the streak reads one day", $("streakCount").textContent, "1 day");
ok("the book was written", !!w.localStorage.getItem("doodle:book"));

$("shareBtn").click();
ok("a share card is made", /Daily Doodle/.test($("shareCard").textContent), $("shareCard").textContent);
ok("with the prompt on it", $("shareCard").textContent.indexOf(w.DoodleCore.promptFor(Date.now())) >= 0);
ok("and nothing that ranks it", !/rank|score|best/i.test($("shareCard").textContent));

$("exportBtn").click();
ok("the book exports", /Wrote doodles-\d{4}-\d\d-\d\d\.json/.test($("ioNote").textContent), $("ioNote").textContent);

var saved = w.localStorage.getItem("doodle:book");
var dom2 = build({ "doodle:book": saved });
var d2 = dom2.window.document;
ok("the reload keeps the streak", /1 day/.test(d2.getElementById("streakCount").textContent), d2.getElementById("streakCount").textContent);
ok("and says today's doodle is kept", /as kept/.test(d2.getElementById("padSays").textContent), d2.getElementById("padSays").textContent);

/* a second doodle the same day needs a confirmation */
w.confirm = function () { return false; };
$("clearBtn").click();
$("pad").dispatchEvent(ev("pointerdown", 50, 50));
$("pad").dispatchEvent(ev("pointermove", 60, 60));
$("pad").dispatchEvent(ev("pointerup", 60, 60));
$("saveBtn").click();
ok("declining the confirmation keeps the first", /Kept the one already there/.test($("status").textContent), $("status").textContent);
w.confirm = function () { return true; };
$("saveBtn").click();
ok("confirming replaces it", /Replaced the doodle/.test($("status").textContent), $("status").textContent);

var dom3 = build({ "doodle:book": "{ broken book" });
var d3 = dom3.window.document;
ok("a broken book is reported", /cannot be read/.test(d3.getElementById("status").textContent));
ok("and not replaced with an empty one", /NOT replaced with an empty book/.test(d3.getElementById("status").textContent));

var dom4 = build(null), w4 = dom4.window, d4 = dom4.window.document;
Object.defineProperty(w4, "localStorage", { configurable: true, get: function () {
  return { getItem: function () { return null; }, setItem: function () { var e = new Error("q"); e.name = "QuotaExceededError"; throw e; }, removeItem: function () {}, clear: function () {} }; } });
d4.getElementById("pad").dispatchEvent(ev("pointerdown", 5, 5));
d4.getElementById("pad").dispatchEvent(ev("pointerup", 5, 5));
d4.getElementById("saveBtn").click();
ok("a failed save says NOT SAVED", /NOT SAVED:/.test(d4.getElementById("status").textContent), d4.getElementById("status").textContent);

var total = passed + failed.length;
if (!total) { console.error("ui-tests: 0 assertions ran."); process.exit(1); }
if (failed.length) { console.error("ui-tests: " + passed + "/" + total + " passed, " + failed.length + " FAILED"); failed.forEach(function (f) { console.error("  FAIL " + f); }); process.exit(1); }
console.log("ui-tests: " + passed + "/" + total + " assertions passed");
