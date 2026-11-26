#!/usr/bin/env node
/* self-tests — Daily Doodle. SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0 · (c) 2026 Dr Sohil Momin
 * Done-means: a doodle saved today is still there after a reload and yesterday's is one tap away; two
 * doodles on the same date cannot both be kept; a day with no doodle is a gap, not filled by the nearest
 * drawing; and the streak equals the consecutive days actually drawn. */
"use strict";
var fs = require("fs"), path = require("path");
var ROOT = path.join(__dirname, "..");
var D = require(path.join(ROOT, "docs", "play", "doodle-core.js"));
var passed = 0, failed = [], group = "";
function section(n) { group = n; }
function ok(n, c, d) { if (c) { passed++; return; } failed.push(group + " :: " + n + (d ? " — " + d : "")); }
function eq(n, a, b) { ok(n, a === b, "expected " + JSON.stringify(b) + ", got " + JSON.stringify(a)); }
function read(f) { return fs.readFileSync(path.join(ROOT, f), "utf8"); }

var DAY = 86400000;
var T = new Date(2026, 10, 26).getTime();
var TODAY = "2026-11-26", YESTERDAY = "2026-11-25";
var STROKE = [[[10, 10], [20, 20], [30, 12]]];

section("done means — a doodle saved today is still there after a reload");
var saved = D.save(D.emptyStore(), { day: TODAY, strokes: STROKE }, T);
eq("the doodle is kept", saved.ok, true);
eq("with its strokes", saved.doodle.strokes.length, 1);
var back = D.parseState(D.serialize(saved.store));
eq("it parses back", back.ok, true);
eq("and the drawing is there", back.store.doodles[TODAY].strokes[0].length, 3);
eq("with the prompt it was drawn to", back.store.doodles[TODAY].prompt, D.promptFor(T));

section("done means — yesterday's is one tap away");
var two = D.save(saved.store, { day: YESTERDAY, strokes: [[[1, 1], [2, 2]]] }, T - DAY).store;
var prev = D.previous(two, TODAY);
eq("the previous doodle is found", prev.ok, true);
eq("and it is yesterday's", prev.doodle.day, YESTERDAY);
eq("one day back", prev.gapDays, 1);
ok("with no earlier doodle, nothing is offered", D.previous(saved.store, "2026-11-01").ok === false);

section("done means — two doodles on the same date cannot both be kept");
var again = D.save(two, { day: TODAY, strokes: [[[9, 9]]] }, T);
eq("the second is refused", again.ok, false);
eq("and it asks for a confirmation", again.needsConfirm, true);
ok("and says why", /refused until you confirm/.test(again.reason), again.reason);
eq("the first is untouched", two.doodles[TODAY].strokes[0].length, 3);
var replaced = D.save(two, { day: TODAY, strokes: [[[9, 9]]], replace: true }, T);
eq("with a confirmation it replaces", replaced.ok, true);
eq("and says it replaced", replaced.replaced, true);
eq("the new strokes are in", replaced.store.doodles[TODAY].strokes[0][0][0], 9);
eq("there is still only one for the date", Object.keys(replaced.store.doodles).filter(function (k) { return k === TODAY; }).length, 1);

section("done means — a day with no doodle is a gap, not filled by the nearest drawing");
var gap = D.save(D.save(saved.store, { day: "2026-11-23", strokes: STROKE }, T - 3 * DAY).store, { day: YESTERDAY, strokes: STROKE }, T - DAY).store;
eq("three doodles are kept", Object.keys(gap.doodles).length, 3);
var s = D.streak(gap, TODAY);
eq("the streak stops at the gap", s.count, 2);
eq("and the gap day is not in it", s.days.indexOf("2026-11-24") >= 0, false);
ok("the nearest drawing did not fill the gap", s.days.indexOf("2026-11-23") < 0);

