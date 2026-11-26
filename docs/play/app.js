/* app — the Daily Doodle page. SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0 · (c) 2026 Dr Sohil Momin
 * Wiring only: the prompts, the streak and the one-per-day rule live in doodle-core.js. */
(function () {
  "use strict";
  var D = window.DoodleCore;
  var $ = function (id) { return document.getElementById(id); };
  var K = "doodle:book";
  var state = { store: D.emptyStore(), strokes: [], drawing: false, showing: null, unreadable: null };

  var els = {
    status: $("status"), todayLabel: $("todayLabel"), prompt: $("prompt"), pad: $("pad"),
    saveBtn: $("saveBtn"), clearBtn: $("clearBtn"), prevBtn: $("prevBtn"), padSays: $("padSays"),
    streakCount: $("streakCount"), streakSays: $("streakSays"), gapList: $("gapList"),
    shareBtn: $("shareBtn"), shareSays: $("shareSays"), shareCard: $("shareCard"),
    exportBtn: $("exportBtn"), ioNote: $("ioNote")
  };
  var ctx = els.pad.getContext("2d");
  var todayKey = D.dayKey(Date.now());

  function today() { var d = new Date(), p = function (n) { return (n < 10 ? "0" : "") + n; }; return p(d.getDate()) + "/" + p(d.getMonth() + 1) + "/" + d.getFullYear(); }
  function setStatus(k, m) { els.status.className = "status show " + k; els.status.textContent = m; }
  function node(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; }

  function persist() {
    try { window.localStorage.setItem(K, D.serialize(state.store)); return true; }
    catch (e) { setStatus("bad", "NOT SAVED: " + (e && e.name === "QuotaExceededError" ? "storage is full" : "storage is unavailable") + ". The drawing on screen is unchanged."); return false; }
  }

  function paint(strokes) {
    ctx.clearRect(0, 0, els.pad.width, els.pad.height);
    ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#1b1a17";
    (strokes || []).forEach(function (st) {
      if (!st.length) return;
      ctx.beginPath();
      ctx.moveTo(st[0][0], st[0][1]);
      for (var i = 1; i < st.length; i++) ctx.lineTo(st[i][0], st[i][1]);
      ctx.stroke();
    });
  }

  function renderStreak() {
    var s = D.streak(state.store, todayKey);
    els.streakCount.textContent = s.count + (s.count === 1 ? " day" : " days");
    els.streakSays.textContent = s.says;
    els.gapList.textContent = "";
    s.days.forEach(function (k) { els.gapList.appendChild(node("span", "hint", k.slice(5))); });
  }

  function save() {
    if (!state.strokes.length) { setStatus("bad", "Draw something first."); return; }
    var out = D.save(state.store, { day: todayKey, strokes: state.strokes, replace: false }, Date.now());
    if (!out.ok && out.needsConfirm) {
      var okToReplace = window.confirm("There is already a doodle for today. Replace it?");
      if (!okToReplace) { setStatus("warn", "Kept the one already there."); return; }
      out = D.save(state.store, { day: todayKey, strokes: state.strokes, replace: true }, Date.now());
    }
    if (!out.ok) { setStatus("bad", out.reason); return; }
    state.store = out.store;
    var saved = persist();
    renderStreak();
    if (saved) setStatus("ok", out.says);
  }

  function showLast() {
    var p = D.previous(state.store, todayKey);
    if (!p.ok) { setStatus("warn", p.reason); return; }
    state.showing = p.doodle.day;
    paint(p.doodle.strokes);
    els.padSays.textContent = "Showing " + p.doodle.day + " \u2014 \u201c" + p.doodle.prompt + "\u201d";
    setStatus("ok", p.says);
  }

  function clear() {
    state.strokes = []; state.showing = null;
    paint([]);
    els.padSays.textContent = "";
  }

  function makeCard() {
    var out = D.shareCard(state.store, todayKey);
    if (!out.ok) { setStatus("bad", out.reason); return; }
    els.shareCard.hidden = false;
    els.shareCard.textContent = out.card.text;
    els.shareSays.textContent = out.says;
    setStatus("ok", out.says);
  }

  function doExport() {
    var out = D.exportFile("book", { store: state.store }, { when: today() }, function (name, text, mime) {
      if (!window.Export || typeof window.Export.save !== "function") throw new Error("the export kit did not load");
      window.Export.save(name, text, mime); return true;
    });
    if (out.ok) { els.ioNote.textContent = "Wrote " + out.filename + "."; setStatus("ok", "Exported."); }
    else setStatus("bad", out.reason + ".");
  }

  /* drawing */
  function point(ev) {
    var r = els.pad.getBoundingClientRect();
    var x = (ev.clientX - r.left) * (els.pad.width / r.width);
    var y = (ev.clientY - r.top) * (els.pad.height / r.height);
    return [Math.round(x), Math.round(y)];
  }
  els.pad.addEventListener("pointerdown", function (ev) {
    state.drawing = true; state.showing = null;
    state.strokes.push([point(ev)]);
    paint(state.strokes);
  });
  els.pad.addEventListener("pointermove", function (ev) {
    if (!state.drawing) return;
    state.strokes[state.strokes.length - 1].push(point(ev));
    paint(state.strokes);
  });
  els.pad.addEventListener("pointerup", function () { state.drawing = false; });
  els.pad.addEventListener("pointerleave", function () { state.drawing = false; });

  els.saveBtn.addEventListener("click", save);
  els.clearBtn.addEventListener("click", clear);
  els.prevBtn.addEventListener("click", showLast);
  els.shareBtn.addEventListener("click", makeCard);
  els.exportBtn.addEventListener("click", doExport);

  els.todayLabel.textContent = D.dayText(Date.now());
  els.prompt.textContent = "\u201c" + D.promptFor(Date.now()) + "\u201d";

  var raw = null;
  try { raw = window.localStorage.getItem(K); } catch (e) { raw = null; }
  if (raw) {
    var parsed = D.parseState(raw);
    if (parsed.ok) state.store = parsed.store;
    else {
      state.unreadable = parsed;
      setStatus("bad", parsed.reason);
      var keep = node("button", "small", "Export the unreadable book");
      keep.addEventListener("click", function () {
        var out = D.exportFile("raw", parsed, { when: today() }, function (name, text, mime) {
          if (!window.Export || typeof window.Export.save !== "function") throw new Error("the export kit did not load");
          window.Export.save(name, text, mime); return true;
        });
        setStatus(out.ok ? "ok" : "bad", out.ok ? "Wrote " + out.filename + "." : out.reason);
      });
      els.ioNote.parentNode.insertBefore(keep, els.ioNote);
    }
  }

  var mine = state.store.doodles[todayKey];
  if (mine) { paint(mine.strokes); state.strokes = mine.strokes.map(function (s) { return s.slice(); }); els.padSays.textContent = "Today's doodle, as kept."; }
  renderStreak();
  if (window.Loom && window.Loom.pwa) window.Loom.pwa.register("sw.js");
})();
