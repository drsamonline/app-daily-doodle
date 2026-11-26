/* doodle-core — the engine behind Daily Doodle.
 * SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
 * (c) 2026 Dr Sohil Momin
 *
 * ONE JOB: one drawing prompt a day, the drawing kept, a streak that counts, and a card you can share.
 *
 * It does NOT rank the drawings. There is no score, no vote, no gallery order — the app gives the prompt
 * and keeps the record, and that is the whole of it.
 *
 * The streak counts consecutive days ACTUALLY drawn: a missed day is a gap, not a filled slot, and the
 * nearest drawing is never borrowed to cover it.
 *
 * Pure functions: no DOM, no network, no storage. A doodle is a stroke list, not an image.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.DoodleCore = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var VERSION = "1.0.0";
  var DAY = 86400000;

  var PROMPTS = [
    "a chair you would not sit in",
    "the weather, as a shape",
    "your hand, badly",
    "a door in the wrong place",
    "the sound of a bus",
    "something with too many legs",
    "a room you remember",
    "the last thing you ate",
    "a bridge that could not work",
    "your street at 3am",
    "a machine for a small job",
    "the shape of a wait",
    "an animal that does not exist",
    "a cup that is also a hat",
    "the inside of a cloud"
  ];

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function clean(s) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim(); }
  function dayKey(ms) { var d = new Date(ms); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function dayText(ms) { var d = new Date(ms); return pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear(); }
  function fromKey(key) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || "")); return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime() : NaN; }

  /* The prompt is the same for everyone on a given date, and it is derived, not stored. */
  function promptFor(ms) {
    var key = dayKey(ms);
    var seed = 0;
    for (var i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) >>> 0;
    return PROMPTS[seed % PROMPTS.length];
  }

  function emptyStore() { return { doodles: {} }; }

  /* One doodle per date. A second is REFUSED unless the caller confirms the replacement — the spec allows
   * either, and this app refuses by default because losing a drawing should take a decision. */
  function save(store, input, now) {
    var at = now || Date.now();
    var key = clean(input && input.day) || dayKey(at);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return { ok: false, field: "day", reason: "a doodle needs a date" };
    var strokes = (input && input.strokes) || [];
    if (!Array.isArray(strokes) || !strokes.length) return { ok: false, field: "strokes", reason: "a doodle with no strokes is refused: there would be nothing kept" };
    var s = clone(store);
    if (s.doodles[key] && !(input && input.replace)) {
      return {
        ok: false, field: "day", needsConfirm: true, existing: s.doodles[key],
        reason: "there is already a doodle for " + key + ". Saving again would replace it, so it is refused until you confirm the replacement."
      };
    }
    var replaced = !!s.doodles[key];
    s.doodles[key] = { day: key, at: at, strokes: strokes.map(function (st) { return st.map(function (p) { return [Number(p[0]) || 0, Number(p[1]) || 0]; }); }), prompt: promptFor(fromKey(key)) };
    return { ok: true, store: s, doodle: s.doodles[key], replaced: replaced, says: (replaced ? "Replaced " : "Kept ") + "the doodle for " + key + "." };
  }

  /* Yesterday's doodle is one tap away. */
  function previous(store, key) {
    var at = fromKey(key);
    if (isNaN(at)) return { ok: false, reason: "that is not a date" };
    var keys = Object.keys((store && store.doodles) || {}).filter(function (k) { return k < key; }).sort();
    if (!keys.length) return { ok: false, reason: "there is no earlier doodle to show" };
    var last = keys[keys.length - 1];
    return { ok: true, doodle: store.doodles[last], gapDays: Math.round((at - fromKey(last)) / DAY), says: "The last one you drew was " + last + "." };
  }

  /* The streak: consecutive days ending at the given day, counting only days actually drawn. A missed day
   * is a gap, and the nearest drawing is never borrowed to fill it. */
  function streak(store, todayKey) {
    var keys = (store && store.doodles) || {};
    var end = todayKey;
    if (!keys[end]) {
      /* if today is not drawn, the streak ends at the most recent drawn day — it is not zero, and it is not
         counted through the gap either */
      var earlier = Object.keys(keys).filter(function (k) { return k < end; }).sort();
      if (!earlier.length) return { count: 0, days: [], gapToday: true, says: "No doodle yet, so there is no streak to count." };
      end = earlier[earlier.length - 1];
    }
    var days = [], cur = fromKey(end), count = 0;
    while (keys[dayKey(cur)]) { days.unshift(dayKey(cur)); count++; cur -= DAY; }
    /* a gap is simply: today has not been drawn */
    var gapToday = !keys[todayKey];
    return {
      count: count, days: days, last: days[days.length - 1] || "", gapToday: gapToday,
      says: count + " day(s) in a row, ending " + (days[days.length - 1] || "never") + "." + (gapToday ? " Today is a gap so far." : "")
    };
  }

  /* The share card: the prompt, the date and the drawing — and nothing that ranks it. */
  function shareCard(store, key) {
    var d = (store && store.doodles || {})[key];
    if (!d) return { ok: false, reason: "there is no doodle for that day to share" };
    return {
      ok: true,
      card: { day: key, prompt: d.prompt, strokes: d.strokes.length, text: "Daily Doodle \u2014 " + key + "\n\u201c" + d.prompt + "\u201d\n" + d.strokes.length + " stroke(s)." },
      says: "A card for " + key + ", with the prompt and the drawing."
    };
  }

  function clone(store) {
    var s = store || emptyStore();
    var out = { doodles: {} };
    Object.keys(s.doodles || {}).forEach(function (k) {
      var d = s.doodles[k];
      out.doodles[k] = { day: d.day, at: d.at || 0, prompt: d.prompt || "", strokes: (d.strokes || []).map(function (st) { return st.map(function (p) { return [p[0], p[1]]; }); }) };
    });
    return out;
  }

  function serialize(store) { return JSON.stringify({ version: VERSION, format: "doodle-1", store: clone(store) }, null, 2); }
  function parseState(text) {
    var raw = String(text == null ? "" : text);
    if (!raw.trim()) return { ok: false, empty: true, reason: "no doodle has been kept on this device yet", raw: raw };
    var data;
    try { data = JSON.parse(raw); }
    catch (e) { return { ok: false, unreadable: true, reason: "The saved doodles cannot be read. They were NOT replaced with an empty book \u2014 an empty book would look like a lost streak. Export it to keep it.", raw: raw }; }
    if (!data || !data.store || !data.store.doodles) return { ok: false, unreadable: true, reason: "The saved file holds no doodles. Nothing was started over it; export it to keep it.", raw: raw };
    return { ok: true, store: clone(data.store), raw: raw };
  }
  function stamp(when) { var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(when || "")); return m ? m[3] + "-" + m[2] + "-" + m[1] : "undated"; }
  function exportFile(what, payload, meta, writer) {
    meta = meta || {};
    if (typeof writer !== "function") return { ok: false, reason: "the file was not written: no writer is available in this browser" };
    var name, body, mime = "application/json";
    if (what === "book") { name = "doodles-" + stamp(meta.when) + ".json"; body = serialize(payload.store); }
    else if (what === "raw") { name = "doodles-unreadable-" + stamp(meta.when) + ".txt"; body = String(payload.raw || ""); mime = "text/plain;charset=utf-8"; }
    else return { ok: false, reason: "nothing was written: unknown export \u201c" + what + "\u201d" };
    try {
      var wrote = writer(name, body, mime);
      if (wrote === false) return { ok: false, filename: name, reason: "the file was not written: the browser refused the save" };
      return { ok: true, filename: name, bytes: body.length };
    } catch (e) {
      var why = e && e.name === "QuotaExceededError" ? "storage is full" : (e && e.message ? e.message : "storage is unavailable");
      return { ok: false, filename: name, reason: "the file was not written: " + why };
    }
  }

  return { version: VERSION, PROMPTS: PROMPTS, dayKey: dayKey, dayText: dayText, fromKey: fromKey,
    promptFor: promptFor, emptyStore: emptyStore, save: save, previous: previous, streak: streak,
    shareCard: shareCard, serialize: serialize, parseState: parseState, exportFile: exportFile };
});
