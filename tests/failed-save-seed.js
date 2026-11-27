module.exports = function (d, w) {
  /* a doodle saves only once something is drawn: dispatch a real stroke on the pad */
  var pad = d.getElementById("pad");
  if (!pad) return;
  function ev(type, x, y) {
    var e = new w.Event(type, { bubbles: true });
    Object.defineProperty(e, "clientX", { value: x });
    Object.defineProperty(e, "clientY", { value: y });
    return e;
  }
  pad.dispatchEvent(ev("pointerdown", 10, 10));
  pad.dispatchEvent(ev("pointermove", 40, 40));
  pad.dispatchEvent(ev("pointerup", 40, 40));
};
