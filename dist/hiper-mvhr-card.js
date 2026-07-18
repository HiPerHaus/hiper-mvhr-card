/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const B = globalThis, tt = B.ShadowRoot && (B.ShadyCSS === void 0 || B.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, et = Symbol(), lt = /* @__PURE__ */ new WeakMap();
let Et = class {
  constructor(t, e, r) {
    if (this._$cssResult$ = !0, r !== et) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t, this.t = e;
  }
  get styleSheet() {
    let t = this.o;
    const e = this.t;
    if (tt && t === void 0) {
      const r = e !== void 0 && e.length === 1;
      r && (t = lt.get(e)), t === void 0 && ((this.o = t = new CSSStyleSheet()).replaceSync(this.cssText), r && lt.set(e, t));
    }
    return t;
  }
  toString() {
    return this.cssText;
  }
};
const Ht = (a) => new Et(typeof a == "string" ? a : a + "", void 0, et), Ct = (a, ...t) => {
  const e = a.length === 1 ? a[0] : t.reduce((r, i, o) => r + ((s) => {
    if (s._$cssResult$ === !0) return s.cssText;
    if (typeof s == "number") return s;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + s + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(i) + a[o + 1], a[0]);
  return new Et(e, a, et);
}, Lt = (a, t) => {
  if (tt) a.adoptedStyleSheets = t.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
  else for (const e of t) {
    const r = document.createElement("style"), i = B.litNonce;
    i !== void 0 && r.setAttribute("nonce", i), r.textContent = e.cssText, a.appendChild(r);
  }
}, ct = tt ? (a) => a : (a) => a instanceof CSSStyleSheet ? ((t) => {
  let e = "";
  for (const r of t.cssRules) e += r.cssText;
  return Ht(e);
})(a) : a;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const { is: Ut, defineProperty: Dt, getOwnPropertyDescriptor: It, getOwnPropertyNames: Bt, getOwnPropertySymbols: jt, getPrototypeOf: Vt } = Object, y = globalThis, dt = y.trustedTypes, Ft = dt ? dt.emptyScript : "", G = y.reactiveElementPolyfillSupport, M = (a, t) => a, j = { toAttribute(a, t) {
  switch (t) {
    case Boolean:
      a = a ? Ft : null;
      break;
    case Object:
    case Array:
      a = a == null ? a : JSON.stringify(a);
  }
  return a;
}, fromAttribute(a, t) {
  let e = a;
  switch (t) {
    case Boolean:
      e = a !== null;
      break;
    case Number:
      e = a === null ? null : Number(a);
      break;
    case Object:
    case Array:
      try {
        e = JSON.parse(a);
      } catch {
        e = null;
      }
  }
  return e;
} }, rt = (a, t) => !Ut(a, t), ut = { attribute: !0, type: String, converter: j, reflect: !1, useDefault: !1, hasChanged: rt };
Symbol.metadata ?? (Symbol.metadata = Symbol("metadata")), y.litPropertyMetadata ?? (y.litPropertyMetadata = /* @__PURE__ */ new WeakMap());
let C = class extends HTMLElement {
  static addInitializer(t) {
    this._$Ei(), (this.l ?? (this.l = [])).push(t);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t, e = ut) {
    if (e.state && (e.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(t) && ((e = Object.create(e)).wrapped = !0), this.elementProperties.set(t, e), !e.noAccessor) {
      const r = Symbol(), i = this.getPropertyDescriptor(t, r, e);
      i !== void 0 && Dt(this.prototype, t, i);
    }
  }
  static getPropertyDescriptor(t, e, r) {
    const { get: i, set: o } = It(this.prototype, t) ?? { get() {
      return this[e];
    }, set(s) {
      this[e] = s;
    } };
    return { get: i, set(s) {
      const n = i == null ? void 0 : i.call(this);
      o == null || o.call(this, s), this.requestUpdate(t, n, r);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(t) {
    return this.elementProperties.get(t) ?? ut;
  }
  static _$Ei() {
    if (this.hasOwnProperty(M("elementProperties"))) return;
    const t = Vt(this);
    t.finalize(), t.l !== void 0 && (this.l = [...t.l]), this.elementProperties = new Map(t.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(M("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(M("properties"))) {
      const e = this.properties, r = [...Bt(e), ...jt(e)];
      for (const i of r) this.createProperty(i, e[i]);
    }
    const t = this[Symbol.metadata];
    if (t !== null) {
      const e = litPropertyMetadata.get(t);
      if (e !== void 0) for (const [r, i] of e) this.elementProperties.set(r, i);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [e, r] of this.elementProperties) {
      const i = this._$Eu(e, r);
      i !== void 0 && this._$Eh.set(i, e);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(t) {
    const e = [];
    if (Array.isArray(t)) {
      const r = new Set(t.flat(1 / 0).reverse());
      for (const i of r) e.unshift(ct(i));
    } else t !== void 0 && e.push(ct(t));
    return e;
  }
  static _$Eu(t, e) {
    const r = e.attribute;
    return r === !1 ? void 0 : typeof r == "string" ? r : typeof t == "string" ? t.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = !1, this.hasUpdated = !1, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    var t;
    this._$ES = new Promise((e) => this.enableUpdating = e), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), (t = this.constructor.l) == null || t.forEach((e) => e(this));
  }
  addController(t) {
    var e;
    (this._$EO ?? (this._$EO = /* @__PURE__ */ new Set())).add(t), this.renderRoot !== void 0 && this.isConnected && ((e = t.hostConnected) == null || e.call(t));
  }
  removeController(t) {
    var e;
    (e = this._$EO) == null || e.delete(t);
  }
  _$E_() {
    const t = /* @__PURE__ */ new Map(), e = this.constructor.elementProperties;
    for (const r of e.keys()) this.hasOwnProperty(r) && (t.set(r, this[r]), delete this[r]);
    t.size > 0 && (this._$Ep = t);
  }
  createRenderRoot() {
    const t = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return Lt(t, this.constructor.elementStyles), t;
  }
  connectedCallback() {
    var t;
    this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this.enableUpdating(!0), (t = this._$EO) == null || t.forEach((e) => {
      var r;
      return (r = e.hostConnected) == null ? void 0 : r.call(e);
    });
  }
  enableUpdating(t) {
  }
  disconnectedCallback() {
    var t;
    (t = this._$EO) == null || t.forEach((e) => {
      var r;
      return (r = e.hostDisconnected) == null ? void 0 : r.call(e);
    });
  }
  attributeChangedCallback(t, e, r) {
    this._$AK(t, r);
  }
  _$ET(t, e) {
    var o;
    const r = this.constructor.elementProperties.get(t), i = this.constructor._$Eu(t, r);
    if (i !== void 0 && r.reflect === !0) {
      const s = (((o = r.converter) == null ? void 0 : o.toAttribute) !== void 0 ? r.converter : j).toAttribute(e, r.type);
      this._$Em = t, s == null ? this.removeAttribute(i) : this.setAttribute(i, s), this._$Em = null;
    }
  }
  _$AK(t, e) {
    var o, s;
    const r = this.constructor, i = r._$Eh.get(t);
    if (i !== void 0 && this._$Em !== i) {
      const n = r.getPropertyOptions(i), l = typeof n.converter == "function" ? { fromAttribute: n.converter } : ((o = n.converter) == null ? void 0 : o.fromAttribute) !== void 0 ? n.converter : j;
      this._$Em = i;
      const u = l.fromAttribute(e, n.type);
      this[i] = u ?? ((s = this._$Ej) == null ? void 0 : s.get(i)) ?? u, this._$Em = null;
    }
  }
  requestUpdate(t, e, r, i = !1, o) {
    var s;
    if (t !== void 0) {
      const n = this.constructor;
      if (i === !1 && (o = this[t]), r ?? (r = n.getPropertyOptions(t)), !((r.hasChanged ?? rt)(o, e) || r.useDefault && r.reflect && o === ((s = this._$Ej) == null ? void 0 : s.get(t)) && !this.hasAttribute(n._$Eu(t, r)))) return;
      this.C(t, e, r);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$EP());
  }
  C(t, e, { useDefault: r, reflect: i, wrapped: o }, s) {
    r && !(this._$Ej ?? (this._$Ej = /* @__PURE__ */ new Map())).has(t) && (this._$Ej.set(t, s ?? e ?? this[t]), o !== !0 || s !== void 0) || (this._$AL.has(t) || (this.hasUpdated || r || (e = void 0), this._$AL.set(t, e)), i === !0 && this._$Em !== t && (this._$Eq ?? (this._$Eq = /* @__PURE__ */ new Set())).add(t));
  }
  async _$EP() {
    this.isUpdatePending = !0;
    try {
      await this._$ES;
    } catch (e) {
      Promise.reject(e);
    }
    const t = this.scheduleUpdate();
    return t != null && await t, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    var r;
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this._$Ep) {
        for (const [o, s] of this._$Ep) this[o] = s;
        this._$Ep = void 0;
      }
      const i = this.constructor.elementProperties;
      if (i.size > 0) for (const [o, s] of i) {
        const { wrapped: n } = s, l = this[o];
        n !== !0 || this._$AL.has(o) || l === void 0 || this.C(o, void 0, s, l);
      }
    }
    let t = !1;
    const e = this._$AL;
    try {
      t = this.shouldUpdate(e), t ? (this.willUpdate(e), (r = this._$EO) == null || r.forEach((i) => {
        var o;
        return (o = i.hostUpdate) == null ? void 0 : o.call(i);
      }), this.update(e)) : this._$EM();
    } catch (i) {
      throw t = !1, this._$EM(), i;
    }
    t && this._$AE(e);
  }
  willUpdate(t) {
  }
  _$AE(t) {
    var e;
    (e = this._$EO) == null || e.forEach((r) => {
      var i;
      return (i = r.hostUpdated) == null ? void 0 : i.call(r);
    }), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(t)), this.updated(t);
  }
  _$EM() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = !1;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(t) {
    return !0;
  }
  update(t) {
    this._$Eq && (this._$Eq = this._$Eq.forEach((e) => this._$ET(e, this[e]))), this._$EM();
  }
  updated(t) {
  }
  firstUpdated(t) {
  }
};
C.elementStyles = [], C.shadowRootOptions = { mode: "open" }, C[M("elementProperties")] = /* @__PURE__ */ new Map(), C[M("finalized")] = /* @__PURE__ */ new Map(), G == null || G({ ReactiveElement: C }), (y.reactiveElementVersions ?? (y.reactiveElementVersions = [])).push("2.1.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const P = globalThis, pt = (a) => a, V = P.trustedTypes, ht = V ? V.createPolicy("lit-html", { createHTML: (a) => a }) : void 0, Rt = "$lit$", x = `lit$${Math.random().toFixed(9).slice(2)}$`, Tt = "?" + x, qt = `<${Tt}>`, S = document, N = () => S.createComment(""), H = (a) => a === null || typeof a != "object" && typeof a != "function", it = Array.isArray, Yt = (a) => it(a) || typeof (a == null ? void 0 : a[Symbol.iterator]) == "function", X = `[ 	
\f\r]`, z = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, mt = /-->/g, _t = />/g, $ = RegExp(`>|${X}(?:([^\\s"'>=/]+)(${X}*=${X}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), ft = /'/g, gt = /"/g, Ot = /^(?:script|style|textarea|title)$/i, Wt = (a) => (t, ...e) => ({ _$litType$: a, strings: t, values: e }), c = Wt(1), T = Symbol.for("lit-noChange"), _ = Symbol.for("lit-nothing"), vt = /* @__PURE__ */ new WeakMap(), A = S.createTreeWalker(S, 129);
function zt(a, t) {
  if (!it(a) || !a.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return ht !== void 0 ? ht.createHTML(t) : t;
}
const Gt = (a, t) => {
  const e = a.length - 1, r = [];
  let i, o = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", s = z;
  for (let n = 0; n < e; n++) {
    const l = a[n];
    let u, d, p = -1, h = 0;
    for (; h < l.length && (s.lastIndex = h, d = s.exec(l), d !== null); ) h = s.lastIndex, s === z ? d[1] === "!--" ? s = mt : d[1] !== void 0 ? s = _t : d[2] !== void 0 ? (Ot.test(d[2]) && (i = RegExp("</" + d[2], "g")), s = $) : d[3] !== void 0 && (s = $) : s === $ ? d[0] === ">" ? (s = i ?? z, p = -1) : d[1] === void 0 ? p = -2 : (p = s.lastIndex - d[2].length, u = d[1], s = d[3] === void 0 ? $ : d[3] === '"' ? gt : ft) : s === gt || s === ft ? s = $ : s === mt || s === _t ? s = z : (s = $, i = void 0);
    const m = s === $ && a[n + 1].startsWith("/>") ? " " : "";
    o += s === z ? l + qt : p >= 0 ? (r.push(u), l.slice(0, p) + Rt + l.slice(p) + x + m) : l + x + (p === -2 ? n : m);
  }
  return [zt(a, o + (a[e] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
};
class L {
  constructor({ strings: t, _$litType$: e }, r) {
    let i;
    this.parts = [];
    let o = 0, s = 0;
    const n = t.length - 1, l = this.parts, [u, d] = Gt(t, e);
    if (this.el = L.createElement(u, r), A.currentNode = this.el.content, e === 2 || e === 3) {
      const p = this.el.content.firstChild;
      p.replaceWith(...p.childNodes);
    }
    for (; (i = A.nextNode()) !== null && l.length < n; ) {
      if (i.nodeType === 1) {
        if (i.hasAttributes()) for (const p of i.getAttributeNames()) if (p.endsWith(Rt)) {
          const h = d[s++], m = i.getAttribute(p).split(x), g = /([.?@])?(.*)/.exec(h);
          l.push({ type: 1, index: o, name: g[2], strings: m, ctor: g[1] === "." ? Qt : g[1] === "?" ? Zt : g[1] === "@" ? Jt : q }), i.removeAttribute(p);
        } else p.startsWith(x) && (l.push({ type: 6, index: o }), i.removeAttribute(p));
        if (Ot.test(i.tagName)) {
          const p = i.textContent.split(x), h = p.length - 1;
          if (h > 0) {
            i.textContent = V ? V.emptyScript : "";
            for (let m = 0; m < h; m++) i.append(p[m], N()), A.nextNode(), l.push({ type: 2, index: ++o });
            i.append(p[h], N());
          }
        }
      } else if (i.nodeType === 8) if (i.data === Tt) l.push({ type: 2, index: o });
      else {
        let p = -1;
        for (; (p = i.data.indexOf(x, p + 1)) !== -1; ) l.push({ type: 7, index: o }), p += x.length - 1;
      }
      o++;
    }
  }
  static createElement(t, e) {
    const r = S.createElement("template");
    return r.innerHTML = t, r;
  }
}
function O(a, t, e = a, r) {
  var s, n;
  if (t === T) return t;
  let i = r !== void 0 ? (s = e._$Co) == null ? void 0 : s[r] : e._$Cl;
  const o = H(t) ? void 0 : t._$litDirective$;
  return (i == null ? void 0 : i.constructor) !== o && ((n = i == null ? void 0 : i._$AO) == null || n.call(i, !1), o === void 0 ? i = void 0 : (i = new o(a), i._$AT(a, e, r)), r !== void 0 ? (e._$Co ?? (e._$Co = []))[r] = i : e._$Cl = i), i !== void 0 && (t = O(a, i._$AS(a, t.values), i, r)), t;
}
class Xt {
  constructor(t, e) {
    this._$AV = [], this._$AN = void 0, this._$AD = t, this._$AM = e;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t) {
    const { el: { content: e }, parts: r } = this._$AD, i = ((t == null ? void 0 : t.creationScope) ?? S).importNode(e, !0);
    A.currentNode = i;
    let o = A.nextNode(), s = 0, n = 0, l = r[0];
    for (; l !== void 0; ) {
      if (s === l.index) {
        let u;
        l.type === 2 ? u = new D(o, o.nextSibling, this, t) : l.type === 1 ? u = new l.ctor(o, l.name, l.strings, this, t) : l.type === 6 && (u = new Kt(o, this, t)), this._$AV.push(u), l = r[++n];
      }
      s !== (l == null ? void 0 : l.index) && (o = A.nextNode(), s++);
    }
    return A.currentNode = S, i;
  }
  p(t) {
    let e = 0;
    for (const r of this._$AV) r !== void 0 && (r.strings !== void 0 ? (r._$AI(t, r, e), e += r.strings.length - 2) : r._$AI(t[e])), e++;
  }
}
class D {
  get _$AU() {
    var t;
    return ((t = this._$AM) == null ? void 0 : t._$AU) ?? this._$Cv;
  }
  constructor(t, e, r, i) {
    this.type = 2, this._$AH = _, this._$AN = void 0, this._$AA = t, this._$AB = e, this._$AM = r, this.options = i, this._$Cv = (i == null ? void 0 : i.isConnected) ?? !0;
  }
  get parentNode() {
    let t = this._$AA.parentNode;
    const e = this._$AM;
    return e !== void 0 && (t == null ? void 0 : t.nodeType) === 11 && (t = e.parentNode), t;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t, e = this) {
    t = O(this, t, e), H(t) ? t === _ || t == null || t === "" ? (this._$AH !== _ && this._$AR(), this._$AH = _) : t !== this._$AH && t !== T && this._(t) : t._$litType$ !== void 0 ? this.$(t) : t.nodeType !== void 0 ? this.T(t) : Yt(t) ? this.k(t) : this._(t);
  }
  O(t) {
    return this._$AA.parentNode.insertBefore(t, this._$AB);
  }
  T(t) {
    this._$AH !== t && (this._$AR(), this._$AH = this.O(t));
  }
  _(t) {
    this._$AH !== _ && H(this._$AH) ? this._$AA.nextSibling.data = t : this.T(S.createTextNode(t)), this._$AH = t;
  }
  $(t) {
    var o;
    const { values: e, _$litType$: r } = t, i = typeof r == "number" ? this._$AC(t) : (r.el === void 0 && (r.el = L.createElement(zt(r.h, r.h[0]), this.options)), r);
    if (((o = this._$AH) == null ? void 0 : o._$AD) === i) this._$AH.p(e);
    else {
      const s = new Xt(i, this), n = s.u(this.options);
      s.p(e), this.T(n), this._$AH = s;
    }
  }
  _$AC(t) {
    let e = vt.get(t.strings);
    return e === void 0 && vt.set(t.strings, e = new L(t)), e;
  }
  k(t) {
    it(this._$AH) || (this._$AH = [], this._$AR());
    const e = this._$AH;
    let r, i = 0;
    for (const o of t) i === e.length ? e.push(r = new D(this.O(N()), this.O(N()), this, this.options)) : r = e[i], r._$AI(o), i++;
    i < e.length && (this._$AR(r && r._$AB.nextSibling, i), e.length = i);
  }
  _$AR(t = this._$AA.nextSibling, e) {
    var r;
    for ((r = this._$AP) == null ? void 0 : r.call(this, !1, !0, e); t !== this._$AB; ) {
      const i = pt(t).nextSibling;
      pt(t).remove(), t = i;
    }
  }
  setConnected(t) {
    var e;
    this._$AM === void 0 && (this._$Cv = t, (e = this._$AP) == null || e.call(this, t));
  }
}
class q {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t, e, r, i, o) {
    this.type = 1, this._$AH = _, this._$AN = void 0, this.element = t, this.name = e, this._$AM = i, this.options = o, r.length > 2 || r[0] !== "" || r[1] !== "" ? (this._$AH = Array(r.length - 1).fill(new String()), this.strings = r) : this._$AH = _;
  }
  _$AI(t, e = this, r, i) {
    const o = this.strings;
    let s = !1;
    if (o === void 0) t = O(this, t, e, 0), s = !H(t) || t !== this._$AH && t !== T, s && (this._$AH = t);
    else {
      const n = t;
      let l, u;
      for (t = o[0], l = 0; l < o.length - 1; l++) u = O(this, n[r + l], e, l), u === T && (u = this._$AH[l]), s || (s = !H(u) || u !== this._$AH[l]), u === _ ? t = _ : t !== _ && (t += (u ?? "") + o[l + 1]), this._$AH[l] = u;
    }
    s && !i && this.j(t);
  }
  j(t) {
    t === _ ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t ?? "");
  }
}
class Qt extends q {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t) {
    this.element[this.name] = t === _ ? void 0 : t;
  }
}
class Zt extends q {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t) {
    this.element.toggleAttribute(this.name, !!t && t !== _);
  }
}
class Jt extends q {
  constructor(t, e, r, i, o) {
    super(t, e, r, i, o), this.type = 5;
  }
  _$AI(t, e = this) {
    if ((t = O(this, t, e, 0) ?? _) === T) return;
    const r = this._$AH, i = t === _ && r !== _ || t.capture !== r.capture || t.once !== r.once || t.passive !== r.passive, o = t !== _ && (r === _ || i);
    i && this.element.removeEventListener(this.name, this, r), o && this.element.addEventListener(this.name, this, t), this._$AH = t;
  }
  handleEvent(t) {
    var e;
    typeof this._$AH == "function" ? this._$AH.call(((e = this.options) == null ? void 0 : e.host) ?? this.element, t) : this._$AH.handleEvent(t);
  }
}
class Kt {
  constructor(t, e, r) {
    this.element = t, this.type = 6, this._$AN = void 0, this._$AM = e, this.options = r;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t) {
    O(this, t);
  }
}
const Q = P.litHtmlPolyfillSupport;
Q == null || Q(L, D), (P.litHtmlVersions ?? (P.litHtmlVersions = [])).push("3.3.3");
const te = (a, t, e) => {
  const r = (e == null ? void 0 : e.renderBefore) ?? t;
  let i = r._$litPart$;
  if (i === void 0) {
    const o = (e == null ? void 0 : e.renderBefore) ?? null;
    r._$litPart$ = i = new D(t.insertBefore(N(), o), o, void 0, e ?? {});
  }
  return i._$AI(a), i;
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const k = globalThis;
class R extends C {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    var e;
    const t = super.createRenderRoot();
    return (e = this.renderOptions).renderBefore ?? (e.renderBefore = t.firstChild), t;
  }
  update(t) {
    const e = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t), this._$Do = te(e, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    var t;
    super.connectedCallback(), (t = this._$Do) == null || t.setConnected(!0);
  }
  disconnectedCallback() {
    var t;
    super.disconnectedCallback(), (t = this._$Do) == null || t.setConnected(!1);
  }
  render() {
    return T;
  }
}
var St;
R._$litElement$ = !0, R.finalized = !0, (St = k.litElementHydrateSupport) == null || St.call(k, { LitElement: R });
const Z = k.litElementPolyfillSupport;
Z == null || Z({ LitElement: R });
(k.litElementVersions ?? (k.litElementVersions = [])).push("4.2.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const ee = { attribute: !0, type: String, converter: j, reflect: !1, hasChanged: rt }, re = (a = ee, t, e) => {
  const { kind: r, metadata: i } = e;
  let o = globalThis.litPropertyMetadata.get(i);
  if (o === void 0 && globalThis.litPropertyMetadata.set(i, o = /* @__PURE__ */ new Map()), r === "setter" && ((a = Object.create(a)).wrapped = !0), o.set(e.name, a), r === "accessor") {
    const { name: s } = e;
    return { set(n) {
      const l = t.get.call(this);
      t.set.call(this, n), this.requestUpdate(s, l, a, !0, n);
    }, init(n) {
      return n !== void 0 && this.C(s, void 0, a, n), n;
    } };
  }
  if (r === "setter") {
    const { name: s } = e;
    return function(n) {
      const l = this[s];
      t.call(this, n), this.requestUpdate(s, l, a, !0, n);
    };
  }
  throw Error("Unsupported decorator location: " + r);
};
function ot(a) {
  return (t, e) => typeof e == "object" ? re(a, t, e) : ((r, i, o) => {
    const s = i.hasOwnProperty(o);
    return i.constructor.createProperty(o, r), s ? Object.getOwnPropertyDescriptor(i, o) : void 0;
  })(a, t, e);
}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
function Y(a) {
  return ot({ ...a, state: !0, attribute: !1 });
}
const ie = {
  id: "altair",
  name: "Altair 160",
  vendor: "Altair",
  models: ["160"],
  supportedRoles: {
    mode: {},
    effective_mode: {},
    outdoor_air_temp: {},
    supply_air_temp: {},
    extract_air_temp: {},
    exhaust_air_temp: {},
    supply_airflow: {},
    extract_airflow: {},
    airflow: {},
    target_airflow: {},
    mapped_level: {},
    supply_fan_speed: {},
    extract_fan_speed: {},
    indoor_humidity: {},
    filter_remaining: {},
    boost_active: {},
    boost_remaining: {},
    boost_duration: {},
    start_boost: {},
    cancel_boost: {},
    override_duration: {},
    override_remaining: {},
    clear_override: {},
    calibration_result: {},
    calibration_status: {},
    calibration_progress: {},
    last_calibration: {},
    fault_active: {},
    frost_protection_active: {},
    // The Altair HA integration's shower-triggered auto-boost feature
    // exposes these three diagnostic entities (binary_sensor.altair_shower_detected,
    // sensor.altair_shower_trigger_temperature) plus the ESPHome pipe sensor
    // a user wires in themselves — see ha-altair-mvhr's shower_detector.py.
    shower_detected: {},
    shower_trigger_temperature: {},
    shower_pipe_temperature: {}
    // bypass_state is intentionally absent — see unsupportedRoles below.
  },
  // Confirmed product fact, not a "not configured yet" default: the Altair
  // 160 has no summer bypass. See docs/manufacturers/altair.md.
  unsupportedRoles: ["bypass_state"]
}, oe = {
  id: "zehnder-comfoair-q",
  // Self-contained display name (shown alone in the card header, Phase 2) —
  // includes the brand so it reads correctly without needing `vendor`
  // concatenated alongside it.
  name: "Zehnder ComfoAir Q",
  vendor: "Zehnder",
  models: ["Q350", "Q450", "Q600"],
  supportedRoles: {
    mode: {},
    outdoor_air_temp: {},
    supply_air_temp: {},
    extract_air_temp: {},
    exhaust_air_temp: {},
    supply_airflow: {},
    extract_airflow: {},
    bypass_state: {},
    filter_remaining: {},
    fault_active: {},
    frost_protection_active: {}
  }
}, ae = {
  id: "vent_axia_sentinel_econiq",
  name: "Aerofresh",
  vendor: "Aerofresh",
  models: ["300", "450"],
  supportedRoles: {
    mode: {},
    outdoor_air_temp: {},
    supply_air_temp: {},
    extract_air_temp: {},
    exhaust_air_temp: {},
    supply_airflow: {},
    extract_airflow: {},
    bypass_state: {},
    filter_remaining: {},
    fault_active: {},
    frost_protection_active: {}
  }
}, se = {
  id: "generic",
  name: "Generic MVHR",
  vendor: "Generic",
  supportedRoles: {}
}, K = [
  "altair",
  "zehnder-comfoair-q",
  "vent_axia_sentinel_econiq",
  "generic"
], ne = {
  altair: ie,
  "zehnder-comfoair-q": oe,
  vent_axia_sentinel_econiq: ae,
  generic: se
};
function Mt(a) {
  return ne[a];
}
var le = Object.defineProperty, Pt = (a, t, e, r) => {
  for (var i = void 0, o = a.length - 1, s; o >= 0; o--)
    (s = a[o]) && (i = s(t, e, i) || i);
  return i && le(t, e, i), i;
};
const bt = "hiper-mvhr-card-editor", st = class st extends R {
  setConfig(t) {
    this._config = { ...t };
  }
  render() {
    const t = this._config ?? {};
    return c`
      <div class="editor">
        ${this._textField("Title", "title", t.title)}
        ${this._textField("Subtitle", "subtitle", t.subtitle)}
        <label>
          <span>Manufacturer</span>
          <select
            .value=${t.manufacturer ?? "generic"}
            @change=${(e) => this._set("manufacturer", e.currentTarget.value)}
          >
            ${K.map(
      (e) => c`<option .value=${e}>${e}</option>`
    )}
          </select>
        </label>
        <label>
          <span>Display mode</span>
          <select
            .value=${t.display_mode ?? "homeowner"}
            @change=${(e) => this._set("display_mode", e.currentTarget.value)}
          >
            <option value="homeowner">homeowner</option>
            <option value="detailed">detailed</option>
            <option value="system">system</option>
          </select>
        </label>
        <label>
          <span>Heat recovery</span>
          <select
            .value=${t.heat_recovery_method ?? "automatic"}
            @change=${(e) => this._set("heat_recovery_method", e.currentTarget.value)}
          >
            <option value="automatic">automatic</option>
            <option value="supply_temperature">supply_temperature</option>
            <option value="disabled">disabled</option>
          </select>
        </label>
        <label>
          <span>Filter max days</span>
          <input
            type="number"
            min="1"
            step="1"
            .value=${String(t.filter_max_days ?? 365)}
            @change=${(e) => this._set("filter_max_days", Number(e.currentTarget.value))}
          />
        </label>
        <div class="toggles">
          ${this._checkbox("Show controls", "show_controls", t.show_controls !== !1)}
          ${this._checkbox("Show fan speeds", "show_fan_speeds", t.show_fan_speeds !== !1)}
          ${this._checkbox("Show filter", "show_filter", t.show_filter !== !1)}
          ${this._checkbox("Show calibration", "show_calibration", t.show_calibration !== !1)}
          ${this._checkbox(
      "Airflow on all paths",
      "show_airflow_on_all_paths",
      t.show_airflow_on_all_paths === !0
    )}
          ${this._checkbox(
      "Show airflow animation (system mode)",
      "show_airflow_animation",
      t.show_airflow_animation !== !1
    )}
          ${this._checkbox(
      "Show advanced controls (system mode)",
      "show_advanced_controls",
      t.show_advanced_controls !== !1
    )}
        </div>
      </div>
    `;
  }
  _textField(t, e, r) {
    return c`
      <label>
        <span>${t}</span>
        <input
          .value=${r ?? ""}
          @input=${(i) => this._set(e, i.currentTarget.value)}
        />
      </label>
    `;
  }
  _checkbox(t, e, r) {
    return c`
      <label class="check">
        <input
          type="checkbox"
          .checked=${r}
          @change=${(i) => this._set(e, i.currentTarget.checked)}
        />
        <span>${t}</span>
      </label>
    `;
  }
  _set(t, e) {
    const r = { ...this._config ?? {}, [t]: e };
    this._config = r, this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: r },
        bubbles: !0,
        composed: !0
      })
    );
  }
};
st.styles = Ct`
    .editor {
      display: grid;
      gap: 12px;
      padding: 8px 0;
    }
    label {
      display: grid;
      gap: 4px;
      color: var(--secondary-text-color);
      font-size: 0.9em;
    }
    input,
    select {
      box-sizing: border-box;
      width: 100%;
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      padding: 8px 10px;
      color: var(--primary-text-color);
      background: var(--ha-card-background, var(--card-background-color));
      font: inherit;
    }
    .toggles {
      display: grid;
      gap: 8px;
    }
    .check {
      grid-template-columns: auto 1fr;
      align-items: center;
    }
    .check input {
      width: auto;
    }
  `;
let U = st;
Pt([
  ot({ attribute: !1 })
], U.prototype, "hass");
Pt([
  Y()
], U.prototype, "_config");
customElements.get(bt) || customElements.define(bt, U);
const at = [
  "mode",
  "effective_mode",
  "outdoor_air_temp",
  "supply_air_temp",
  "extract_air_temp",
  "exhaust_air_temp",
  "supply_airflow",
  "extract_airflow",
  "airflow",
  "target_airflow",
  "mapped_level",
  "supply_fan_speed",
  "extract_fan_speed",
  "indoor_humidity",
  "boost_active",
  "boost_remaining",
  "boost_duration",
  "start_boost",
  "cancel_boost",
  "override_duration",
  "override_remaining",
  "clear_override",
  "calibration_result",
  "calibration_status",
  "calibration_progress",
  "last_calibration",
  "bypass_state",
  // Added in Phase 2 for the system status section (ROADMAP.md Phase 2) —
  // all three already existed in the full SPECIFICATION.md §2 table, this
  // just promotes them into the implemented subset.
  "filter_remaining",
  "fault_active",
  "frost_protection_active",
  // Added in Phase 3A (ROADMAP.md) — the first interactive/action role. A
  // fire-and-forget "press" action with no value to read back (see
  // src/data/control-dispatcher.ts), unlike every role above. Only the
  // `generic` profile declares it supported today (opt-in via
  // feature_flags): filter resettability is still TBD for Altair, Zehnder,
  // and Aerofresh per their docs/manufacturers/*.md — see SPECIFICATION.md §3.
  // `mode_control` and `bypass_control` are specified in SPECIFICATION.md §2
  // but deliberately NOT added here yet — Phase 3B/3C, once mode/bypass
  // optimistic-value reconciliation exists to support them meaningfully.
  "filter_reset_control",
  // Added for the system-mode visual redesign's shower-detection panel: a
  // generic "was a shower just detected, and what temperature triggered/will
  // rearm it" concept, not an Altair-only idea — any manufacturer profile
  // that wires up an equivalent detector can declare these supported the
  // same way Altair does. `shower_pipe_temperature` is the raw hot-water
  // pipe sensor feeding the detector (typically a foreign/ESPHome entity,
  // not part of the MVHR integration itself, but still just an optional
  // role like any other); `shower_trigger_temperature` is the stored pipe
  // temperature at the moment a shower was detected, from which the
  // component derives the rearm temperature (trigger - 10°C) — that
  // subtraction is fixed, generic UI math describing what these two roles
  // mean together, not a manufacturer conditional.
  "shower_detected",
  "shower_trigger_temperature",
  "shower_pipe_temperature"
];
class v extends Error {
  constructor(t) {
    super(t), this.name = "ConfigValidationError";
  }
}
const ce = "homeowner", xt = ["homeowner", "detailed", "system"], yt = ["automatic", "supply_temperature", "disabled"];
function wt(a) {
  return at.includes(a);
}
const de = {
  supply_temperature: "supply_air_temp",
  extract_temperature: "extract_air_temp",
  outdoor_temperature: "outdoor_air_temp",
  exhaust_temperature: "exhaust_air_temp",
  filter_days: "filter_remaining",
  filter_days_remaining: "filter_remaining",
  supply_fan: "supply_fan_speed",
  extract_fan: "extract_fan_speed",
  last_airflow_calibration: "last_calibration"
};
function ue(a) {
  if (!a || typeof a != "object" || Array.isArray(a))
    throw new v("hiper-mvhr-card: configuration must be an object");
  const t = a;
  if (typeof t.manufacturer != "string" || t.manufacturer.length === 0)
    throw new v('hiper-mvhr-card: "manufacturer" is required');
  if (!K.includes(t.manufacturer))
    throw new v(
      `hiper-mvhr-card: unknown manufacturer "${t.manufacturer}". Supported: ${K.join(", ")}`
    );
  const e = t.manufacturer, r = t.display_mode ?? ce;
  if (!xt.includes(r))
    throw new v(
      `hiper-mvhr-card: invalid "display_mode" value "${String(t.display_mode)}". Expected one of: ${xt.join(", ")}`
    );
  if (t.name !== void 0 && typeof t.name != "string")
    throw new v('hiper-mvhr-card: "name" must be a string if provided');
  if (t.title !== void 0 && typeof t.title != "string")
    throw new v('hiper-mvhr-card: "title" must be a string if provided');
  if (t.subtitle !== void 0 && typeof t.subtitle != "string")
    throw new v('hiper-mvhr-card: "subtitle" must be a string if provided');
  const i = t.heat_recovery_method ?? "automatic";
  if (!yt.includes(i))
    throw new v(
      `hiper-mvhr-card: invalid "heat_recovery_method" value "${String(t.heat_recovery_method)}". Expected one of: ${yt.join(", ")}`
    );
  const o = t.filter_max_days ?? 365;
  if (typeof o != "number" || !Number.isFinite(o) || o <= 0)
    throw new v('hiper-mvhr-card: "filter_max_days" must be a positive number');
  const s = t.entities ?? {};
  if (typeof s != "object" || Array.isArray(s) || s === null)
    throw new v(
      'hiper-mvhr-card: "entities" must be a mapping of role to entity id'
    );
  const n = {};
  for (const [d, p] of Object.entries(s)) {
    const h = de[d] ?? d;
    if (!wt(h)) {
      console.warn(`hiper-mvhr-card: ignoring unknown entity role "${d}" in config`);
      continue;
    }
    if (typeof p != "string" || p.length === 0)
      throw new v(
        `hiper-mvhr-card: entity id for role "${d}" must be a non-empty string`
      );
    n[h] = p;
  }
  const l = t.feature_flags ?? {};
  if (typeof l != "object" || Array.isArray(l) || l === null)
    throw new v(
      'hiper-mvhr-card: "feature_flags" must be a mapping of role to boolean'
    );
  const u = {};
  for (const [d, p] of Object.entries(l)) {
    if (!wt(d)) {
      console.warn(`hiper-mvhr-card: ignoring unknown feature flag role "${d}" in config`);
      continue;
    }
    if (typeof p != "boolean")
      throw new v(
        `hiper-mvhr-card: feature flag "${d}" must be true or false, got ${JSON.stringify(p)}`
      );
    u[d] = p;
  }
  return {
    type: "custom:hiper-mvhr-card",
    name: t.name,
    title: t.title,
    subtitle: t.subtitle,
    manufacturer: e,
    display_mode: r,
    entities: n,
    feature_flags: u,
    show_airflow_on_all_paths: t.show_airflow_on_all_paths === !0,
    show_controls: t.show_controls !== !1,
    show_fan_speeds: t.show_fan_speeds !== !1,
    show_filter: t.show_filter !== !1,
    show_calibration: t.show_calibration !== !1,
    filter_max_days: o,
    heat_recovery_method: i,
    show_airflow_animation: t.show_airflow_animation !== !1,
    show_advanced_controls: t.show_advanced_controls !== !1
  };
}
function pe(a, t) {
  const e = Mt(a);
  if (!t || Object.keys(t).length === 0)
    return e;
  const r = new Set(e.unsupportedRoles ?? []), i = { ...e.supportedRoles };
  for (const o of Object.keys(t))
    r.has(o) || (t[o] ? i[o] = i[o] ?? {} : delete i[o]);
  return { ...e, supportedRoles: i };
}
const he = /* @__PURE__ */ new Set(["unavailable", "unknown"]), me = /* @__PURE__ */ new Set(["button", "input_button"]);
function _e(a) {
  const [t] = a.split(".");
  return t ?? "";
}
function fe(a, t, e) {
  var i;
  const r = {};
  for (const o of at) {
    if (!t.supportedRoles[o]) {
      r[o] = { status: "unsupported" };
      continue;
    }
    const s = e[o];
    if (!s) {
      r[o] = { status: "not_configured" };
      continue;
    }
    const n = a.states[s];
    if (!n) {
      r[o] = { status: "entity_missing", entityId: s };
      continue;
    }
    const l = n.state === "unknown" && me.has(_e(s));
    if (he.has(n.state) && !l) {
      r[o] = { status: "unavailable" };
      continue;
    }
    const u = Number(n.state);
    r[o] = {
      status: "ok",
      value: n.state,
      numericValue: Number.isFinite(u) ? u : void 0,
      unit: typeof ((i = n.attributes) == null ? void 0 : i.unit_of_measurement) == "string" ? n.attributes.unit_of_measurement : void 0,
      attributes: n.attributes ?? {}
    };
  }
  return r;
}
function ge(a, t, e = {}) {
  const r = new Set(e.ignoreRoles ?? []);
  let i = 0, o = 0, s = 0;
  for (const n of Object.keys(t.supportedRoles)) {
    if (r.has(n))
      continue;
    const l = a[n];
    l && (l.status === "ok" ? i += 1 : l.status === "unavailable" ? o += 1 : l.status === "entity_missing" && (s += 1));
  }
  return s > 0 ? {
    tone: "warning",
    label: s === 1 ? "1 configuration issue" : `${s} configuration issues`
  } : o > 0 ? {
    tone: "muted",
    label: o === 1 ? "1 sensor unavailable" : `${o} sensors unavailable`
  } : i > 0 ? { tone: "success", label: "All sensors reporting" } : { tone: "muted", label: "Not configured" };
}
const ve = 1e4, be = "press";
function xe(a) {
  const [t] = a.split(".");
  return t ?? "";
}
class ye {
  constructor(t = {}) {
    this._state = { status: "idle" }, this._listeners = /* @__PURE__ */ new Set(), this._timeoutMs = t.timeoutMs ?? ve;
  }
  get state() {
    return this._state;
  }
  /** Subscribes to state changes; returns an unsubscribe function. */
  onChange(t) {
    return this._listeners.add(t), () => {
      this._listeners.delete(t);
    };
  }
  _setState(t) {
    this._state = t;
    for (const e of this._listeners)
      e();
  }
  /**
   * Fires a "press" action for the given entity id. Safe to call even when
   * `hass` or `hass.callService` isn't available (dev preview, tests with a
   * minimal fake hass) — it simply does nothing rather than throwing, per
   * the same "degrade, never fail" principle the rest of the card follows
   * (SPECIFICATION.md §6).
   */
  async dispatchAction(t, e) {
    if (!(t != null && t.callService) || this._state.status === "pending")
      return;
    this._setState({ status: "pending" });
    const r = xe(e);
    let i;
    const o = new Promise((s) => {
      i = setTimeout(() => s("timeout"), this._timeoutMs);
    });
    try {
      if (await Promise.race([
        t.callService(r, be, { entity_id: e }).then(() => "done"),
        o
      ]) === "timeout") {
        this._setState({ status: "error", message: "Timed out waiting for a response." });
        return;
      }
      this._setState({ status: "idle" });
    } catch (s) {
      this._setState({
        status: "error",
        message: s instanceof Error ? s.message : "The action failed."
      });
    } finally {
      clearTimeout(i);
    }
  }
}
const we = {
  unsupported: "",
  not_configured: "Not configured",
  // Homeowner-safe generic text — deliberately identical to `unavailable`.
  // A misconfigured entity ID isn't something a homeowner should have to
  // parse; the entity id + a distinct warning only shows in detailed mode,
  // handled separately by the component, not through this generic label.
  entity_missing: "Unavailable",
  unavailable: "Unavailable"
};
function $e(a) {
  return a.status === "ok" ? a.unit ? `${a.value} ${a.unit}` : a.value : we[a.status] ?? "";
}
function Ae(a) {
  return a.length > 0 ? a.charAt(0).toUpperCase() + a.slice(1) : a;
}
function ke(a) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(a))
    return a;
  const t = new Date(a);
  return Number.isNaN(t.getTime()) ? a : t.toLocaleString(void 0, { dateStyle: "medium", timeStyle: "short" });
}
const Se = {
  mode: "mdi:fan",
  outdoor_air_temp: "mdi:thermometer",
  supply_air_temp: "mdi:thermometer",
  extract_air_temp: "mdi:thermometer",
  exhaust_air_temp: "mdi:thermometer",
  supply_airflow: "mdi:weather-windy",
  extract_airflow: "mdi:weather-windy",
  bypass_state: "mdi:valve",
  filter_remaining: "mdi:air-filter",
  fault_active: "mdi:alert-circle",
  frost_protection_active: "mdi:snowflake-alert",
  filter_reset_control: "mdi:restart",
  shower_detected: "mdi:shower-head",
  shower_trigger_temperature: "mdi:thermometer-water",
  shower_pipe_temperature: "mdi:thermometer-water"
};
function J(a) {
  return Se[a];
}
function Ee(a) {
  if (a.method === "disabled")
    return { label: "Disabled", status: "not_applicable" };
  if (a.outdoor === void 0 || a.extract === void 0 || a.supply === void 0)
    return { label: "Unavailable", status: "unavailable" };
  const t = a.extract - a.outdoor;
  if (Math.abs(t) < 1)
    return { label: "Calculating", status: "calculating" };
  if (t <= 0 || a.supply < a.outdoor || a.supply > a.extract + 5)
    return { label: "Not applicable", status: "not_applicable" };
  const e = (a.supply - a.outdoor) / t * 100;
  return !Number.isFinite(e) || e < 0 || e > 130 ? { label: "Not applicable", status: "not_applicable", raw: e } : {
    label: `${Math.round(Math.max(0, Math.min(100, e)))}%`,
    status: "ok",
    raw: e
  };
}
var Ce = Object.defineProperty, W = (a, t, e, r) => {
  for (var i = void 0, o = a.length - 1, s; o >= 0; o--)
    (s = a[o]) && (i = s(t, e, i) || i);
  return i && Ce(t, e, i), i;
};
const F = "hiper-mvhr-card", Re = [
  ["outdoor_air_temp", "Outdoor air"],
  ["supply_air_temp", "Supply air"],
  ["extract_air_temp", "Extract air"],
  ["exhaust_air_temp", "Exhaust air"]
], Te = [
  ["supply_airflow", "Supply airflow"],
  ["extract_airflow", "Extract airflow"]
], $t = [
  ["supply_fan_speed", "Supply fan"],
  ["extract_fan_speed", "Extract fan"]
], Oe = [
  ["bypass_state", "Summer bypass"],
  ["filter_remaining", "Filter"],
  ["calibration_result", "Calibration"],
  ["fault_active", "Fault"],
  ["frost_protection_active", "Frost protection"]
], At = [["filter_reset_control", "Filter reset"]], I = {
  success: "mdi:check-circle",
  warning: "mdi:alert",
  muted: "mdi:information-outline"
}, Nt = [
  "effective_mode",
  "fault_active",
  "frost_protection_active",
  "bypass_state",
  "boost_active",
  "boost_remaining",
  "boost_duration",
  "start_boost",
  "cancel_boost",
  "override_duration",
  "override_remaining",
  "clear_override",
  "calibration_status",
  "calibration_progress",
  "last_calibration",
  "filter_reset_control",
  "shower_detected",
  "shower_trigger_temperature",
  "shower_pipe_temperature"
], ze = new Set(Nt), kt = 10, Me = [
  ["supply_air_temp", "Supply air"],
  ["extract_air_temp", "Extract air"],
  ["outdoor_air_temp", "Outdoor air"],
  ["exhaust_air_temp", "Exhaust air"]
], Pe = /* @__PURE__ */ new Set([
  "calibrated",
  "complete",
  "completed",
  "idle",
  "none",
  "unknown"
]), Ne = /* @__PURE__ */ new Set(["on", "true", "problem", "active", "detected"]), nt = class nt extends R {
  constructor() {
    super(...arguments), this._advancedOpen = !1, this._dispatchers = /* @__PURE__ */ new Map();
  }
  _getDispatcher(t) {
    let e = this._dispatchers.get(t);
    return e || (e = new ye(), e.onChange(() => this.requestUpdate()), this._dispatchers.set(t, e)), e;
  }
  static getStubConfig() {
    return {
      manufacturer: "generic",
      display_mode: "homeowner",
      entities: {}
    };
  }
  static getConfigElement() {
    return document.createElement("hiper-mvhr-card-editor");
  }
  setConfig(t) {
    try {
      this._config = ue(t), this._configError = void 0;
    } catch (e) {
      this._config = void 0, this._configError = e instanceof Error ? e.message : String(e);
    }
  }
  getCardSize() {
    return 4;
  }
  render() {
    if (this._configError)
      return c`<ha-card><div class="error" role="alert">${this._configError}</div></ha-card>`;
    if (!this._config || !this.hass)
      return c``;
    const t = this._config, e = this.hass, r = t.display_mode === "detailed", i = t.display_mode === "system", o = pe(t.manufacturer, t.feature_flags), s = Mt(t.manufacturer), n = fe(e, o, t.entities), l = ge(n, o, {
      ignoreRoles: Nt
    }), u = r || l.label !== "Not configured", d = n.mode ? this._present(n.mode, r) : null, p = t.title ?? t.name ?? s.name, h = t.subtitle ?? "Heat Recovery Ventilation System", m = l.tone !== "warning" && l.label !== "Not configured", g = this._heatRecovery(n, t.heat_recovery_method), b = this._modeLabel(
      (d == null ? void 0 : d.text) ?? this._text(n.effective_mode)
    ), f = t.title ?? s.name;
    return c`
      <ha-card class=${i ? "card-system" : ""}>
        ${i ? this._systemHeader(p, h, b, n, t, e) : this._header(p, h, b, l, u)}
        ${i ? this._systemDashboard(n, t, e, g, b, f, m) : r ? this._dashboard(n, t, e, g, b, f, m) : this._legacyContent(n, t, e, r)}
      </ha-card>
    `;
  }
  /**
   * Card header — Phase 4. Shared by both display modes: title, a status dot
   * + the current mode read prominently next to it, and the subtitle below.
   * The availability chip only ever reflects required-entity failures (see
   * `OPTIONAL_AVAILABILITY_ROLES` above), never an unconfigured optional
   * sensor like fault/frost.
   */
  _header(t, e, r, i, o) {
    return c`
      <div class="header mvhr-header">
        <div class="header-row">
          <div class="header-title-group">
            <h2 class="title">${t}</h2>
            <span class="status-dot dot-${i.tone}" aria-hidden="true"></span>
            ${r ? c`<span class="mode-pill">${r}</span>` : ""}
          </div>
          ${o ? c`
                  <div class="availability tone-${i.tone}" role="status">
                    <ha-icon icon=${I[i.tone]} aria-hidden="true"></ha-icon>
                    <span>${i.label}</span>
                  </div>
                ` : ""}
        </div>
        <div class="subheader">${e}</div>
      </div>
    `;
  }
  /**
   * `display_mode: homeowner`'s content — unchanged since Phase 2: a
   * compact, plain-language read-out (temperatures / airflow / system
   * status), unconfigured optional roles omitted entirely, no raw entity
   * IDs. `display_mode: detailed` no longer renders this at all — see
   * `_dashboard` below, which is its full replacement (ROADMAP.md "Rebuild
   * detailed MVHR dashboard layout").
   */
  _legacyContent(t, e, r, i) {
    return c`
      <div class="content">
        ${this._metricSection("Temperatures", Re, t, i)}
        ${this._metricSection("Airflow", Te, t, i)}
        ${this._statusSection("System status", Oe, t, i, e, r)}
      </div>
    `;
  }
  /**
   * `display_mode: detailed`'s entire card body (Phase 2-3/2-17 of the
   * dashboard rebuild) — one unified MVHR dashboard: a large airflow visual
   * + controls side by side, metrics tiles below, a status strip at the
   * bottom. Nothing from the legacy homeowner content (`_legacyContent`)
   * renders alongside it.
   */
  _dashboard(t, e, r, i, o, s, n) {
    const l = e.show_controls && this._hasControls(t, e);
    return c`
      <div class="mvhr-dashboard ${l ? "" : "no-controls"}">
        <section class="visual-panel" aria-label="MVHR airflow diagram">
          ${this._heroVisual(t, e, n, s, i)}
        </section>
        ${l ? this._controlsPanel(t, e, r) : ""}
        <section class="metrics-grid" aria-label="MVHR metrics">
          ${this._infoTile("Mode", o || "—", "mdi:fan-auto")}
          ${this._infoTile(
      "Measured airflow",
      this._value(t.airflow, !0) ?? this._value(t.supply_airflow, !0) ?? "—",
      "mdi:weather-windy"
    )}
          ${this._infoTile("Target airflow", this._value(t.target_airflow, !0) ?? "—", "mdi:target")}
          ${this._infoTile("Mapped level", this._value(t.mapped_level, !0) ?? "—", "mdi:tune-variant")}
          ${this._infoTile(
      "Heat recovery",
      i.label,
      "mdi:heat-wave",
      i.status,
      "Apparent temperature recovery"
    )}
          ${e.show_fan_speeds ? this._infoTile("Fan speeds", this._pair($t, t, !0), "mdi:fan") : ""}
          ${this._infoTile("Humidity", this._value(t.indoor_humidity, !0) ?? "—", "mdi:water-percent")}
          ${e.show_filter ? this._filterTile(t, e) : ""}
        </section>
        ${this._statusStrip(t, e)} ${this._extraControls(t, e, r)}
      </div>
    `;
  }
  /**
   * The bottom health status strip — System OK / Fault detected /
   * Calibrating… / Calibration required / Communication issue, plus a
   * calibration summary and its last-run timestamp. Shared verbatim between
   * `display_mode: detailed` (`_dashboard`) and `display_mode: system`
   * (`_systemDashboard`) — Phase 11 of the system-mode build asks for
   * exactly the same content the dashboard rebuild already produced, so
   * this was extracted rather than re-implemented.
   */
  _statusStrip(t, e) {
    var o;
    const r = this._dashboardStatus(t), i = ((o = t.last_calibration) == null ? void 0 : o.status) === "ok" ? ke(t.last_calibration.value) : null;
    return c`
      <section class="status-strip tone-${r.tone}" aria-label="MVHR status">
        <span class="status-chip">
          <ha-icon icon=${I[r.tone]} aria-hidden="true"></ha-icon>
          <span>${r.label}</span>
        </span>
        ${e.show_calibration ? c`
                <span>Calibration: ${this._value(t.calibration_result, !0) ?? "—"}</span>
                ${i ? c`<span>Last calibration: ${i}</span>` : ""}
              ` : ""}
      </section>
    `;
  }
  /**
   * Applies the SPECIFICATION.md §6 / display-mode policy to one resolved
   * role: what should actually appear, and how prominent should it look.
   * Returns null when nothing should render for this role at all.
   */
  _present(t, e) {
    return t.status === "unsupported" ? null : t.status === "not_configured" ? e ? { tone: "muted", text: "Not configured" } : null : t.status === "entity_missing" ? e ? { tone: "warning", text: `Entity not found: ${t.entityId}` } : { tone: "muted", text: "Unavailable" } : t.status === "unavailable" ? { tone: "muted", text: "Unavailable" } : { tone: "normal", text: $e(t) };
  }
  _metricSection(t, e, r, i) {
    const o = e.map(([s, n]) => {
      const l = r[s], u = l ? this._present(l, i) : null;
      return u ? this._metricCell(s, n, u) : null;
    }).filter((s) => s !== null);
    return o.length === 0 ? c`` : c`
      <section class="metric-section" aria-label=${t}>
        <h3>${t}</h3>
        <div class="metric-grid">${o}</div>
      </section>
    `;
  }
  _metricCell(t, e, r) {
    const i = J(t);
    return c`
      <div class="metric tone-${r.tone}">
        ${i ? c`<ha-icon icon=${i} aria-hidden="true"></ha-icon>` : ""}
        <div class="metric-text">
          <span class="metric-label">${e}</span>
          <span class="metric-value">${r.text}</span>
        </div>
      </div>
    `;
  }
  _statusSection(t, e, r, i, o, s) {
    const n = e.map(([d, p]) => {
      const h = r[d], m = h ? this._present(h, i) : null;
      return m ? this._statusRow(d, p, m) : null;
    }).filter((d) => d !== null), l = At.map(
      ([d, p]) => this._controlRow(d, p, r[d], i, o, s)
    ).filter((d) => d !== null), u = [...n, ...l];
    return u.length === 0 ? c`` : c`
      <section class="status-section" aria-label=${t}>
        <h3>${t}</h3>
        <div class="status-list">${u}</div>
      </section>
    `;
  }
  /**
   * The new dashboard's own home for action roles beyond the ones the
   * dashboard already surfaces as first-class controls (mode/boost/
   * override). Today that's just `filter_reset_control` (Phase 3A,
   * `generic`-profile only) — every action role goes through the same five
   * SPECIFICATION.md §6 states as a read-only role, so it degrades exactly
   * like the legacy content's status rows did. Renders nothing for
   * Altair/Zehnder/Aerofresh, which don't declare this role supported.
   */
  _extraControls(t, e, r) {
    const i = At.map(
      ([o, s]) => this._controlRow(o, s, t[o], !0, e, r)
    ).filter((o) => o !== null);
    return i.length === 0 ? c`` : c`
      <section class="status-section extra-controls" aria-label="Additional controls">
        <div class="status-list">${i}</div>
      </section>
    `;
  }
  _statusRow(t, e, r) {
    const i = J(t);
    return c`
      <div class="status-row tone-${r.tone}">
        ${i ? c`<ha-icon icon=${i} aria-hidden="true"></ha-icon>` : ""}
        <span class="status-label">${e}</span>
        <span class="status-value">${r.text}</span>
      </div>
    `;
  }
  /**
   * Renders one action role. The non-value states (unsupported/not
   * configured/entity missing/unavailable) reuse `_present`/`_statusRow`
   * verbatim, so a control degrades identically to every read-only role
   * (SPECIFICATION.md §6) — only the 'ok' state diverges, showing an
   * interactive button instead of formatted text, since a button entity's
   * raw state (a last-pressed timestamp) isn't meaningful to show.
   */
  _controlRow(t, e, r, i, o, s) {
    if (!r)
      return null;
    if (r.status !== "ok") {
      const p = this._present(r, i);
      return p ? this._statusRow(t, e, p) : null;
    }
    const n = o.entities[t];
    if (!n)
      return null;
    const l = this._getDispatcher(t), u = l.state, d = J(t);
    return c`
      <div class="status-row">
        ${d ? c`<ha-icon icon=${d} aria-hidden="true"></ha-icon>` : ""}
        <span class="status-label">${e}</span>
        ${u.status === "error" ? c`<span class="status-value tone-warning">Couldn't reset</span>` : ""}
        <button
          type="button"
          class="control-button"
          aria-label=${e}
          ?disabled=${u.status === "pending"}
          @click=${() => l.dispatchAction(s, n)}
        >
          ${u.status === "pending" ? "Resetting…" : "Reset"}
        </button>
      </div>
    `;
  }
  /**
   * Phase 5-7: the dashboard's hero element — a large central MVHR unit
   * with the four air paths around it (extract/exhaust/outdoor/supply, no
   * bypass path — this diagram is deliberately generic across every
   * manufacturer profile, which is exactly why Altair, which has none,
   * never gets one) and the heat-recovery badge inside the unit itself.
   */
  _heroVisual(t, e, r, i, o) {
    const s = this._value(t.airflow, !0) ?? this._value(t.supply_airflow, !0), n = e.show_airflow_on_all_paths, l = (u, d, p, h) => {
      const m = n || h ? s : null;
      return c`
        <div class="air-path ${u} ${r ? "active" : ""}">
          <span class="path-label">${d}</span>
          <span class="path-temp">${this._value(t[p], !0) ?? "—"}</span>
          ${m ? c`<span class="path-airflow">${m}</span>` : ""}
        </div>
      `;
    };
    return c`
      <div class="visual-wrap">
        ${l("extract", "Extract air", "extract_air_temp", !0)}
        ${l("exhaust", "Exhaust air", "exhaust_air_temp", !1)}
        <div class="unit" aria-label="Heat recovery unit">
          <div class="brand">
            ${i}${i.toLowerCase().includes("mvhr") ? "" : c`<br /><span>MVHR</span>`}
          </div>
          <div class="duct duct-top" aria-hidden="true"></div>
          <div class="duct duct-bottom" aria-hidden="true"></div>
          <div class="duct duct-left" aria-hidden="true"></div>
          <div class="duct duct-right" aria-hidden="true"></div>
          <div class="exchanger" aria-hidden="true"></div>
          <div class="fan fan-a" aria-hidden="true">✦</div>
          <div class="fan fan-b" aria-hidden="true">✦</div>
          <div class="recovery-badge" title="Apparent temperature recovery">
            <span class="recovery-label">Heat Recovery</span>
            <strong class="recovery-value">${o.label}</strong>
          </div>
        </div>
        ${l("outdoor", "Outdoor air", "outdoor_air_temp", !1)}
        ${l("supply", "Supply air", "supply_air_temp", !0)}
      </div>
    `;
  }
  /**
   * Phase 8: mode / boost / override controls, restyled as three clear
   * groups with large touch targets. Service calls are unchanged from the
   * pre-rebuild dashboard — only markup/CSS and the active-mode highlight
   * are new.
   */
  _controlsPanel(t, e, r) {
    var m, g, b;
    const i = e.entities.mode, o = e.entities.boost_duration, s = e.entities.override_duration, n = this._modeOptions(t.mode), l = this._selectOptions(t.override_duration), u = (m = this._state(t.mode)) == null ? void 0 : m.toLowerCase(), d = this._state(t.boost_active) === "on", p = ((g = t.boost_remaining) == null ? void 0 : g.status) === "ok" ? this._value(t.boost_remaining) : null, h = ((b = t.override_remaining) == null ? void 0 : b.status) === "ok" ? this._value(t.override_remaining) : null;
    return c`
      <aside class="controls-panel" aria-label="MVHR controls">
        <div class="panel-heading">Controls</div>

        <div class="control-group">
          <span class="control-group-label">Mode</span>
          <div class="mode-buttons" role="group" aria-label="Operating mode">
            ${n.map((f) => {
      const w = u !== void 0 && f.toLowerCase() === u;
      return c`
                <button
                  type="button"
                  class="chip ${w ? "active" : ""}"
                  ?disabled=${!i}
                  aria-pressed=${w}
                  aria-label=${`Set mode ${this._modeLabel(f)}`}
                  @click=${() => i && this._call(r, "select", "select_option", { entity_id: i, option: f })}
                >
                  ${this._modeLabel(f)}
                </button>
              `;
    })}
          </div>
        </div>

        <div class="control-block">
          <div class="control-block-head">
            <span>Boost</span>
            <strong class="state-pill ${d ? "is-active" : ""}"
              >${d ? "Active" : "Ready"}</strong
            >
          </div>
          ${p ? c`<small>${p} remaining</small>` : ""}
          <label class="field">
            <span>Duration (minutes)</span>
            <input
              type="number"
              min="1"
              step="1"
              .value=${this._state(t.boost_duration) ?? ""}
              ?disabled=${!o}
              aria-label="Boost duration"
              @change=${(f) => {
      const w = Number(f.currentTarget.value);
      o && Number.isFinite(w) && this._call(r, "number", "set_value", {
        entity_id: o,
        value: w
      });
    }}
            />
          </label>
          <div class="button-row">
            <button
              type="button"
              class="cta"
              aria-label="Start Boost"
              ?disabled=${d || !e.entities.start_boost}
              @click=${() => this._press(r, e.entities.start_boost)}
            >
              Start Boost
            </button>
            <button
              type="button"
              class="cta ghost"
              aria-label="Cancel Boost"
              ?disabled=${!d || !e.entities.cancel_boost}
              @click=${() => this._press(r, e.entities.cancel_boost)}
            >
              Cancel Boost
            </button>
          </div>
        </div>

        <div class="control-block">
          <div class="control-block-head">
            <span>Override</span>
            <strong
              >${this._value(t.override_duration) ?? "Until next schedule change"}</strong
            >
          </div>
          ${h ? c`<small>${h} remaining</small>` : ""}
          <label class="field">
            <span>Duration</span>
            <select
              ?disabled=${!s}
              aria-label="Override duration"
              @change=${(f) => {
      const w = f.currentTarget.value;
      s && this._call(r, "select", "select_option", {
        entity_id: s,
        option: w
      });
    }}
            >
              ${l.map(
      (f) => c`
                  <option
                    .value=${f}
                    ?selected=${this._state(t.override_duration) === f}
                  >
                    ${this._modeLabel(f)}
                  </option>
                `
    )}
            </select>
          </label>
          <button
            type="button"
            class="cta ghost full"
            aria-label="Clear override"
            ?disabled=${!e.entities.clear_override}
            @click=${() => this._press(r, e.entities.clear_override)}
          >
            Clear override
          </button>
        </div>
      </aside>
    `;
  }
  /**
   * `display_mode: system`'s header (Phase 4 of the system-mode build,
   * redesigned for the visual-polish pass) — title/dot/mode-pill/subtitle
   * shape as before, the right-hand status text uses the same System OK /
   * Communication issue / Fault detected / Calibration required vocabulary
   * as the status strip (`_dashboardStatus`), and — new in the redesign —
   * a compact "at a glance" operating-mode select and a boost status/toggle
   * pill, in place of the old full-width Mode chip row and Boost card that
   * used to live below the visual (see `_systemAdvancedToggle` for where
   * boost duration/Start/Cancel and override now live, for anyone who wants
   * the fuller controls). No power/off control is rendered: no manufacturer
   * profile in this repo declares any kind of "turn off" role, and inventing
   * one the integration doesn't actually expose would violate the "don't
   * invent unsupported device controls" rule — see docs/manufacturers/*.md.
   * A separate method from `_header` on purpose — `display_mode: detailed`
   * is not touched by the system-mode build.
   */
  _systemHeader(t, e, r, i, o, s) {
    const n = this._dashboardStatus(i);
    return c`
      <div class="header mvhr-header">
        <div class="header-row">
          <div class="header-title-group">
            <h2 class="title">${t}</h2>
            <span class="status-dot dot-${n.tone}" aria-hidden="true"></span>
            <span class="availability tone-${n.tone}" role="status">
              <ha-icon icon=${I[n.tone]} aria-hidden="true"></ha-icon>
              <span>${n.label}</span>
            </span>
          </div>
          ${this._systemHeaderControls(i, o, s, r)}
        </div>
        <div class="subheader">${e}</div>
      </div>
    `;
  }
  /**
   * The redesign's compact header controls: a small labelled operating-mode
   * `<select>` and a boost status pill that doubles as a toggle button
   * (Start Boost when ready, Cancel Boost when active) — "compact dashboard
   * controls" per the visual-redesign brief, replacing the old full-width
   * chip row and boost card for the primary interaction. Wrapped in
   * `.system-controls` (kept from the pre-redesign markup) so it stays
   * structurally outside `.system-visual-panel`, same as before.
   *
   * Mode keeps showing a passive read-out (the plain `.mode-pill`, same as
   * every other display mode) even when `show_controls` is off or no mode
   * entity is mapped — that part of the header has never been gated by
   * controls visibility. The boost pill is a genuine control, so it only
   * appears when `show_controls` is on and a boost role is actually mapped,
   * matching how boost has always been gated everywhere else in this file.
   */
  _systemHeaderControls(t, e, r, i) {
    var p, h;
    const o = e.entities.mode, s = this._modeOptions(t.mode), n = (p = this._state(t.mode)) == null ? void 0 : p.toLowerCase(), l = e.show_controls && !!o && ((h = t.mode) == null ? void 0 : h.status) === "ok", u = e.show_controls && [t.boost_duration, t.start_boost, t.cancel_boost].some(
      (m) => (m == null ? void 0 : m.status) === "ok"
    ), d = this._state(t.boost_active) === "on";
    return !l && !i && !u ? c`` : c`
      <div class="system-controls header-controls" role="group" aria-label="MVHR quick controls">
        ${l ? c`
                <label class="header-control">
                  <span class="header-control-label">Operating Mode</span>
                  <select
                    class="mode-select-pill"
                    aria-label="Operating mode"
                    @change=${(m) => {
      const g = m.currentTarget.value;
      o && this._call(r, "select", "select_option", {
        entity_id: o,
        option: g
      });
    }}
                  >
                    ${s.map(
      (m) => c`
                        <option
                          .value=${m}
                          ?selected=${n !== void 0 && m.toLowerCase() === n}
                        >
                          ${this._modeLabel(m)}
                        </option>
                      `
    )}
                  </select>
                </label>
              ` : i ? c`<span class="mode-pill">${i}</span>` : ""}
        ${u ? c`
                <div class="header-control">
                  <span class="header-control-label">Boost</span>
                  <button
                    type="button"
                    class="boost-pill-button ${d ? "is-active" : ""}"
                    aria-label=${d ? "Cancel Boost" : "Start Boost"}
                    ?disabled=${d ? !e.entities.cancel_boost : !e.entities.start_boost}
                    @click=${() => d ? this._press(r, e.entities.cancel_boost) : this._press(r, e.entities.start_boost)}
                  >
                    <ha-icon icon="mdi:rocket-launch" aria-hidden="true"></ha-icon>
                    ${d ? "Active" : "Ready"}
                  </button>
                </div>
              ` : ""}
      </div>
    `;
  }
  /**
   * `display_mode: system`'s entire card body — redesigned as a polished
   * dashboard (visual-redesign brief): a two-column main section (a larger
   * System Overview visual on the left, a shower-detection panel on the
   * right when configured), three lower information cards (Airflow /
   * Temperatures / System Status), and a "More controls" disclosure for
   * override + calibration internals + any extra action roles — everything
   * still driven by the resolved snapshot, nothing hard-coded. Neither
   * `_legacyContent` nor `_dashboard` render alongside this —
   * `display_mode: detailed`/`homeowner` are unaffected by this method
   * existing.
   */
  _systemDashboard(t, e, r, i, o, s, n) {
    const l = this._number(t.airflow) ?? this._number(t.supply_airflow), u = e.show_airflow_animation && n && (l ?? 0) > 0, d = this._shower(t);
    return c`
      <div class="mvhr-system">
        <section class="system-main ${d.render ? "" : "no-shower"}">
          <section class="visual-panel system-visual-panel system-overview" aria-label="System overview">
            <div class="panel-heading-row">
              <h3>System Overview</h3>
              ${i.status === "ok" ? c`<span class="recovery-pill" title="Apparent temperature recovery"
                      >Heat Recovery: ${i.label}</span
                    >` : ""}
            </div>
            ${this._systemHeroVisual(t, e, u, s)}
          </section>
          ${d.render ? this._systemShowerPanel(d) : ""}
        </section>

        <section class="system-lower-grid" aria-label="MVHR details">
          ${this._systemAirflowCard(t, e)}
          ${this._systemTemperaturesCard(t, i)}
          ${this._systemStatusCard(t, e)}
        </section>

        ${e.show_advanced_controls ? this._systemAdvancedToggle() : ""}
        ${e.show_advanced_controls ? this._advancedDrawer(t, e, r) : ""}
      </div>
    `;
  }
  /**
   * The redesign's "More controls" entry point — a single real disclosure
   * toggle (not a fake tab: it genuinely shows/hides `_advancedDrawer`),
   * kept as its own small section below the lower cards so it reads as an
   * escape hatch for override/calibration internals rather than a primary
   * control.
   */
  _systemAdvancedToggle() {
    return c`
      <section class="system-more" aria-label="More controls">
        <button
          type="button"
          class="disclosure-toggle"
          aria-expanded=${this._advancedOpen}
          aria-controls="mvhr-advanced-drawer"
          @click=${() => {
      this._advancedOpen = !this._advancedOpen;
    }}
        >
          ${this._advancedOpen ? "Hide advanced" : "More controls"}
        </button>
      </section>
    `;
  }
  /**
   * Derives everything the shower-detection panel needs from the snapshot,
   * without rendering anything itself — kept separate from
   * `_systemShowerPanel` so the "should we even show a shower column at
   * all" decision is easy to unit test and reason about on its own.
   *
   * Three outcomes, per the visual-redesign brief:
   *  - `shower_detected` isn't supported/configured at all (no shower
   *    entities wired up) → `render: false`; the overview panel expands
   *    to fill the row (`.system-main.no-shower`).
   *  - Configured but not currently on (including a momentarily
   *    unavailable/missing detector — that's not an active shower) →
   *    `render: true, active: false`, a compact inactive card.
   *  - Configured and on → `render: true, active: true`, the full purple
   *    panel with pipe/trigger/rearm temperatures and boost status, each
   *    shown only when its own entity actually has a value (never a fake
   *    reading for an unavailable sensor).
   */
  _shower(t) {
    var l, u;
    const e = t.shower_detected, r = !!e && (e == null ? void 0 : e.status) !== "unsupported" && (e == null ? void 0 : e.status) !== "not_configured", i = (e == null ? void 0 : e.status) === "ok" && e.value.toLowerCase() === "on", o = t.shower_trigger_temperature, s = this._number(o), n = s === void 0 ? null : `${(s - kt).toFixed(1)}${(o == null ? void 0 : o.status) === "ok" && o.unit ? ` ${o.unit}` : ""}`;
    return {
      render: r,
      active: i,
      boostActive: this._state(t.boost_active) === "on",
      // Each fact is shown only when its own entity is genuinely 'ok' — an
      // unavailable/missing sensor omits its row entirely rather than
      // showing a hollow "Pipe temperature: Unavailable" line, per the
      // redesign's "never a fake reading" rule.
      pipeTemperature: ((l = t.shower_pipe_temperature) == null ? void 0 : l.status) === "ok" ? this._value(t.shower_pipe_temperature, !0) : null,
      triggerTemperature: (o == null ? void 0 : o.status) === "ok" ? this._value(o, !0) : null,
      rearmTemperature: i ? n : null,
      boostRemaining: ((u = t.boost_remaining) == null ? void 0 : u.status) === "ok" ? this._value(t.boost_remaining) : null
    };
  }
  /**
   * Renders the shower-detection column: the full purple "Shower detected"
   * panel with its lightweight inline-SVG illustration when a shower is
   * currently active, or a compact inactive status card otherwise (see
   * `_shower` for how that choice is made). Config's `show_airflow_animation`
   * doesn't gate this panel's own droplet animation — it's a separate,
   * lightweight CSS effect — but `prefers-reduced-motion` always does (see
   * the reduced-motion media query in `static styles`).
   */
  _systemShowerPanel(t) {
    return t.active ? c`
      <section class="shower-panel shower-active" aria-label="Shower detection" role="status">
        <h3 class="shower-heading">Shower Detection</h3>
        <div class="shower-illustration" aria-hidden="true">${this._showerIllustration()}</div>
        <strong class="shower-title">Shower detected</strong>
        <span class="shower-subtitle">${t.boostActive ? "Boost active" : "Boost not active"}</span>
        <dl class="shower-facts">
          ${t.pipeTemperature ? c`
                  <div class="shower-fact">
                    <dt>Pipe temperature</dt>
                    <dd>${t.pipeTemperature}</dd>
                  </div>
                ` : ""}
          ${t.triggerTemperature ? c`
                  <div class="shower-fact">
                    <dt>Trigger temperature</dt>
                    <dd>${t.triggerTemperature}</dd>
                  </div>
                ` : ""}
          ${t.rearmTemperature ? c`
                  <div class="shower-fact">
                    <dt>Re-arm at</dt>
                    <dd>${t.rearmTemperature}<small>(${kt}°C below trigger)</small></dd>
                  </div>
                ` : ""}
          ${t.boostRemaining ? c`
                  <div class="shower-fact">
                    <dt>Boost remaining</dt>
                    <dd>${t.boostRemaining}</dd>
                  </div>
                ` : ""}
        </dl>
      </section>
    ` : c`
        <section class="shower-panel shower-inactive" aria-label="Shower detection">
          <ha-icon icon="mdi:shower-head" aria-hidden="true"></ha-icon>
          <div>
            <strong>No shower detected</strong>
            <span>Rearmed and watching the pipe sensor</span>
          </div>
        </section>
      `;
  }
  /**
   * A lightweight inline-SVG shower head + falling droplets — deliberately
   * simple geometry (no externally hosted image, per the visual-redesign
   * brief) so it stays cheap to animate and legible at small sizes. The
   * droplet animation is plain CSS (`.droplet` + `@keyframes shower-fall`
   * in `static styles`) and is disabled entirely under
   * `prefers-reduced-motion: reduce`.
   */
  _showerIllustration() {
    return c`
      <svg viewBox="0 0 120 100" class="shower-svg" focusable="false">
        <path
          d="M30 8 h40 a10 10 0 0 1 10 10 v4 a10 10 0 0 1 -10 10 h-40 a10 10 0 0 1 -10 -10 v-4 a10 10 0 0 1 10 -10 z"
          class="shower-head"
        />
        <circle cx="40" cy="36" r="1.6" class="shower-hole" />
        <circle cx="50" cy="36" r="1.6" class="shower-hole" />
        <circle cx="60" cy="36" r="1.6" class="shower-hole" />
        <circle cx="70" cy="36" r="1.6" class="shower-hole" />
        <circle cx="80" cy="36" r="1.6" class="shower-hole" />
        <line x1="40" y1="44" x2="34" y2="92" class="droplet" style="animation-delay:0ms" />
        <line x1="50" y1="44" x2="46" y2="92" class="droplet" style="animation-delay:180ms" />
        <line x1="60" y1="44" x2="60" y2="92" class="droplet" style="animation-delay:360ms" />
        <line x1="70" y1="44" x2="74" y2="92" class="droplet" style="animation-delay:120ms" />
        <line x1="80" y1="44" x2="86" y2="92" class="droplet" style="animation-delay:300ms" />
      </svg>
    `;
  }
  /**
   * Lower-panel "Airflow" card: current airflow with a semicircular SVG/CSS
   * gauge (no charting library, per the brief), target airflow, fan speed
   * (the existing supply/extract RPM pair — there's no separate
   * "percentage fan speed" role backed by any real entity, so this reuses
   * `FAN_ROLES` rather than inventing one), and mapped level. Rows only
   * render when their role is actually supported/configured.
   */
  _systemAirflowCard(t, e) {
    const r = t.airflow ?? t.supply_airflow, i = this._value(t.airflow, !0) ?? this._value(t.supply_airflow, !0), o = this._number(t.airflow) ?? this._number(t.supply_airflow), s = this._number(t.target_airflow), n = o !== void 0 && s ? Math.max(0, Math.min(1, o / s)) : 0, l = [];
    return e.show_fan_speeds && t.supply_fan_speed && t.extract_fan_speed && l.push(this._diagnosticRow("mdi:fan", "Fan speed", this._pair($t, t, !0))), t.mapped_level && l.push(
      this._diagnosticRow("mdi:tune-variant", "Mapped level", this._value(t.mapped_level, !0))
    ), t.target_airflow && l.push(
      this._diagnosticRow("mdi:target", "Target airflow", this._value(t.target_airflow, !0))
    ), c`
      <section class="lower-card airflow-card" aria-label="Airflow">
        <h3>Airflow</h3>
        <div class="airflow-card-body">
          ${r ? this._airflowGauge(n, i) : ""}
          <div class="airflow-card-rows">${l}</div>
        </div>
      </section>
    `;
  }
  /**
   * A semicircular gauge built from a single SVG stroked arc — no charting
   * library. `fraction` (0-1, already clamped by the caller) controls how
   * much of the arc is filled; the big central number is the actual
   * formatted role value (or "—"), never a synthesized figure.
   */
  _airflowGauge(t, e) {
    const i = Math.PI * 40, o = i * (1 - t);
    return c`
      <div class="gauge" role="img" aria-label=${`Current airflow ${e ?? "unavailable"}`}>
        <svg viewBox="0 0 100 56" class="gauge-svg">
          <path d="M10 50 A40 40 0 0 1 90 50" class="gauge-track" />
          <path
            d="M10 50 A40 40 0 0 1 90 50"
            class="gauge-fill"
            style=${`stroke-dasharray:${i};stroke-dashoffset:${o}`}
          />
        </svg>
        <div class="gauge-value">
          <strong>${e ?? "—"}</strong>
          <span>Current Airflow</span>
        </div>
      </div>
    `;
  }
  /**
   * Lower-panel "Temperatures" card: the same four temperature roles the
   * hero visual shows, in a clean aligned list (icons + values, per the
   * brief), plus the heat-recovery percentage.
   */
  _systemTemperaturesCard(t, e) {
    const r = Me.map(([i, o]) => {
      const s = t[i];
      return s ? this._diagnosticRow("mdi:thermometer", o, this._value(s, !0)) : null;
    }).filter((i) => i !== null);
    return c`
      <section class="lower-card temperatures-card" aria-label="Temperatures">
        <h3>Temperatures</h3>
        <div class="status-list">
          ${r}
          ${this._diagnosticRow("mdi:heat-wave", "Heat recovery", e.label)}
        </div>
      </section>
    `;
  }
  /**
   * Lower-panel "System Status" card: boost state, override state, boost
   * remaining, filter status (if configured), and the same overall
   * System OK / Communication issue / Fault detected / Calibration required
   * status the header shows. Read-only by design — the interactive
   * override/calibration controls live in `_advancedDrawer`, not here.
   */
  _systemStatusCard(t, e) {
    var u, d;
    const r = this._dashboardStatus(t), i = this._state(t.boost_active) === "on", o = [t.boost_active, t.boost_duration, t.start_boost].some(
      (p) => (p == null ? void 0 : p.status) === "ok"
    ), s = ((u = t.override_duration) == null ? void 0 : u.status) === "ok" ? this._modeLabel(t.override_duration.value) : null, n = ((d = t.boost_remaining) == null ? void 0 : d.status) === "ok" ? this._value(t.boost_remaining) : null, l = [];
    return o && l.push(this._diagnosticRow("mdi:rocket-launch", "Boost", i ? "Active" : "Ready")), s && l.push(this._diagnosticRow("mdi:calendar-clock", "Override", s)), n && l.push(this._diagnosticRow("mdi:timer-sand", "Boost remaining", n)), e.show_filter && t.filter_remaining && l.push(
      this._diagnosticRow("mdi:air-filter", "Filters", this._value(t.filter_remaining, !0))
    ), l.push(this._diagnosticRow(I[r.tone], "System", r.label)), c`
      <section class="lower-card system-status-card" aria-label="System status">
        <h3>System Status</h3>
        <div class="status-list">${l}</div>
      </section>
    `;
  }
  /**
   * Phase 10's collapsible "More controls" contents: override, calibration
   * internals, individual fan RPM diagnostics, and the bypass row on
   * profiles that support it — everything the redesigned primary view and
   * lower cards deliberately leave out so they don't dominate the main
   * dashboard. Collapsed by default (`_advancedOpen` starts `false`);
   * renders nothing until opened.
   */
  _advancedDrawer(t, e, r) {
    var p;
    if (!this._advancedOpen)
      return c``;
    const i = e.entities.override_duration, o = this._selectOptions(t.override_duration), s = ((p = t.override_remaining) == null ? void 0 : p.status) === "ok" ? this._value(t.override_remaining) : null, n = [t.override_duration, t.clear_override].some(
      (h) => (h == null ? void 0 : h.status) === "ok"
    ), l = e.entities.boost_duration, u = this._state(t.boost_active) === "on", d = [t.boost_duration, t.start_boost, t.cancel_boost].some(
      (h) => (h == null ? void 0 : h.status) === "ok"
    );
    return c`
      <section class="advanced-drawer" id="mvhr-advanced-drawer" aria-label="Advanced diagnostics">
        ${d ? c`
                <div class="control-block">
                  <div class="control-block-head">
                    <span>Boost duration</span>
                  </div>
                  <label class="field">
                    <span>Duration (minutes)</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      .value=${this._state(t.boost_duration) ?? ""}
                      ?disabled=${!l}
                      aria-label="Boost duration"
                      @change=${(h) => {
      const m = Number(h.currentTarget.value);
      l && Number.isFinite(m) && this._call(r, "number", "set_value", {
        entity_id: l,
        value: m
      });
    }}
                    />
                  </label>
                  <div class="button-row">
                    <button
                      type="button"
                      class="cta"
                      aria-label="Start Boost"
                      ?disabled=${u || !e.entities.start_boost}
                      @click=${() => this._press(r, e.entities.start_boost)}
                    >
                      Start Boost
                    </button>
                    <button
                      type="button"
                      class="cta ghost"
                      aria-label="Cancel Boost"
                      ?disabled=${!u || !e.entities.cancel_boost}
                      @click=${() => this._press(r, e.entities.cancel_boost)}
                    >
                      Cancel Boost
                    </button>
                  </div>
                </div>
              ` : ""}
        ${n ? c`
                <div class="control-block">
                  <div class="control-block-head">
                    <span>Override</span>
                    <strong
                      >${this._value(t.override_duration) ?? "Until next schedule change"}</strong
                    >
                  </div>
                  ${s ? c`<small>${s} remaining</small>` : ""}
                  <label class="field">
                    <span>Duration</span>
                    <select
                      ?disabled=${!i}
                      aria-label="Override duration"
                      @change=${(h) => {
      const m = h.currentTarget.value;
      i && this._call(r, "select", "select_option", {
        entity_id: i,
        option: m
      });
    }}
                    >
                      ${o.map(
      (h) => c`
                          <option
                            .value=${h}
                            ?selected=${this._state(t.override_duration) === h}
                          >
                            ${this._modeLabel(h)}
                          </option>
                        `
    )}
                    </select>
                  </label>
                  <button
                    type="button"
                    class="cta ghost full"
                    aria-label="Clear override"
                    ?disabled=${!e.entities.clear_override}
                    @click=${() => this._press(r, e.entities.clear_override)}
                  >
                    Clear override
                  </button>
                </div>
              ` : ""}
        <div class="status-list">
          ${// Summer bypass is not part of the primary hero visual, lower
    // cards, or compact header controls in system mode for any
    // manufacturer (deliberately bypass-free, generically — not an
    // Altair-specific carve-out). It only ever appears here, and
    // only when the active profile actually declares it supported
    // (Zehnder/Aerofresh) — Altair's profile marks it unsupported, so
    // `_value` returns null and this omits the row entirely, exactly
    // like every other unsupported role (SPECIFICATION.md §6), with
    // no manufacturer conditional written here to make that happen.
    t.bypass_state && t.bypass_state.status !== "unsupported" ? this._diagnosticRow(
      "mdi:valve",
      "Summer bypass",
      this._value(t.bypass_state, !0)
    ) : ""}
          ${e.show_calibration ? this._diagnosticRow(
      "mdi:progress-check",
      "Calibration status",
      this._value(t.calibration_status, !0)
    ) : ""}
          ${e.show_calibration ? this._diagnosticRow(
      "mdi:progress-clock",
      "Calibration progress",
      this._value(t.calibration_progress, !0)
    ) : ""}
          ${e.show_fan_speeds ? this._diagnosticRow(
      "mdi:fan",
      "Supply fan",
      this._value(t.supply_fan_speed, !0)
    ) : ""}
          ${e.show_fan_speeds ? this._diagnosticRow(
      "mdi:fan",
      "Extract fan",
      this._value(t.extract_fan_speed, !0)
    ) : ""}
        </div>
        ${this._extraControls(t, e, r)}
      </section>
    `;
  }
  _diagnosticRow(t, e, r) {
    return c`
      <div class="status-row">
        <ha-icon icon=${t} aria-hidden="true"></ha-icon>
        <span class="status-label">${e}</span>
        <span class="status-value">${r ?? "—"}</span>
      </div>
    `;
  }
  /**
   * Phase 5-7 (system mode variant), enlarged and recoloured for the
   * visual-redesign brief: the same four-air-path-around-a-unit concept as
   * `_heroVisual`, but a distinct method — `display_mode: detailed` keeps
   * its own left/right (inbound-left/outbound-right) arrangement and colour
   * scheme untouched, while system mode uses the top/bottom
   * (outbound-top/inbound-bottom) arrangement its spec calls for: Exhaust
   * (top-left) and Supply (top-right) both flow away from the unit; Extract
   * (bottom-left) and Outdoor (bottom-right) both flow toward it. Each path
   * also gets a small directional arrow icon (redesign requirement:
   * "directional arrows", without relying on colour alone) and a colour
   * family scoped to `.system-visual-panel` only — supply/outdoor cool
   * blue, extract warm orange, exhaust neutral grey — that never touches
   * `_heroVisual`'s own `.supply`/`.extract`/etc. base colours. The heat
   * recovery badge now lives in the panel heading (`_systemDashboard`)
   * rather than inside the unit, so this method no longer takes a
   * `recovery` argument.
   */
  _systemHeroVisual(t, e, r, i) {
    const o = this._value(t.airflow, !0) ?? this._value(t.supply_airflow, !0), s = e.show_airflow_on_all_paths, n = (l, u, d, p, h, m, g) => {
      const b = s || p ? o : null;
      return c`
        <div class="air-path ${l} ${r ? "active" : ""}">
          <span class="path-label">
            <ha-icon icon=${h} aria-hidden="true"></ha-icon>
            ${u}
            <ha-icon class="path-arrow" icon=${m} aria-label=${g}></ha-icon>
          </span>
          <span class="path-temp">${this._value(t[d], !0) ?? "—"}</span>
          ${b ? c`<span class="path-airflow"
                  ><ha-icon icon="mdi:weather-windy" aria-hidden="true"></ha-icon>${b}</span
                >` : ""}
        </div>
      `;
    };
    return c`
      <div class="visual-wrap system-visual-wrap">
        ${n(
      "exhaust",
      "Exhaust air",
      "exhaust_air_temp",
      !1,
      "mdi:tree",
      "mdi:arrow-top-left-thin",
      "Flowing outdoors"
    )}
        ${n(
      "supply",
      "Supply air",
      "supply_air_temp",
      !0,
      "mdi:home",
      "mdi:arrow-top-right-thin",
      "Flowing into the home"
    )}
        <div class="unit ${r ? "active" : ""}" aria-label="Heat recovery unit">
          <div class="brand">
            ${i}${i.toLowerCase().includes("mvhr") ? "" : c`<br /><span>MVHR</span>`}
          </div>
          <div class="duct duct-top" aria-hidden="true"></div>
          <div class="duct duct-bottom" aria-hidden="true"></div>
          <div class="duct duct-left" aria-hidden="true"></div>
          <div class="duct duct-right" aria-hidden="true"></div>
          <div class="exchanger" aria-hidden="true"></div>
          <ha-icon class="fan fan-a" icon="mdi:fan" aria-hidden="true"></ha-icon>
          <ha-icon class="fan fan-b" icon="mdi:fan" aria-hidden="true"></ha-icon>
        </div>
        ${n(
      "extract",
      "Extract air",
      "extract_air_temp",
      !0,
      "mdi:home",
      "mdi:arrow-bottom-left-thin",
      "Drawn from the home"
    )}
        ${n(
      "outdoor",
      "Outdoor air",
      "outdoor_air_temp",
      !1,
      "mdi:tree",
      "mdi:arrow-bottom-right-thin",
      "Drawn from outdoors"
    )}
      </div>
    `;
  }
  _infoTile(t, e, r, i = "ok", o) {
    return c`
      <div class="info-tile tone-${i}" title=${o ?? _}>
        <ha-icon icon=${r} aria-hidden="true"></ha-icon>
        <span>${t}</span>
        <strong>${e}</strong>
      </div>
    `;
  }
  _filterTile(t, e) {
    const r = this._number(t.filter_remaining), i = r === void 0 ? 0 : Math.max(0, Math.min(100, r / e.filter_max_days * 100)), o = r === void 0 ? "—" : `${Math.round(r)} days`;
    return c`
      <div class="info-tile">
        <ha-icon icon="mdi:air-filter" aria-hidden="true"></ha-icon>
        <span>Filter</span>
        <strong>${o}</strong>
        <div class="bar" aria-hidden="true"><span style=${`width:${i}%`}></span></div>
      </div>
    `;
  }
  _heatRecovery(t, e) {
    return Ee({
      outdoor: this._number(t.outdoor_air_temp),
      extract: this._number(t.extract_air_temp),
      supply: this._number(t.supply_air_temp),
      method: e
    });
  }
  _pair(t, e, r = !1) {
    return t.map(
      ([i, o]) => `${o.replace(" fan", "")}: ${this._value(e[i], r) ?? "—"}`
    ).join(" · ");
  }
  _value(t, e = !1) {
    if (!t)
      return null;
    const r = this._present(t, e);
    return (r == null ? void 0 : r.text) ?? null;
  }
  _text(t) {
    return this._value(t) ?? "";
  }
  _state(t) {
    return (t == null ? void 0 : t.status) === "ok" ? t.value : void 0;
  }
  _number(t) {
    return (t == null ? void 0 : t.status) === "ok" ? t.numericValue : void 0;
  }
  _modeLabel(t) {
    const e = t.toLowerCase();
    return e === "medium" || e === "normal" ? "Home" : e === "boost" ? "Boost" : t ? Ae(t) : "";
  }
  _modeOptions(t) {
    return ((t == null ? void 0 : t.status) === "ok" && Array.isArray(t.attributes.options) ? t.attributes.options.filter((r) => typeof r == "string") : ["Away", "Low", "Home", "High"]).filter((r) => r.toLowerCase() !== "boost");
  }
  _selectOptions(t) {
    return (t == null ? void 0 : t.status) === "ok" && Array.isArray(t.attributes.options) ? t.attributes.options.filter((e) => typeof e == "string") : [];
  }
  _hasControls(t, e) {
    return [
      t.mode,
      t.boost_duration,
      t.start_boost,
      t.cancel_boost,
      t.override_duration,
      t.clear_override
    ].some((r) => (r == null ? void 0 : r.status) === "ok" && !!e.entities);
  }
  /**
   * Phase 10's bottom status strip signal. "Communication issue" takes
   * priority over everything else: a required role that's mapped but
   * unreachable (entity missing or unavailable) is the most actionable
   * problem. A configured, active fault entity is next, then calibration
   * state, falling back to "System OK". Optional roles that simply aren't
   * configured never factor in here — same rule as the header (Phase 4/10).
   */
  _dashboardStatus(t) {
    var i, o;
    for (const s of at) {
      if (ze.has(s))
        continue;
      const n = t[s];
      if ((n == null ? void 0 : n.status) === "entity_missing" || (n == null ? void 0 : n.status) === "unavailable")
        return { tone: "warning", label: "Communication issue" };
    }
    const e = t.fault_active;
    if ((e == null ? void 0 : e.status) === "ok" && Ne.has(e.value.toLowerCase()))
      return { tone: "warning", label: "Fault detected" };
    const r = ((i = t.calibration_status) == null ? void 0 : i.status) === "ok" ? t.calibration_status.value.toLowerCase() : "";
    return r && !Pe.has(r) ? { tone: "muted", label: "Calibrating…" } : ((o = t.calibration_result) == null ? void 0 : o.status) === "ok" && t.calibration_result.value === "not_calibrated" ? { tone: "warning", label: "Calibration required" } : { tone: "success", label: "System OK" };
  }
  _press(t, e) {
    e && this._call(t, "button", "press", { entity_id: e });
  }
  async _call(t, e, r, i) {
    var o;
    await ((o = t.callService) == null ? void 0 : o.call(t, e, r, i));
  }
};
nt.styles = Ct`
    :host {
      display: block;
      width: 100%;
    }

    ha-card {
      width: 100%;
      max-width: none;
      box-sizing: border-box;
      overflow: hidden;
    }

    .header {
      padding: 16px 16px 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .header-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .header-title-group {
      display: flex;
      align-items: center;
      gap: 9px;
      flex-wrap: wrap;
      min-width: 0;
    }
    .title {
      margin: 0;
      font-size: 1.3em;
      font-weight: 700;
      color: var(--primary-text-color);
    }
    .status-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      flex-shrink: 0;
      background: var(--secondary-text-color);
    }
    .status-dot.dot-success {
      background: var(--success-color);
    }
    .status-dot.dot-warning {
      background: var(--warning-color);
    }
    .status-dot.dot-muted {
      background: var(--secondary-text-color);
    }
    .mode-pill {
      font-size: 0.78em;
      font-weight: 700;
      padding: 3px 11px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--primary-color), transparent 85%);
      color: var(--primary-color);
      white-space: nowrap;
    }
    .subheader {
      color: var(--secondary-text-color);
      font-size: 0.9em;
    }
    .availability {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.85em;
    }
    .availability ha-icon {
      --mdc-icon-size: 16px;
    }
    /* Tone classes are scoped to .availability explicitly — metric/status
       rows below reuse the same tone-* class names but only ever color
       their .metric-value/.status-value text, never the label or icon,
       so labels stay legible and consistent regardless of tone. */
    .availability.tone-success {
      color: var(--success-color);
    }
    .availability.tone-warning {
      color: var(--warning-color);
    }
    .availability.tone-muted {
      color: var(--secondary-text-color);
    }

    /* ---- display_mode: homeowner — legacy compact content ---- */
    .content {
      padding: 0 16px 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* ---- display_mode: detailed — unified dashboard (Phase 2-3 rebuild) ---- */
    .mvhr-dashboard {
      width: 100%;
      box-sizing: border-box;
      padding: 4px 16px 16px;
      display: grid;
      grid-template-columns: minmax(0, 7fr) minmax(240px, 3fr);
      grid-template-areas:
        'visual controls'
        'metrics metrics'
        'status status'
        'extra extra';
      gap: 16px;
      align-items: start;
    }
    .mvhr-dashboard.no-controls {
      grid-template-columns: minmax(0, 1fr);
      grid-template-areas:
        'visual'
        'metrics'
        'status'
        'extra';
    }
    .visual-panel {
      grid-area: visual;
      min-width: 0;
      box-sizing: border-box;
      border: 1px solid var(--divider-color);
      border-radius: 16px;
      background:
        linear-gradient(145deg, rgba(40, 90, 130, 0.14), transparent),
        var(--ha-card-background, var(--card-background-color));
      padding: 18px;
    }
    .controls-panel {
      grid-area: controls;
      min-width: 0;
      box-sizing: border-box;
      border: 1px solid var(--divider-color);
      border-radius: 16px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      background: color-mix(
        in srgb,
        var(--ha-card-background, var(--card-background-color)),
        var(--primary-color) 4%
      );
    }
    .extra-controls {
      grid-area: extra;
    }

    .visual-wrap {
      min-height: 340px;
      display: grid;
      grid-template-columns: minmax(190px, 1fr) minmax(260px, 340px) minmax(190px, 1fr);
      grid-template-rows: 1fr 1fr;
      gap: 16px;
      align-items: center;
      width: 100%;
      box-sizing: border-box;
    }
    .unit {
      grid-column: 2;
      grid-row: 1 / span 2;
      width: 100%;
      min-height: 220px;
      border-radius: 22px;
      border: 1px solid var(--divider-color);
      background: linear-gradient(155deg, rgba(255, 255, 255, 0.18), rgba(128, 128, 128, 0.08));
      display: grid;
      place-items: center;
      position: relative;
      overflow: hidden;
      color: var(--primary-text-color);
      box-shadow:
        inset 0 0 0 1px rgba(255, 255, 255, 0.08),
        0 8px 22px rgba(0, 0, 0, 0.1);
    }
    .brand {
      position: absolute;
      top: 16px;
      left: 18px;
      font-weight: 800;
      line-height: 1.05;
      z-index: 2;
    }
    .brand span {
      color: var(--secondary-text-color);
      font-size: 0.72em;
      font-weight: 600;
      letter-spacing: 0.06em;
    }
    .exchanger {
      width: 84px;
      height: 84px;
      transform: rotate(45deg);
      border: 2px solid var(--primary-color);
      background:
        linear-gradient(90deg, transparent 45%, var(--divider-color) 45% 55%, transparent 55%),
        linear-gradient(0deg, transparent 45%, var(--divider-color) 45% 55%, transparent 55%);
      opacity: 0.8;
    }
    .fan {
      position: absolute;
      color: var(--secondary-text-color);
      font-size: 26px;
      z-index: 1;
    }
    .fan-a {
      right: 26px;
      top: 40px;
    }
    .fan-b {
      left: 28px;
      bottom: 40px;
    }
    .duct {
      position: absolute;
      background: color-mix(in srgb, var(--divider-color), transparent 5%);
      z-index: 1;
    }
    .duct-top {
      top: -1px;
      left: 50%;
      transform: translateX(-50%);
      width: 40px;
      height: 10px;
      border-radius: 4px 4px 0 0;
    }
    .duct-bottom {
      bottom: -1px;
      left: 50%;
      transform: translateX(-50%);
      width: 40px;
      height: 10px;
      border-radius: 0 0 4px 4px;
    }
    .duct-left {
      left: -1px;
      top: 50%;
      transform: translateY(-50%);
      width: 10px;
      height: 40px;
      border-radius: 4px 0 0 4px;
    }
    .duct-right {
      right: -1px;
      top: 50%;
      transform: translateY(-50%);
      width: 10px;
      height: 40px;
      border-radius: 0 4px 4px 0;
    }
    .recovery-badge {
      position: absolute;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      padding: 6px 16px;
      border-radius: 10px;
      background: color-mix(
        in srgb,
        var(--ha-card-background, var(--card-background-color)),
        transparent 8%
      );
      border: 1px solid var(--divider-color);
      text-align: center;
      z-index: 2;
      cursor: default;
    }
    .recovery-label {
      font-size: 0.66em;
      color: var(--secondary-text-color);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .recovery-value {
      font-size: 1.35em;
      font-weight: 800;
      color: var(--success-color);
    }
    .air-path {
      border-radius: 14px;
      padding: 14px;
      min-height: 92px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 4px;
      border: 1px solid color-mix(in srgb, var(--divider-color), transparent 20%);
      position: relative;
      overflow: hidden;
    }
    .air-path::after {
      content: '';
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(
        90deg,
        transparent 0 16px,
        rgba(255, 255, 255, 0.18) 16px 20px
      );
      opacity: 0.18;
      transform: translateX(-20px);
    }
    .air-path.active::after {
      animation: flow 1.8s linear infinite;
    }
    .extract {
      background: color-mix(in srgb, var(--error-color), transparent 82%);
    }
    .exhaust {
      background: color-mix(in srgb, #ff9800, transparent 84%);
    }
    .outdoor {
      background: color-mix(in srgb, #009688, transparent 84%);
    }
    .supply {
      background: color-mix(in srgb, var(--primary-color), transparent 84%);
    }
    .path-label,
    .path-airflow {
      color: var(--secondary-text-color);
      font-size: 0.82em;
      z-index: 1;
    }
    .path-temp {
      color: var(--primary-text-color);
      font-size: 1.35em;
      font-weight: 700;
      z-index: 1;
    }

    .panel-heading {
      font-weight: 700;
      color: var(--primary-text-color);
    }
    .control-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .control-group-label {
      font-size: 0.76em;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--secondary-text-color);
    }
    .mode-buttons {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(64px, 1fr));
      gap: 8px;
    }
    .button-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .chip,
    .controls-panel button {
      font: inherit;
      font-size: 0.92em;
      border: 1px solid var(--divider-color);
      border-radius: 999px;
      background: var(--ha-card-background, var(--card-background-color));
      color: var(--primary-text-color);
      padding: 10px 14px;
      min-height: 44px;
      box-sizing: border-box;
      cursor: pointer;
    }
    .chip {
      font-weight: 700;
      text-align: center;
    }
    .chip.active {
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
      border-color: var(--primary-color);
    }
    .cta {
      flex: 1;
      font-weight: 700;
      min-width: 120px;
    }
    .cta.ghost {
      background: none;
    }
    .cta.full {
      width: 100%;
      flex: none;
    }
    .chip:focus-visible,
    .controls-panel button:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
    .chip:disabled,
    .controls-panel button:disabled {
      cursor: default;
      color: var(--secondary-text-color);
      opacity: 0.6;
    }
    .control-block {
      display: grid;
      gap: 6px;
      color: var(--primary-text-color);
      padding-top: 10px;
      border-top: 1px solid var(--divider-color);
    }
    .control-block-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .control-block small {
      color: var(--secondary-text-color);
    }
    .state-pill {
      font-size: 0.78em;
      font-weight: 700;
      padding: 2px 10px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--divider-color), transparent 20%);
      color: var(--secondary-text-color);
    }
    .state-pill.is-active {
      background: color-mix(in srgb, var(--success-color), transparent 78%);
      color: var(--success-color);
    }
    .field {
      display: grid;
      gap: 4px;
      color: var(--secondary-text-color);
      font-size: 0.78em;
    }
    .field input,
    .field select {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      background: var(--ha-card-background, var(--card-background-color));
      color: var(--primary-text-color);
      padding: 10px 9px;
      min-height: 44px;
      font: inherit;
      font-size: 1.05em;
    }
    .field input:focus-visible,
    .field select:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
    .field input:disabled,
    .field select:disabled {
      opacity: 0.6;
    }

    .metrics-grid {
      grid-area: metrics;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 12px;
      width: 100%;
      box-sizing: border-box;
    }
    .info-tile {
      border: 1px solid var(--divider-color);
      border-radius: 12px;
      padding: 12px;
      display: grid;
      gap: 4px;
      color: var(--primary-text-color);
      min-width: 0;
      box-sizing: border-box;
    }
    .info-tile ha-icon {
      color: var(--primary-color);
    }
    .info-tile span {
      color: var(--secondary-text-color);
      font-size: 0.78em;
    }
    .info-tile strong {
      font-size: 1.1em;
      word-break: break-word;
    }
    .info-tile.tone-unavailable strong,
    .info-tile.tone-not_applicable strong,
    .info-tile.tone-calculating strong {
      color: var(--secondary-text-color);
    }
    .bar {
      height: 5px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--divider-color), transparent 20%);
      overflow: hidden;
    }
    .bar span {
      display: block;
      height: 100%;
      background: var(--success-color);
    }

    .status-strip {
      grid-area: status;
      border-top: 1px solid var(--divider-color);
      padding-top: 12px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px 20px;
      color: var(--secondary-text-color);
      font-size: 0.88em;
    }
    .status-chip {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 700;
      color: var(--primary-text-color);
    }
    .status-chip ha-icon {
      --mdc-icon-size: 18px;
    }
    .status-strip.tone-success .status-chip {
      color: var(--success-color);
    }
    .status-strip.tone-warning .status-chip {
      color: var(--warning-color);
    }
    .status-strip.tone-muted .status-chip {
      color: var(--secondary-text-color);
    }

    @keyframes flow {
      to {
        transform: translateX(20px);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .air-path.active::after,
      .unit.active .fan,
      .system-visual-panel .exhaust.active::after,
      .system-visual-panel .outdoor.active::after,
      .system-visual-panel .supply.active::after,
      .system-visual-panel .extract.active::after,
      .system-visual-panel .unit.active .fan,
      .droplet {
        animation: none;
      }
      /* The droplets still shouldn't render as solid opaque lines once their
         animation is disabled — hide them outright rather than leave a
         static streak, since opacity:0 -> opacity:0.9 was entirely what the
         animation provided. */
      .droplet {
        opacity: 0.35;
      }
    }

    section h3 {
      margin: 0 0 8px;
      font-size: 0.8em;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--secondary-text-color);
    }

    .metric-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
      gap: 12px;
    }
    .metric {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }
    .metric-text {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .metric-label {
      font-size: 0.8em;
      color: var(--secondary-text-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .metric-value {
      font-size: 1em;
      color: var(--primary-text-color);
      word-break: break-word;
    }
    .metric.tone-muted .metric-value {
      color: var(--secondary-text-color);
    }
    .metric.tone-warning .metric-value {
      color: var(--warning-color);
    }

    .status-list {
      display: flex;
      flex-direction: column;
    }
    .status-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 0;
      border-bottom: 1px solid var(--divider-color);
      font-size: 0.95em;
      color: var(--primary-text-color);
    }
    .status-row:last-child {
      border-bottom: none;
    }
    .status-label {
      flex: 1;
      min-width: 0;
    }
    .status-value {
      text-align: right;
      word-break: break-word;
      max-width: 60%;
    }
    .status-row.tone-muted .status-value {
      color: var(--secondary-text-color);
    }
    .status-row.tone-warning .status-value {
      color: var(--warning-color);
    }
    /* Used only by an action row's own error state (e.g. filter reset
       failed) — the row itself carries no overall tone, unlike the
       value-role rows above, so this is scoped to the value span directly. */
    .status-value.tone-warning {
      color: var(--warning-color);
      font-size: 0.85em;
    }

    .control-button {
      font: inherit;
      font-size: 0.85em;
      color: var(--primary-color);
      background: none;
      border: 1px solid var(--primary-color);
      border-radius: 4px;
      padding: 4px 10px;
      cursor: pointer;
      flex-shrink: 0;
    }
    .control-button:disabled {
      color: var(--secondary-text-color);
      border-color: var(--divider-color);
      cursor: default;
    }
    .control-button:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }

    .error {
      padding: 16px;
      color: var(--error-color);
    }

    /* ---- display_mode: system — flagship full-width visual panel (visual
       redesign: two-column overview/shower main section, three lower
       information cards, compact header controls). Every colour here is a
       plain CSS variable or a color-mix() tint against the current theme's
       own card background — nothing is a hard-coded dark surface, so this
       stays legible in a light Home Assistant theme and simply reads darker
       automatically under a dark one. ---- */
    .mvhr-system {
      width: 100%;
      box-sizing: border-box;
      padding: 4px 16px 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      /* Scoped to system mode only — the shower panel's one deliberately
         fixed brand accent, chosen so it never gets confused with the
         success/warning/primary tones the rest of the card already uses. */
      --shower-color: #a855f7;
    }
    .system-main {
      display: grid;
      grid-template-columns: minmax(0, 3fr) minmax(260px, 2fr);
      gap: 16px;
      align-items: stretch;
    }
    .system-main.no-shower {
      grid-template-columns: minmax(0, 1fr);
    }
    .panel-heading-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 12px;
    }
    .panel-heading-row h3,
    .lower-card h3 {
      margin: 0;
      font-size: 1em;
      font-weight: 700;
      color: var(--primary-text-color);
    }
    .recovery-pill {
      font-size: 0.82em;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--success-color), transparent 85%);
      color: var(--success-color);
      white-space: nowrap;
    }
    .system-visual-panel {
      min-width: 0;
    }
    .system-visual-wrap {
      min-height: 420px;
      grid-template-columns: minmax(190px, 1fr) minmax(320px, 400px) minmax(190px, 1fr);
    }
    .system-visual-panel .unit {
      min-height: 360px;
      border-radius: 28px;
    }
    .system-visual-panel .fan {
      --mdc-icon-size: 34px;
    }
    .system-visual-panel .exchanger {
      width: 104px;
      height: 104px;
    }
    .system-visual-panel .path-label {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .system-visual-panel .path-label ha-icon,
    .system-visual-panel .path-airflow ha-icon {
      --mdc-icon-size: 15px;
    }
    /* Directional arrow icon per path (visual redesign — "directional
       arrows", never relying on colour alone). Pushed to the end of the
       label row. */
    .path-arrow {
      --mdc-icon-size: 14px;
      margin-left: auto;
      opacity: 0.8;
    }
    /* Redesign colour families, scoped to .system-visual-panel only so
       _heroVisual's own .supply/.extract/.outdoor/.exhaust colours
       (detailed mode) are completely untouched: supply/outdoor read as a
       cool blue family, extract as a warm orange family, exhaust as a
       neutral grey family. Labels/icons still carry the meaning too, never
       colour alone. */
    .system-visual-panel .air-path.supply,
    .system-visual-panel .air-path.outdoor {
      background: color-mix(in srgb, #3b82f6, transparent 84%);
      border-color: color-mix(in srgb, #3b82f6, transparent 55%);
    }
    .system-visual-panel .air-path.extract {
      background: color-mix(in srgb, #f59e0b, transparent 84%);
      border-color: color-mix(in srgb, #f59e0b, transparent 55%);
    }
    .system-visual-panel .air-path.exhaust {
      background: color-mix(in srgb, var(--secondary-text-color), transparent 84%);
      border-color: color-mix(in srgb, var(--secondary-text-color), transparent 55%);
    }
    /* Direction-aware duct animation for system mode's top/bottom
       arrangement (Phase 6/7): Exhaust (top-left) and Supply (top-right)
       both flow away from the unit; Extract (bottom-left) and Outdoor
       (bottom-right) both flow toward it. The detailed-mode hero visual's
       own single "flow" keyframe is untouched — these selectors only match
       elements inside .system-visual-panel. */
    .system-visual-panel .exhaust.active::after {
      animation: flow-left 1.8s linear infinite;
    }
    .system-visual-panel .outdoor.active::after {
      animation: flow-left 1.8s linear infinite;
    }
    .system-visual-panel .supply.active::after {
      animation: flow-right 1.8s linear infinite;
    }
    .system-visual-panel .extract.active::after {
      animation: flow-right 1.8s linear infinite;
    }
    .system-visual-panel .unit.active .fan {
      animation: spin 6s linear infinite;
    }

    /* ---- shower-detection panel ---- */
    .shower-panel {
      border-radius: 16px;
      padding: 16px;
      box-sizing: border-box;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }
    .shower-inactive {
      border: 1px solid var(--divider-color);
      background: var(--ha-card-background, var(--card-background-color));
      flex-direction: row;
      align-items: center;
      gap: 12px;
      justify-content: flex-start;
    }
    .shower-inactive ha-icon {
      --mdc-icon-size: 28px;
      color: var(--secondary-text-color);
      flex-shrink: 0;
    }
    .shower-inactive div {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .shower-inactive strong {
      color: var(--primary-text-color);
    }
    .shower-inactive span {
      color: var(--secondary-text-color);
      font-size: 0.85em;
    }
    .shower-active {
      border: 1px solid color-mix(in srgb, var(--shower-color), transparent 55%);
      background: color-mix(in srgb, var(--shower-color), transparent 92%);
      align-items: center;
      text-align: center;
      gap: 6px;
    }
    .shower-heading {
      align-self: flex-start;
      color: var(--shower-color);
      font-size: 1em;
      margin: 0 0 4px;
    }
    .shower-illustration {
      width: 96px;
      height: 80px;
    }
    .shower-svg {
      width: 100%;
      height: 100%;
      overflow: visible;
    }
    .shower-head {
      fill: var(--secondary-text-color);
      opacity: 0.85;
    }
    .shower-hole {
      fill: var(--ha-card-background, var(--card-background-color));
    }
    .droplet {
      stroke: var(--shower-color);
      stroke-width: 2;
      stroke-linecap: round;
      opacity: 0;
      animation: shower-fall 1.1s linear infinite;
    }
    .shower-title {
      color: var(--shower-color);
      font-size: 1.15em;
      font-weight: 800;
    }
    .shower-subtitle {
      color: var(--secondary-text-color);
      font-size: 0.88em;
      margin-bottom: 8px;
    }
    .shower-facts {
      width: 100%;
      margin: 0;
      display: grid;
      gap: 10px;
      text-align: left;
    }
    .shower-fact {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;
      padding-top: 8px;
      border-top: 1px solid color-mix(in srgb, var(--shower-color), transparent 70%);
    }
    .shower-fact dt {
      margin: 0;
      color: var(--secondary-text-color);
      font-size: 0.85em;
    }
    .shower-fact dd {
      margin: 0;
      color: var(--shower-color);
      font-size: 1.2em;
      font-weight: 800;
      text-align: right;
    }
    .shower-fact dd small {
      display: block;
      color: var(--secondary-text-color);
      font-size: 0.6em;
      font-weight: 500;
    }

    @keyframes shower-fall {
      0% {
        opacity: 0;
        stroke-dashoffset: 12;
      }
      30% {
        opacity: 0.9;
      }
      100% {
        opacity: 0;
        stroke-dashoffset: -12;
      }
    }

    /* ---- lower dashboard panels: Airflow / Temperatures / System Status ---- */
    .system-lower-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
    }
    .lower-card {
      border: 1px solid var(--divider-color);
      border-radius: 16px;
      padding: 16px;
      box-sizing: border-box;
      min-width: 0;
      background: var(--ha-card-background, var(--card-background-color));
    }
    .airflow-card-body {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    .airflow-card-rows {
      flex: 1 1 140px;
      min-width: 0;
    }
    .gauge {
      width: 140px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .gauge-svg {
      width: 100%;
      height: auto;
      overflow: visible;
    }
    .gauge-track {
      fill: none;
      stroke: var(--divider-color);
      stroke-width: 10;
      stroke-linecap: round;
    }
    .gauge-fill {
      fill: none;
      stroke: #3b82f6;
      stroke-width: 10;
      stroke-linecap: round;
      transition: stroke-dashoffset 0.4s ease;
    }
    .gauge-value {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-top: -18px;
    }
    .gauge-value strong {
      font-size: 1.5em;
      color: var(--primary-text-color);
    }
    .gauge-value span {
      font-size: 0.72em;
      color: var(--secondary-text-color);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    /* ---- compact header controls (visual redesign) ---- */
    .system-controls.header-controls {
      border: none;
      background: none;
      padding: 0;
      display: flex;
      align-items: flex-end;
      gap: 14px;
      flex-wrap: wrap;
    }
    .header-control {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .header-control-label {
      font-size: 0.72em;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--secondary-text-color);
    }
    .mode-select-pill,
    .boost-pill-button {
      font: inherit;
      font-weight: 700;
      font-size: 0.95em;
      border: 1px solid var(--divider-color);
      border-radius: 999px;
      padding: 8px 14px;
      min-height: 40px;
      background: var(--ha-card-background, var(--card-background-color));
      color: var(--primary-text-color);
      box-sizing: border-box;
      cursor: pointer;
    }
    .boost-pill-button {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .boost-pill-button ha-icon {
      --mdc-icon-size: 16px;
    }
    .boost-pill-button.is-active {
      background: color-mix(in srgb, var(--success-color), transparent 82%);
      border-color: color-mix(in srgb, var(--success-color), transparent 45%);
      color: var(--success-color);
    }
    .boost-pill-button:disabled {
      opacity: 0.6;
      cursor: default;
    }
    .mode-select-pill:focus-visible,
    .boost-pill-button:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }

    .system-more {
      display: flex;
      justify-content: center;
    }
    .disclosure-toggle {
      align-self: center;
      font: inherit;
      font-weight: 700;
      font-size: 0.9em;
      color: var(--primary-color);
      background: none;
      border: 1px solid var(--divider-color);
      border-radius: 999px;
      padding: 10px 16px;
      min-height: 44px;
      cursor: pointer;
      box-sizing: border-box;
    }
    .disclosure-toggle:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
    .advanced-drawer {
      border-top: 1px solid var(--divider-color);
      padding-top: 14px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    @keyframes flow-left {
      to {
        transform: translateX(-20px);
      }
    }
    @keyframes flow-right {
      to {
        transform: translateX(20px);
      }
    }
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    @media (max-width: 360px) {
      .metric-grid {
        grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
      }
      .header,
      .content {
        padding-left: 12px;
        padding-right: 12px;
      }
    }

    /* Tablet (~768-1024px): visual full width, controls below, metrics in
       a slightly denser auto-fit grid. */
    @media (max-width: 900px) {
      .mvhr-dashboard,
      .mvhr-dashboard.no-controls {
        grid-template-columns: minmax(0, 1fr);
        grid-template-areas:
          'visual'
          'controls'
          'metrics'
          'status'
          'extra';
      }
      .visual-wrap {
        grid-template-columns: minmax(150px, 1fr) minmax(220px, 280px) minmax(150px, 1fr);
        min-height: 300px;
      }
      .unit {
        min-height: 200px;
      }
      .metrics-grid {
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      }
      .system-visual-wrap {
        grid-template-columns: minmax(150px, 1fr) minmax(240px, 300px) minmax(150px, 1fr);
        min-height: 380px;
      }
      .system-visual-panel .unit {
        min-height: 260px;
      }
      /* Tablet: overview and shower panel stack instead of sitting
         side-by-side (a 260px-minimum shower column gets uncomfortably
         cramped next to the visual below ~900px), and the three lower
         cards wrap to two columns instead of three. */
      .system-main,
      .system-main.no-shower {
        grid-template-columns: minmax(0, 1fr);
      }
      .system-lower-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    /* Mobile (<600px): compact 2x2 endpoint grid around the unit, controls
       stacked, metrics locked to 2 columns — never horizontal scroll. */
    @media (max-width: 599px) {
      .mvhr-dashboard {
        padding-left: 12px;
        padding-right: 12px;
      }
      .visual-panel {
        padding: 12px;
      }
      .visual-wrap {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        grid-template-rows: auto auto auto;
        min-height: 0;
        gap: 10px;
      }
      .unit {
        grid-column: 1 / -1;
        grid-row: 1;
        min-height: 150px;
        border-radius: 18px;
      }
      .exchanger {
        width: 60px;
        height: 60px;
      }
      .air-path {
        grid-column: auto;
        grid-row: auto;
        min-height: 66px;
        padding: 10px;
      }
      .path-temp {
        font-size: 1.1em;
      }
      .metrics-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .status-strip {
        gap: 6px 14px;
      }
      .mvhr-system {
        padding-left: 12px;
        padding-right: 12px;
      }
      .system-visual-panel {
        padding: 12px;
      }
      .system-visual-wrap {
        min-height: 0;
      }
      .system-visual-panel .unit {
        min-height: 170px;
      }
      .system-visual-panel .fan {
        --mdc-icon-size: 26px;
      }
      /* Single column everywhere on mobile: main section, lower cards, and
         the header's compact controls all stack, and the shower/gauge
         graphics shrink so nothing overlaps or forces horizontal scroll. */
      .system-main,
      .system-main.no-shower {
        grid-template-columns: minmax(0, 1fr);
      }
      .system-lower-grid {
        grid-template-columns: minmax(0, 1fr);
      }
      .header-controls {
        width: 100%;
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
      }
      .header-control {
        width: 100%;
      }
      .mode-select-pill,
      .boost-pill-button {
        width: 100%;
        justify-content: center;
      }
      .shower-illustration {
        width: 72px;
        height: 60px;
      }
      .airflow-card-body {
        flex-direction: column;
        align-items: stretch;
      }
      .gauge {
        width: 100%;
        max-width: 220px;
        margin: 0 auto;
      }
      .disclosure-toggle {
        width: 100%;
      }
    }
  `;
let E = nt;
W([
  ot({ attribute: !1 })
], E.prototype, "hass");
W([
  Y()
], E.prototype, "_config");
W([
  Y()
], E.prototype, "_configError");
W([
  Y()
], E.prototype, "_advancedOpen");
customElements.get(F) || customElements.define(F, E);
window.customCards = window.customCards ?? [];
window.customCards.some((a) => a.type === F) || window.customCards.push({
  type: F,
  name: "HiPer MVHR Card",
  description: "Universal MVHR dashboard card for Home Assistant"
});