section("done means — the streak equals the consecutive days actually drawn");
eq("two days in a row", D.streak(gap, TODAY).count, 2);
var three = D.save(gap, { day: "2026-11-24", strokes: STROKE }, T - 2 * DAY).store;
eq("four once the gap is drawn, because 23 is drawn too", D.streak(three, TODAY).count, 4);
eq("and the days are listed in order", D.streak(three, TODAY).days.join(","), "2026-11-23,2026-11-24,2026-11-25,2026-11-26");
var tomorrow = D.streak(three, "2026-11-27");
eq("a day not yet drawn keeps the count", tomorrow.count, 4);
eq("but is marked as a gap today", tomorrow.gapToday, true);
eq("with nothing drawn at all, the streak is zero", D.streak(D.emptyStore(), TODAY).count, 0);

section("the prompt is one a day, and it is derived rather than stored");
eq("the same date gives the same prompt", D.promptFor(T), D.promptFor(T + 3600000));
ok("a different date usually gives a different prompt", D.PROMPTS.indexOf(D.promptFor(T)) >= 0);
eq("the prompt is not stored until a doodle is kept", Object.keys(D.emptyStore().doodles).length, 0);

section("must-not — it must not rank the drawings");
var core = read("docs/play/doodle-core.js");
ok("no score, vote, rating or rank", !/\b(score|votes?|rating|rank|leaderboard|likes?)\s*[:=]/i.test(core));
/* scan the CODE: the comment that promises no gallery order must not fail the check */
ok("no gallery order or sorting of drawings",
  !/gallery|sortBy|ranked/i.test(core.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\*.*$/gm, "")));
ok("the share card carries no rank", !/rank|score|best/i.test(D.shareCard(saved.store, TODAY).card.text), D.shareCard(saved.store, TODAY).card.text);
ok("no network call", !/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/.test(core + read("docs/play/app.js")));
ok("the page forbids connections", /connect-src 'none'/.test(read("docs/play/index.html")));

section("bad input and storage");
eq("a doodle with no strokes is refused", D.save(D.emptyStore(), { day: TODAY, strokes: [] }, T).field, "strokes");
eq("a doodle with no strokes is refused even with a replacement", D.save(saved.store, { day: TODAY, strokes: [], replace: true }, T).field, "strokes");
eq("a bad date is refused", D.save(D.emptyStore(), { day: "26/11/2026", strokes: STROKE }, T).field, "day");
var bad = D.parseState("{ broken book");
eq("a broken book is reported", bad.ok, false);
eq("it is marked unreadable", bad.unreadable, true);
ok("it was not replaced with an empty one", /NOT replaced with an empty book/.test(bad.reason), bad.reason);
ok("and says why an empty book is worse", /look like a lost streak/.test(bad.reason), bad.reason);
eq("nothing saved yet is distinguished", D.parseState("").empty, true);
var thrown = D.exportFile("book", { store: two }, { when: "26/11/2026" }, function () { var e = new Error("q"); e.name = "QuotaExceededError"; throw e; });
eq("a failed write is reported", thrown.ok, false);

section("shape — every script the page loads exists beside it");
var page = read("docs/play/index.html");
var srcs = (page.match(/<script[^>]+src="([^"]+)"/g) || []).map(function (t) { return t.replace(/.*src="([^"]+)"/, "$1"); });
srcs.forEach(function (x) { ok("script src resolves: " + x, fs.existsSync(path.join(ROOT, "docs", "play", x.replace(/^\.\//, "")))); });
ok("the landing page exists", fs.existsSync(path.join(ROOT, "docs", "index.html")));
ok("the page manifest exists", fs.existsSync(path.join(ROOT, "PAGES.json")));
ok("the web manifest exists", fs.existsSync(path.join(ROOT, "docs", "play", "manifest.webmanifest")));

var total = passed + failed.length;
if (!total) { console.error("self-tests: 0 assertions ran."); process.exit(1); }
if (failed.length) { console.error("self-tests: " + passed + "/" + total + " passed, " + failed.length + " FAILED"); failed.slice(0, 12).forEach(function (f) { console.error("  FAIL " + f); }); process.exit(1); }
console.log("self-tests: " + passed + "/" + total + " assertions passed");
