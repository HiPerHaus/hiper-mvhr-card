/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Q = globalThis, de = Q.ShadowRoot && (Q.ShadyCSS === void 0 || Q.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, pe = Symbol(), ve = /* @__PURE__ */ new WeakMap();
let De = class {
  constructor(e, t, r) {
    if (this._$cssResult$ = !0, r !== pe) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = e, this.t = t;
  }
  get styleSheet() {
    let e = this.o;
    const t = this.t;
    if (de && e === void 0) {
      const r = t !== void 0 && t.length === 1;
      r && (e = ve.get(t)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), r && ve.set(t, e));
    }
    return e;
  }
  toString() {
    return this.cssText;
  }
};
const Xe = (s) => new De(typeof s == "string" ? s : s + "", void 0, pe), Be = (s, ...e) => {
  const t = s.length === 1 ? s[0] : e.reduce((r, a, i) => r + ((o) => {
    if (o._$cssResult$ === !0) return o.cssText;
    if (typeof o == "number") return o;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + o + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(a) + s[i + 1], s[0]);
  return new De(t, s, pe);
}, Je = (s, e) => {
  if (de) s.adoptedStyleSheets = e.map((t) => t instanceof CSSStyleSheet ? t : t.styleSheet);
  else for (const t of e) {
    const r = document.createElement("style"), a = Q.litNonce;
    a !== void 0 && r.setAttribute("nonce", a), r.textContent = t.cssText, s.appendChild(r);
  }
}, xe = de ? (s) => s : (s) => s instanceof CSSStyleSheet ? ((e) => {
  let t = "";
  for (const r of e.cssRules) t += r.cssText;
  return Xe(t);
})(s) : s;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const { is: et, defineProperty: tt, getOwnPropertyDescriptor: rt, getOwnPropertyNames: at, getOwnPropertySymbols: it, getPrototypeOf: ot } = Object, E = globalThis, we = E.trustedTypes, st = we ? we.emptyScript : "", ae = E.reactiveElementPolyfillSupport, I = (s, e) => s, K = { toAttribute(s, e) {
  switch (e) {
    case Boolean:
      s = s ? st : null;
      break;
    case Object:
    case Array:
      s = s == null ? s : JSON.stringify(s);
  }
  return s;
}, fromAttribute(s, e) {
  let t = s;
  switch (e) {
    case Boolean:
      t = s !== null;
      break;
    case Number:
      t = s === null ? null : Number(s);
      break;
    case Object:
    case Array:
      try {
        t = JSON.parse(s);
      } catch {
        t = null;
      }
  }
  return t;
} }, ue = (s, e) => !et(s, e), ye = { attribute: !0, type: String, converter: K, reflect: !1, useDefault: !1, hasChanged: ue };
Symbol.metadata ?? (Symbol.metadata = Symbol("metadata")), E.litPropertyMetadata ?? (E.litPropertyMetadata = /* @__PURE__ */ new WeakMap());
let L = class extends HTMLElement {
  static addInitializer(e) {
    this._$Ei(), (this.l ?? (this.l = [])).push(e);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(e, t = ye) {
    if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
      const r = Symbol(), a = this.getPropertyDescriptor(e, r, t);
      a !== void 0 && tt(this.prototype, e, a);
    }
  }
  static getPropertyDescriptor(e, t, r) {
    const { get: a, set: i } = rt(this.prototype, e) ?? { get() {
      return this[t];
    }, set(o) {
      this[t] = o;
    } };
    return { get: a, set(o) {
      const n = a == null ? void 0 : a.call(this);
      i == null || i.call(this, o), this.requestUpdate(e, n, r);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(e) {
    return this.elementProperties.get(e) ?? ye;
  }
  static _$Ei() {
    if (this.hasOwnProperty(I("elementProperties"))) return;
    const e = ot(this);
    e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(I("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(I("properties"))) {
      const t = this.properties, r = [...at(t), ...it(t)];
      for (const a of r) this.createProperty(a, t[a]);
    }
    const e = this[Symbol.metadata];
    if (e !== null) {
      const t = litPropertyMetadata.get(e);
      if (t !== void 0) for (const [r, a] of t) this.elementProperties.set(r, a);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t, r] of this.elementProperties) {
      const a = this._$Eu(t, r);
      a !== void 0 && this._$Eh.set(a, t);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(e) {
    const t = [];
    if (Array.isArray(e)) {
      const r = new Set(e.flat(1 / 0).reverse());
      for (const a of r) t.unshift(xe(a));
    } else e !== void 0 && t.push(xe(e));
    return t;
  }
  static _$Eu(e, t) {
    const r = t.attribute;
    return r === !1 ? void 0 : typeof r == "string" ? r : typeof e == "string" ? e.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = !1, this.hasUpdated = !1, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    var e;
    this._$ES = new Promise((t) => this.enableUpdating = t), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), (e = this.constructor.l) == null || e.forEach((t) => t(this));
  }
  addController(e) {
    var t;
    (this._$EO ?? (this._$EO = /* @__PURE__ */ new Set())).add(e), this.renderRoot !== void 0 && this.isConnected && ((t = e.hostConnected) == null || t.call(e));
  }
  removeController(e) {
    var t;
    (t = this._$EO) == null || t.delete(e);
  }
  _$E_() {
    const e = /* @__PURE__ */ new Map(), t = this.constructor.elementProperties;
    for (const r of t.keys()) this.hasOwnProperty(r) && (e.set(r, this[r]), delete this[r]);
    e.size > 0 && (this._$Ep = e);
  }
  createRenderRoot() {
    const e = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return Je(e, this.constructor.elementStyles), e;
  }
  connectedCallback() {
    var e;
    this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this.enableUpdating(!0), (e = this._$EO) == null || e.forEach((t) => {
      var r;
      return (r = t.hostConnected) == null ? void 0 : r.call(t);
    });
  }
  enableUpdating(e) {
  }
  disconnectedCallback() {
    var e;
    (e = this._$EO) == null || e.forEach((t) => {
      var r;
      return (r = t.hostDisconnected) == null ? void 0 : r.call(t);
    });
  }
  attributeChangedCallback(e, t, r) {
    this._$AK(e, r);
  }
  _$ET(e, t) {
    var i;
    const r = this.constructor.elementProperties.get(e), a = this.constructor._$Eu(e, r);
    if (a !== void 0 && r.reflect === !0) {
      const o = (((i = r.converter) == null ? void 0 : i.toAttribute) !== void 0 ? r.converter : K).toAttribute(t, r.type);
      this._$Em = e, o == null ? this.removeAttribute(a) : this.setAttribute(a, o), this._$Em = null;
    }
  }
  _$AK(e, t) {
    var i, o;
    const r = this.constructor, a = r._$Eh.get(e);
    if (a !== void 0 && this._$Em !== a) {
      const n = r.getPropertyOptions(a), l = typeof n.converter == "function" ? { fromAttribute: n.converter } : ((i = n.converter) == null ? void 0 : i.fromAttribute) !== void 0 ? n.converter : K;
      this._$Em = a;
      const p = l.fromAttribute(t, n.type);
      this[a] = p ?? ((o = this._$Ej) == null ? void 0 : o.get(a)) ?? p, this._$Em = null;
    }
  }
  requestUpdate(e, t, r, a = !1, i) {
    var o;
    if (e !== void 0) {
      const n = this.constructor;
      if (a === !1 && (i = this[e]), r ?? (r = n.getPropertyOptions(e)), !((r.hasChanged ?? ue)(i, t) || r.useDefault && r.reflect && i === ((o = this._$Ej) == null ? void 0 : o.get(e)) && !this.hasAttribute(n._$Eu(e, r)))) return;
      this.C(e, t, r);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$EP());
  }
  C(e, t, { useDefault: r, reflect: a, wrapped: i }, o) {
    r && !(this._$Ej ?? (this._$Ej = /* @__PURE__ */ new Map())).has(e) && (this._$Ej.set(e, o ?? t ?? this[e]), i !== !0 || o !== void 0) || (this._$AL.has(e) || (this.hasUpdated || r || (t = void 0), this._$AL.set(e, t)), a === !0 && this._$Em !== e && (this._$Eq ?? (this._$Eq = /* @__PURE__ */ new Set())).add(e));
  }
  async _$EP() {
    this.isUpdatePending = !0;
    try {
      await this._$ES;
    } catch (t) {
      Promise.reject(t);
    }
    const e = this.scheduleUpdate();
    return e != null && await e, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    var r;
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this._$Ep) {
        for (const [i, o] of this._$Ep) this[i] = o;
        this._$Ep = void 0;
      }
      const a = this.constructor.elementProperties;
      if (a.size > 0) for (const [i, o] of a) {
        const { wrapped: n } = o, l = this[i];
        n !== !0 || this._$AL.has(i) || l === void 0 || this.C(i, void 0, o, l);
      }
    }
    let e = !1;
    const t = this._$AL;
    try {
      e = this.shouldUpdate(t), e ? (this.willUpdate(t), (r = this._$EO) == null || r.forEach((a) => {
        var i;
        return (i = a.hostUpdate) == null ? void 0 : i.call(a);
      }), this.update(t)) : this._$EM();
    } catch (a) {
      throw e = !1, this._$EM(), a;
    }
    e && this._$AE(t);
  }
  willUpdate(e) {
  }
  _$AE(e) {
    var t;
    (t = this._$EO) == null || t.forEach((r) => {
      var a;
      return (a = r.hostUpdated) == null ? void 0 : a.call(r);
    }), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(e)), this.updated(e);
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
  shouldUpdate(e) {
    return !0;
  }
  update(e) {
    this._$Eq && (this._$Eq = this._$Eq.forEach((t) => this._$ET(t, this[t]))), this._$EM();
  }
  updated(e) {
  }
  firstUpdated(e) {
  }
};
L.elementStyles = [], L.shadowRootOptions = { mode: "open" }, L[I("elementProperties")] = /* @__PURE__ */ new Map(), L[I("finalized")] = /* @__PURE__ */ new Map(), ae == null || ae({ ReactiveElement: L }), (E.reactiveElementVersions ?? (E.reactiveElementVersions = [])).push("2.1.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const j = globalThis, $e = (s) => s, X = j.trustedTypes, ke = X ? X.createPolicy("lit-html", { createHTML: (s) => s }) : void 0, Ie = "$lit$", S = `lit$${Math.random().toFixed(9).slice(2)}$`, je = "?" + S, nt = `<${je}>`, R = document, F = () => R.createComment(""), V = (s) => s === null || typeof s != "object" && typeof s != "function", he = Array.isArray, lt = (s) => he(s) || typeof (s == null ? void 0 : s[Symbol.iterator]) == "function", ie = `[ 	
\f\r]`, B = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, Ae = /-->/g, Se = />/g, C = RegExp(`>|${ie}(?:([^\\s"'>=/]+)(${ie}*=${ie}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), Ee = /'/g, Ce = /"/g, Fe = /^(?:script|style|textarea|title)$/i, Ve = (s) => (e, ...t) => ({ _$litType$: s, strings: e, values: t }), c = Ve(1), A = Ve(2), N = Symbol.for("lit-noChange"), g = Symbol.for("lit-nothing"), Me = /* @__PURE__ */ new WeakMap(), M = R.createTreeWalker(R, 129);
function qe(s, e) {
  if (!he(s) || !s.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return ke !== void 0 ? ke.createHTML(e) : e;
}
const ct = (s, e) => {
  const t = s.length - 1, r = [];
  let a, i = e === 2 ? "<svg>" : e === 3 ? "<math>" : "", o = B;
  for (let n = 0; n < t; n++) {
    const l = s[n];
    let p, d, u = -1, h = 0;
    for (; h < l.length && (o.lastIndex = h, d = o.exec(l), d !== null); ) h = o.lastIndex, o === B ? d[1] === "!--" ? o = Ae : d[1] !== void 0 ? o = Se : d[2] !== void 0 ? (Fe.test(d[2]) && (a = RegExp("</" + d[2], "g")), o = C) : d[3] !== void 0 && (o = C) : o === C ? d[0] === ">" ? (o = a ?? B, u = -1) : d[1] === void 0 ? u = -2 : (u = o.lastIndex - d[2].length, p = d[1], o = d[3] === void 0 ? C : d[3] === '"' ? Ce : Ee) : o === Ce || o === Ee ? o = C : o === Ae || o === Se ? o = B : (o = C, a = void 0);
    const m = o === C && s[n + 1].startsWith("/>") ? " " : "";
    i += o === B ? l + nt : u >= 0 ? (r.push(p), l.slice(0, u) + Ie + l.slice(u) + S + m) : l + S + (u === -2 ? n : m);
  }
  return [qe(s, i + (s[t] || "<?>") + (e === 2 ? "</svg>" : e === 3 ? "</math>" : "")), r];
};
class q {
  constructor({ strings: e, _$litType$: t }, r) {
    let a;
    this.parts = [];
    let i = 0, o = 0;
    const n = e.length - 1, l = this.parts, [p, d] = ct(e, t);
    if (this.el = q.createElement(p, r), M.currentNode = this.el.content, t === 2 || t === 3) {
      const u = this.el.content.firstChild;
      u.replaceWith(...u.childNodes);
    }
    for (; (a = M.nextNode()) !== null && l.length < n; ) {
      if (a.nodeType === 1) {
        if (a.hasAttributes()) for (const u of a.getAttributeNames()) if (u.endsWith(Ie)) {
          const h = d[o++], m = a.getAttribute(u).split(S), _ = /([.?@])?(.*)/.exec(h);
          l.push({ type: 1, index: i, name: _[2], strings: m, ctor: _[1] === "." ? pt : _[1] === "?" ? ut : _[1] === "@" ? ht : ee }), a.removeAttribute(u);
        } else u.startsWith(S) && (l.push({ type: 6, index: i }), a.removeAttribute(u));
        if (Fe.test(a.tagName)) {
          const u = a.textContent.split(S), h = u.length - 1;
          if (h > 0) {
            a.textContent = X ? X.emptyScript : "";
            for (let m = 0; m < h; m++) a.append(u[m], F()), M.nextNode(), l.push({ type: 2, index: ++i });
            a.append(u[h], F());
          }
        }
      } else if (a.nodeType === 8) if (a.data === je) l.push({ type: 2, index: i });
      else {
        let u = -1;
        for (; (u = a.data.indexOf(S, u + 1)) !== -1; ) l.push({ type: 7, index: i }), u += S.length - 1;
      }
      i++;
    }
  }
  static createElement(e, t) {
    const r = R.createElement("template");
    return r.innerHTML = e, r;
  }
}
function U(s, e, t = s, r) {
  var o, n;
  if (e === N) return e;
  let a = r !== void 0 ? (o = t._$Co) == null ? void 0 : o[r] : t._$Cl;
  const i = V(e) ? void 0 : e._$litDirective$;
  return (a == null ? void 0 : a.constructor) !== i && ((n = a == null ? void 0 : a._$AO) == null || n.call(a, !1), i === void 0 ? a = void 0 : (a = new i(s), a._$AT(s, t, r)), r !== void 0 ? (t._$Co ?? (t._$Co = []))[r] = a : t._$Cl = a), a !== void 0 && (e = U(s, a._$AS(s, e.values), a, r)), e;
}
class dt {
  constructor(e, t) {
    this._$AV = [], this._$AN = void 0, this._$AD = e, this._$AM = t;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(e) {
    const { el: { content: t }, parts: r } = this._$AD, a = ((e == null ? void 0 : e.creationScope) ?? R).importNode(t, !0);
    M.currentNode = a;
    let i = M.nextNode(), o = 0, n = 0, l = r[0];
    for (; l !== void 0; ) {
      if (o === l.index) {
        let p;
        l.type === 2 ? p = new Z(i, i.nextSibling, this, e) : l.type === 1 ? p = new l.ctor(i, l.name, l.strings, this, e) : l.type === 6 && (p = new mt(i, this, e)), this._$AV.push(p), l = r[++n];
      }
      o !== (l == null ? void 0 : l.index) && (i = M.nextNode(), o++);
    }
    return M.currentNode = R, a;
  }
  p(e) {
    let t = 0;
    for (const r of this._$AV) r !== void 0 && (r.strings !== void 0 ? (r._$AI(e, r, t), t += r.strings.length - 2) : r._$AI(e[t])), t++;
  }
}
class Z {
  get _$AU() {
    var e;
    return ((e = this._$AM) == null ? void 0 : e._$AU) ?? this._$Cv;
  }
  constructor(e, t, r, a) {
    this.type = 2, this._$AH = g, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = r, this.options = a, this._$Cv = (a == null ? void 0 : a.isConnected) ?? !0;
  }
  get parentNode() {
    let e = this._$AA.parentNode;
    const t = this._$AM;
    return t !== void 0 && (e == null ? void 0 : e.nodeType) === 11 && (e = t.parentNode), e;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(e, t = this) {
    e = U(this, e, t), V(e) ? e === g || e == null || e === "" ? (this._$AH !== g && this._$AR(), this._$AH = g) : e !== this._$AH && e !== N && this._(e) : e._$litType$ !== void 0 ? this.$(e) : e.nodeType !== void 0 ? this.T(e) : lt(e) ? this.k(e) : this._(e);
  }
  O(e) {
    return this._$AA.parentNode.insertBefore(e, this._$AB);
  }
  T(e) {
    this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
  }
  _(e) {
    this._$AH !== g && V(this._$AH) ? this._$AA.nextSibling.data = e : this.T(R.createTextNode(e)), this._$AH = e;
  }
  $(e) {
    var i;
    const { values: t, _$litType$: r } = e, a = typeof r == "number" ? this._$AC(e) : (r.el === void 0 && (r.el = q.createElement(qe(r.h, r.h[0]), this.options)), r);
    if (((i = this._$AH) == null ? void 0 : i._$AD) === a) this._$AH.p(t);
    else {
      const o = new dt(a, this), n = o.u(this.options);
      o.p(t), this.T(n), this._$AH = o;
    }
  }
  _$AC(e) {
    let t = Me.get(e.strings);
    return t === void 0 && Me.set(e.strings, t = new q(e)), t;
  }
  k(e) {
    he(this._$AH) || (this._$AH = [], this._$AR());
    const t = this._$AH;
    let r, a = 0;
    for (const i of e) a === t.length ? t.push(r = new Z(this.O(F()), this.O(F()), this, this.options)) : r = t[a], r._$AI(i), a++;
    a < t.length && (this._$AR(r && r._$AB.nextSibling, a), t.length = a);
  }
  _$AR(e = this._$AA.nextSibling, t) {
    var r;
    for ((r = this._$AP) == null ? void 0 : r.call(this, !1, !0, t); e !== this._$AB; ) {
      const a = $e(e).nextSibling;
      $e(e).remove(), e = a;
    }
  }
  setConnected(e) {
    var t;
    this._$AM === void 0 && (this._$Cv = e, (t = this._$AP) == null || t.call(this, e));
  }
}
class ee {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(e, t, r, a, i) {
    this.type = 1, this._$AH = g, this._$AN = void 0, this.element = e, this.name = t, this._$AM = a, this.options = i, r.length > 2 || r[0] !== "" || r[1] !== "" ? (this._$AH = Array(r.length - 1).fill(new String()), this.strings = r) : this._$AH = g;
  }
  _$AI(e, t = this, r, a) {
    const i = this.strings;
    let o = !1;
    if (i === void 0) e = U(this, e, t, 0), o = !V(e) || e !== this._$AH && e !== N, o && (this._$AH = e);
    else {
      const n = e;
      let l, p;
      for (e = i[0], l = 0; l < i.length - 1; l++) p = U(this, n[r + l], t, l), p === N && (p = this._$AH[l]), o || (o = !V(p) || p !== this._$AH[l]), p === g ? e = g : e !== g && (e += (p ?? "") + i[l + 1]), this._$AH[l] = p;
    }
    o && !a && this.j(e);
  }
  j(e) {
    e === g ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
  }
}
class pt extends ee {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(e) {
    this.element[this.name] = e === g ? void 0 : e;
  }
}
class ut extends ee {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(e) {
    this.element.toggleAttribute(this.name, !!e && e !== g);
  }
}
class ht extends ee {
  constructor(e, t, r, a, i) {
    super(e, t, r, a, i), this.type = 5;
  }
  _$AI(e, t = this) {
    if ((e = U(this, e, t, 0) ?? g) === N) return;
    const r = this._$AH, a = e === g && r !== g || e.capture !== r.capture || e.once !== r.once || e.passive !== r.passive, i = e !== g && (r === g || a);
    a && this.element.removeEventListener(this.name, this, r), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
  }
  handleEvent(e) {
    var t;
    typeof this._$AH == "function" ? this._$AH.call(((t = this.options) == null ? void 0 : t.host) ?? this.element, e) : this._$AH.handleEvent(e);
  }
}
class mt {
  constructor(e, t, r) {
    this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = r;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(e) {
    U(this, e);
  }
}
const oe = j.litHtmlPolyfillSupport;
oe == null || oe(q, Z), (j.litHtmlVersions ?? (j.litHtmlVersions = [])).push("3.3.3");
const ft = (s, e, t) => {
  const r = (t == null ? void 0 : t.renderBefore) ?? e;
  let a = r._$litPart$;
  if (a === void 0) {
    const i = (t == null ? void 0 : t.renderBefore) ?? null;
    r._$litPart$ = a = new Z(e.insertBefore(F(), i), i, void 0, t ?? {});
  }
  return a._$AI(s), a;
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const T = globalThis;
class P extends L {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    var t;
    const e = super.createRenderRoot();
    return (t = this.renderOptions).renderBefore ?? (t.renderBefore = e.firstChild), e;
  }
  update(e) {
    const t = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = ft(t, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    var e;
    super.connectedCallback(), (e = this._$Do) == null || e.setConnected(!0);
  }
  disconnectedCallback() {
    var e;
    super.disconnectedCallback(), (e = this._$Do) == null || e.setConnected(!1);
  }
  render() {
    return N;
  }
}
var Ue;
P._$litElement$ = !0, P.finalized = !0, (Ue = T.litElementHydrateSupport) == null || Ue.call(T, { LitElement: P });
const se = T.litElementPolyfillSupport;
se == null || se({ LitElement: P });
(T.litElementVersions ?? (T.litElementVersions = [])).push("4.2.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const gt = { attribute: !0, type: String, converter: K, reflect: !1, hasChanged: ue }, bt = (s = gt, e, t) => {
  const { kind: r, metadata: a } = t;
  let i = globalThis.litPropertyMetadata.get(a);
  if (i === void 0 && globalThis.litPropertyMetadata.set(a, i = /* @__PURE__ */ new Map()), r === "setter" && ((s = Object.create(s)).wrapped = !0), i.set(t.name, s), r === "accessor") {
    const { name: o } = t;
    return { set(n) {
      const l = e.get.call(this);
      e.set.call(this, n), this.requestUpdate(o, l, s, !0, n);
    }, init(n) {
      return n !== void 0 && this.C(o, void 0, s, n), n;
    } };
  }
  if (r === "setter") {
    const { name: o } = t;
    return function(n) {
      const l = this[o];
      e.call(this, n), this.requestUpdate(o, l, s, !0, n);
    };
  }
  throw Error("Unsupported decorator location: " + r);
};
function me(s) {
  return (e, t) => typeof t == "object" ? bt(s, e, t) : ((r, a, i) => {
    const o = a.hasOwnProperty(i);
    return a.constructor.createProperty(i, r), o ? Object.getOwnPropertyDescriptor(a, i) : void 0;
  })(s, e, t);
}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
function O(s) {
  return me({ ...s, state: !0, attribute: !1 });
}
const _t = {
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
}, vt = {
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
}, xt = {
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
}, wt = {
  id: "generic",
  name: "Generic MVHR",
  vendor: "Generic",
  supportedRoles: {}
}, ce = [
  "altair",
  "zehnder-comfoair-q",
  "vent_axia_sentinel_econiq",
  "generic"
], yt = {
  altair: _t,
  "zehnder-comfoair-q": vt,
  vent_axia_sentinel_econiq: xt,
  generic: wt
};
function Ge(s) {
  return yt[s];
}
var $t = Object.defineProperty, Ze = (s, e, t, r) => {
  for (var a = void 0, i = s.length - 1, o; i >= 0; i--)
    (o = s[i]) && (a = o(e, t, a) || a);
  return a && $t(e, t, a), a;
};
const Te = "hiper-mvhr-card-editor", ge = class ge extends P {
  setConfig(e) {
    this._config = { ...e };
  }
  render() {
    const e = this._config ?? {};
    return c`
      <div class="editor">
        ${this._textField("Title", "title", e.title)}
        ${this._textField("Subtitle", "subtitle", e.subtitle)}
        <label>
          <span>Manufacturer</span>
          <select
            .value=${e.manufacturer ?? "generic"}
            @change=${(t) => this._set("manufacturer", t.currentTarget.value)}
          >
            ${ce.map(
      (t) => c`<option .value=${t}>${t}</option>`
    )}
          </select>
        </label>
        <label>
          <span>Display mode</span>
          <select
            .value=${e.display_mode ?? "homeowner"}
            @change=${(t) => this._set("display_mode", t.currentTarget.value)}
          >
            <option value="homeowner">homeowner</option>
            <option value="detailed">detailed</option>
            <option value="system">system</option>
          </select>
        </label>
        <label>
          <span>Heat recovery</span>
          <select
            .value=${e.heat_recovery_method ?? "automatic"}
            @change=${(t) => this._set("heat_recovery_method", t.currentTarget.value)}
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
            .value=${String(e.filter_max_days ?? 365)}
            @change=${(t) => this._set("filter_max_days", Number(t.currentTarget.value))}
          />
        </label>
        <div class="toggles">
          ${this._checkbox("Show controls", "show_controls", e.show_controls !== !1)}
          ${this._checkbox("Show fan speeds", "show_fan_speeds", e.show_fan_speeds !== !1)}
          ${this._checkbox("Show filter", "show_filter", e.show_filter !== !1)}
          ${this._checkbox("Show calibration", "show_calibration", e.show_calibration !== !1)}
          ${this._checkbox(
      "Airflow on all paths",
      "show_airflow_on_all_paths",
      e.show_airflow_on_all_paths === !0
    )}
          ${this._checkbox(
      "Show airflow animation (system mode)",
      "show_airflow_animation",
      e.show_airflow_animation !== !1
    )}
          ${this._checkbox(
      "Show advanced controls (system mode)",
      "show_advanced_controls",
      e.show_advanced_controls !== !1
    )}
        </div>
      </div>
    `;
  }
  _textField(e, t, r) {
    return c`
      <label>
        <span>${e}</span>
        <input
          .value=${r ?? ""}
          @input=${(a) => this._set(t, a.currentTarget.value)}
        />
      </label>
    `;
  }
  _checkbox(e, t, r) {
    return c`
      <label class="check">
        <input
          type="checkbox"
          .checked=${r}
          @change=${(a) => this._set(t, a.currentTarget.checked)}
        />
        <span>${e}</span>
      </label>
    `;
  }
  _set(e, t) {
    const r = { ...this._config ?? {}, [e]: t };
    this._config = r, this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: r },
        bubbles: !0,
        composed: !0
      })
    );
  }
};
ge.styles = Be`
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
let G = ge;
Ze([
  me({ attribute: !1 })
], G.prototype, "hass");
Ze([
  O()
], G.prototype, "_config");
customElements.get(Te) || customElements.define(Te, G);
const fe = [
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
  "maximum_airflow",
  "away_airflow",
  "low_airflow",
  "home_airflow",
  "high_airflow",
  "mapped_level",
  // Added for the system-mode Airflow gauge (fraction-source follow-up): a
  // fallback for `mapped_level` when that role isn't available — same 0-10
  // speed-level concept, just read from a different entity in case a
  // profile/installation doesn't expose `mapped_level` directly. Generic,
  // not Altair-specific — any profile can map it.
  "selected_speed",
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
  // Added in the system-mode visual-polish follow-up (round 2): a second
  // action role, same shape as `filter_reset_control` above — a
  // fire-and-forget "press" to kick off an airflow calibration run. Only
  // `generic` declares it supported by default (opt-in via feature_flags);
  // whether Altair/Zehnder/Aerofresh actually expose a manual calibration
  // trigger (vs. calibration only running automatically/via the
  // manufacturer's own app) is TBD per their docs/manufacturers/*.md — see
  // SPECIFICATION.md §3.
  "calibration_start_control",
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
class y extends Error {
  constructor(e) {
    super(e), this.name = "ConfigValidationError";
  }
}
const kt = "homeowner", Re = ["homeowner", "detailed", "system"], Oe = ["automatic", "supply_temperature", "disabled"];
function ze(s) {
  return fe.includes(s);
}
const At = {
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
function St(s) {
  if (!s || typeof s != "object" || Array.isArray(s))
    throw new y("hiper-mvhr-card: configuration must be an object");
  const e = s;
  if (typeof e.manufacturer != "string" || e.manufacturer.length === 0)
    throw new y('hiper-mvhr-card: "manufacturer" is required');
  if (!ce.includes(e.manufacturer))
    throw new y(
      `hiper-mvhr-card: unknown manufacturer "${e.manufacturer}". Supported: ${ce.join(", ")}`
    );
  const t = e.manufacturer, r = e.display_mode ?? kt;
  if (!Re.includes(r))
    throw new y(
      `hiper-mvhr-card: invalid "display_mode" value "${String(e.display_mode)}". Expected one of: ${Re.join(", ")}`
    );
  if (e.name !== void 0 && typeof e.name != "string")
    throw new y('hiper-mvhr-card: "name" must be a string if provided');
  if (e.title !== void 0 && typeof e.title != "string")
    throw new y('hiper-mvhr-card: "title" must be a string if provided');
  if (e.subtitle !== void 0 && typeof e.subtitle != "string")
    throw new y('hiper-mvhr-card: "subtitle" must be a string if provided');
  const a = e.heat_recovery_method ?? "automatic";
  if (!Oe.includes(a))
    throw new y(
      `hiper-mvhr-card: invalid "heat_recovery_method" value "${String(e.heat_recovery_method)}". Expected one of: ${Oe.join(", ")}`
    );
  const i = e.filter_max_days ?? 365;
  if (typeof i != "number" || !Number.isFinite(i) || i <= 0)
    throw new y('hiper-mvhr-card: "filter_max_days" must be a positive number');
  const o = e.max_airflow;
  if (o !== void 0 && (typeof o != "number" || !Number.isFinite(o) || o <= 0))
    throw new y('hiper-mvhr-card: "max_airflow" must be a positive number');
  const n = e.entities ?? {};
  if (typeof n != "object" || Array.isArray(n) || n === null)
    throw new y(
      'hiper-mvhr-card: "entities" must be a mapping of role to entity id'
    );
  const l = {};
  for (const [u, h] of Object.entries(n)) {
    const m = At[u] ?? u;
    if (!ze(m)) {
      console.warn(`hiper-mvhr-card: ignoring unknown entity role "${u}" in config`);
      continue;
    }
    if (typeof h != "string" || h.length === 0)
      throw new y(
        `hiper-mvhr-card: entity id for role "${u}" must be a non-empty string`
      );
    l[m] = h;
  }
  const p = e.feature_flags ?? {};
  if (typeof p != "object" || Array.isArray(p) || p === null)
    throw new y(
      'hiper-mvhr-card: "feature_flags" must be a mapping of role to boolean'
    );
  const d = {};
  for (const [u, h] of Object.entries(p)) {
    if (!ze(u)) {
      console.warn(`hiper-mvhr-card: ignoring unknown feature flag role "${u}" in config`);
      continue;
    }
    if (typeof h != "boolean")
      throw new y(
        `hiper-mvhr-card: feature flag "${u}" must be true or false, got ${JSON.stringify(h)}`
      );
    d[u] = h;
  }
  return {
    type: "custom:hiper-mvhr-card",
    name: e.name,
    title: e.title,
    subtitle: e.subtitle,
    manufacturer: t,
    display_mode: r,
    entities: l,
    feature_flags: d,
    show_airflow_on_all_paths: e.show_airflow_on_all_paths === !0,
    show_controls: e.show_controls !== !1,
    show_fan_speeds: e.show_fan_speeds !== !1,
    show_filter: e.show_filter !== !1,
    show_calibration: e.show_calibration !== !1,
    filter_max_days: i,
    max_airflow: o,
    heat_recovery_method: a,
    show_airflow_animation: e.show_airflow_animation !== !1,
    show_advanced_controls: e.show_advanced_controls !== !1
  };
}
function Et(s, e) {
  const t = Ge(s);
  if (!e || Object.keys(e).length === 0)
    return t;
  const r = new Set(t.unsupportedRoles ?? []), a = { ...t.supportedRoles };
  for (const i of Object.keys(e))
    r.has(i) || (e[i] ? a[i] = a[i] ?? {} : delete a[i]);
  return { ...t, supportedRoles: a };
}
const Ct = /* @__PURE__ */ new Set(["unavailable", "unknown"]), Mt = /* @__PURE__ */ new Set(["button", "input_button"]);
function Tt(s) {
  const [e] = s.split(".");
  return e ?? "";
}
function Rt(s, e, t) {
  var a;
  const r = {};
  for (const i of fe) {
    if (!e.supportedRoles[i]) {
      r[i] = { status: "unsupported" };
      continue;
    }
    const o = t[i];
    if (!o) {
      r[i] = { status: "not_configured" };
      continue;
    }
    const n = s.states[o];
    if (!n) {
      r[i] = { status: "entity_missing", entityId: o };
      continue;
    }
    const l = n.state === "unknown" && Mt.has(Tt(o));
    if (Ct.has(n.state) && !l) {
      r[i] = { status: "unavailable" };
      continue;
    }
    const p = Number(n.state);
    r[i] = {
      status: "ok",
      value: n.state,
      numericValue: Number.isFinite(p) ? p : void 0,
      unit: typeof ((a = n.attributes) == null ? void 0 : a.unit_of_measurement) == "string" ? n.attributes.unit_of_measurement : void 0,
      attributes: n.attributes ?? {}
    };
  }
  return r;
}
function Ot(s, e, t = {}) {
  const r = new Set(t.ignoreRoles ?? []);
  let a = 0, i = 0, o = 0;
  for (const n of Object.keys(e.supportedRoles)) {
    if (r.has(n))
      continue;
    const l = s[n];
    l && (l.status === "ok" ? a += 1 : l.status === "unavailable" ? i += 1 : l.status === "entity_missing" && (o += 1));
  }
  return o > 0 ? {
    tone: "warning",
    label: o === 1 ? "1 configuration issue" : `${o} configuration issues`
  } : i > 0 ? {
    tone: "muted",
    label: i === 1 ? "1 sensor unavailable" : `${i} sensors unavailable`
  } : a > 0 ? { tone: "success", label: "All sensors reporting" } : { tone: "muted", label: "Not configured" };
}
const zt = 1e4, Ht = "press";
function Lt(s) {
  const [e] = s.split(".");
  return e ?? "";
}
class Pt {
  constructor(e = {}) {
    this._state = { status: "idle" }, this._listeners = /* @__PURE__ */ new Set(), this._timeoutMs = e.timeoutMs ?? zt;
  }
  get state() {
    return this._state;
  }
  /** Subscribes to state changes; returns an unsubscribe function. */
  onChange(e) {
    return this._listeners.add(e), () => {
      this._listeners.delete(e);
    };
  }
  _setState(e) {
    this._state = e;
    for (const t of this._listeners)
      t();
  }
  /**
   * Fires a "press" action for the given entity id. Safe to call even when
   * `hass` or `hass.callService` isn't available (dev preview, tests with a
   * minimal fake hass) — it simply does nothing rather than throwing, per
   * the same "degrade, never fail" principle the rest of the card follows
   * (SPECIFICATION.md §6).
   */
  async dispatchAction(e, t) {
    if (!(e != null && e.callService) || this._state.status === "pending")
      return;
    this._setState({ status: "pending" });
    const r = Lt(t);
    let a;
    const i = new Promise((o) => {
      a = setTimeout(() => o("timeout"), this._timeoutMs);
    });
    try {
      if (await Promise.race([
        e.callService(r, Ht, { entity_id: t }).then(() => "done"),
        i
      ]) === "timeout") {
        this._setState({ status: "error", message: "Timed out waiting for a response." });
        return;
      }
      this._setState({ status: "idle" });
    } catch (o) {
      this._setState({
        status: "error",
        message: o instanceof Error ? o.message : "The action failed."
      });
    } finally {
      clearTimeout(a);
    }
  }
}
const Nt = {
  unsupported: "",
  not_configured: "Not configured",
  // Homeowner-safe generic text — deliberately identical to `unavailable`.
  // A misconfigured entity ID isn't something a homeowner should have to
  // parse; the entity id + a distinct warning only shows in detailed mode,
  // handled separately by the component, not through this generic label.
  entity_missing: "Unavailable",
  unavailable: "Unavailable"
};
function Ut(s) {
  return s.status === "ok" ? s.unit ? `${s.value} ${s.unit}` : s.value : Nt[s.status] ?? "";
}
function Dt(s) {
  return s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
function Bt(s) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s))
    return s;
  const e = new Date(s);
  return Number.isNaN(e.getTime()) ? s : e.toLocaleString(void 0, { dateStyle: "medium", timeStyle: "short" });
}
const It = {
  mode: "mdi:fan",
  outdoor_air_temp: "mdi:thermometer",
  supply_air_temp: "mdi:thermometer",
  extract_air_temp: "mdi:thermometer",
  exhaust_air_temp: "mdi:thermometer",
  supply_airflow: "mdi:weather-windy",
  extract_airflow: "mdi:weather-windy",
  maximum_airflow: "mdi:gauge-full",
  away_airflow: "mdi:home-export-outline",
  low_airflow: "mdi:fan-speed-1",
  home_airflow: "mdi:home",
  high_airflow: "mdi:fan-speed-3",
  bypass_state: "mdi:valve",
  filter_remaining: "mdi:air-filter",
  fault_active: "mdi:alert-circle",
  frost_protection_active: "mdi:snowflake-alert",
  filter_reset_control: "mdi:restart",
  selected_speed: "mdi:tune-variant",
  calibration_start_control: "mdi:progress-wrench",
  shower_detected: "mdi:shower-head",
  shower_trigger_temperature: "mdi:thermometer-water",
  shower_pipe_temperature: "mdi:thermometer-water"
};
function ne(s) {
  return It[s];
}
function jt(s) {
  if (s.method === "disabled")
    return { label: "Disabled", status: "not_applicable" };
  if (s.outdoor === void 0 || s.extract === void 0 || s.supply === void 0)
    return { label: "Unavailable", status: "unavailable" };
  const e = s.extract - s.outdoor;
  if (Math.abs(e) < 1)
    return { label: "Calculating", status: "calculating" };
  if (e <= 0 || s.supply < s.outdoor || s.supply > s.extract + 5)
    return { label: "Not applicable", status: "not_applicable" };
  const t = (s.supply - s.outdoor) / e * 100;
  return !Number.isFinite(t) || t < 0 || t > 130 ? { label: "Not applicable", status: "not_applicable", raw: t } : {
    label: `${Math.round(Math.max(0, Math.min(100, t)))}%`,
    status: "ok",
    raw: t
  };
}
const Y = (s) => s !== void 0 && Number.isFinite(s) && s > 0;
function Ft(s) {
  if (s.current === void 0 || !Number.isFinite(s.current))
    return { fraction: 0, source: "unavailable" };
  const t = [
    ["configured", s.configuredMaximum],
    ["entity", s.entityMaximum],
    ["preset_high", s.presetHigh],
    ["manufacturer", s.manufacturerMaximum]
  ].find(([, a]) => Y(a));
  if (t && Y(t[1]))
    return {
      fraction: Math.max(0, Math.min(1, s.current / t[1])),
      maximum: t[1],
      source: t[0]
    };
  const r = Y(s.mappedLevel) ? s.mappedLevel : s.selectedSpeed;
  return Y(r) ? { fraction: Math.max(0, Math.min(1, r / 10)), source: "mapped_level" } : { fraction: 0, source: "unavailable" };
}
var Vt = Object.defineProperty, z = (s, e, t, r) => {
  for (var a = void 0, i = s.length - 1, o; i >= 0; i--)
    (o = s[i]) && (a = o(e, t, a) || a);
  return a && Vt(e, t, a), a;
};
const J = "hiper-mvhr-card", H = [
  [0, 30, 90, 210],
  [10, 55, 145, 230],
  [16, 165, 205, 235],
  [20, 238, 190, 105],
  [25, 235, 120, 45],
  [35, 205, 45, 45]
], qt = [
  ["outdoor_air_temp", "Outdoor air"],
  ["supply_air_temp", "Supply air"],
  ["extract_air_temp", "Extract air"],
  ["exhaust_air_temp", "Exhaust air"]
], Gt = [
  ["supply_airflow", "Supply airflow"],
  ["extract_airflow", "Extract airflow"]
], He = [
  ["away_airflow", "Away"],
  ["low_airflow", "Low"],
  ["home_airflow", "Home"],
  ["high_airflow", "High"]
], Le = [
  ["supply_fan_speed", "Supply fan"],
  ["extract_fan_speed", "Extract fan"]
], Zt = [
  ["bypass_state", "Summer bypass"],
  ["filter_remaining", "Filter"],
  ["calibration_result", "Calibration"],
  ["fault_active", "Fault"],
  ["frost_protection_active", "Frost protection"]
], Pe = [
  ["filter_reset_control", "Filter reset", "Reset", "Resetting…"],
  ["calibration_start_control", "Run calibration", "Run", "Running…"]
], le = {
  success: "mdi:check-circle",
  warning: "mdi:alert",
  muted: "mdi:information-outline"
}, We = [
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
  "calibration_start_control",
  "filter_reset_control",
  "maximum_airflow",
  "away_airflow",
  "low_airflow",
  "home_airflow",
  "high_airflow",
  "shower_detected",
  "shower_trigger_temperature",
  "shower_pipe_temperature"
], Wt = new Set(We), Ne = 10, Yt = [
  ["supply_air_temp", "Supply air"],
  ["extract_air_temp", "Extract air"],
  ["outdoor_air_temp", "Outdoor air"],
  ["exhaust_air_temp", "Exhaust air"]
], Qt = /* @__PURE__ */ new Set([
  "calibrated",
  "complete",
  "completed",
  "idle",
  "none",
  "unknown"
]), Kt = /* @__PURE__ */ new Set(["on", "true", "problem", "active", "detected"]), be = class be extends P {
  constructor() {
    super(...arguments), this._advancedOpen = !1, this._presetDrafts = /* @__PURE__ */ new Map(), this._presetPending = /* @__PURE__ */ new Set(), this._presetErrors = /* @__PURE__ */ new Map(), this._presetTimers = /* @__PURE__ */ new Map(), this._dispatchers = /* @__PURE__ */ new Map();
  }
  _getDispatcher(e) {
    let t = this._dispatchers.get(e);
    return t || (t = new Pt(), t.onChange(() => this.requestUpdate()), this._dispatchers.set(e, t)), t;
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
  setConfig(e) {
    try {
      this._config = St(e), this._configError = void 0;
    } catch (t) {
      this._config = void 0, this._configError = t instanceof Error ? t.message : String(t);
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
    const e = this._config, t = this.hass, r = e.display_mode === "detailed", a = e.display_mode === "system", i = Et(e.manufacturer, e.feature_flags), o = Ge(e.manufacturer), n = Rt(t, i, e.entities), l = Ot(n, i, {
      ignoreRoles: We
    }), p = r || l.label !== "Not configured", d = n.mode ? this._present(n.mode, r) : null, u = e.title ?? e.name ?? o.name, h = e.subtitle ?? "Heat Recovery Ventilation System", m = l.tone !== "warning" && l.label !== "Not configured", _ = this._heatRecovery(n, e.heat_recovery_method), v = this._modeLabel(
      (d == null ? void 0 : d.text) ?? this._text(n.effective_mode)
    ), f = e.title ?? o.name;
    return c`
      <ha-card class=${a ? "card-system" : ""}>
        ${a ? this._systemHeader(u, h, v, n, e, t) : this._header(u, h, v, l, p)}
        ${a ? this._systemDashboard(
      n,
      e,
      t,
      _,
      v,
      f,
      m,
      o
    ) : r ? this._dashboard(n, e, t, _, v, f, m) : this._legacyContent(n, e, t, r)}
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
  _header(e, t, r, a, i) {
    return c`
      <div class="header mvhr-header">
        <div class="header-row">
          <div class="header-title-group">
            <h2 class="title">${e}</h2>
            <span class="status-dot dot-${a.tone}" aria-hidden="true"></span>
            ${r ? c`<span class="mode-pill">${r}</span>` : ""}
          </div>
          ${i ? c`
                  <div class="availability tone-${a.tone}" role="status">
                    <ha-icon icon=${le[a.tone]} aria-hidden="true"></ha-icon>
                    <span>${a.label}</span>
                  </div>
                ` : ""}
        </div>
        <div class="subheader">${t}</div>
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
  _legacyContent(e, t, r, a) {
    return c`
      <div class="content">
        ${this._metricSection("Temperatures", qt, e, a)}
        ${this._metricSection("Airflow", Gt, e, a)}
        ${this._statusSection("System status", Zt, e, a, t, r)}
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
  _dashboard(e, t, r, a, i, o, n) {
    const l = t.show_controls && this._hasControls(e, t);
    return c`
      <div class="mvhr-dashboard ${l ? "" : "no-controls"}">
        <section class="visual-panel" aria-label="MVHR airflow diagram">
          ${this._heroVisual(e, t, n, o, a)}
        </section>
        ${l ? this._controlsPanel(e, t, r) : ""}
        <section class="metrics-grid" aria-label="MVHR metrics">
          ${this._infoTile("Mode", i || "—", "mdi:fan-auto")}
          ${this._infoTile(
      "Measured airflow",
      this._value(e.airflow, !0) ?? this._value(e.supply_airflow, !0) ?? "—",
      "mdi:weather-windy"
    )}
          ${this._infoTile("Target airflow", this._value(e.target_airflow, !0) ?? "—", "mdi:target")}
          ${this._infoTile("Mapped level", this._value(e.mapped_level, !0) ?? "—", "mdi:tune-variant")}
          ${this._infoTile(
      "Heat recovery",
      a.label,
      "mdi:heat-wave",
      a.status,
      "Apparent temperature recovery"
    )}
          ${t.show_fan_speeds ? this._infoTile("Fan speeds", this._pair(Le, e, !0), "mdi:fan") : ""}
          ${this._infoTile("Humidity", this._value(e.indoor_humidity, !0) ?? "—", "mdi:water-percent")}
          ${t.show_filter ? this._filterTile(e, t) : ""}
        </section>
        ${this._statusStrip(e, t)} ${this._extraControls(e, t, r)}
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
  _statusStrip(e, t) {
    var i;
    const r = this._dashboardStatus(e), a = ((i = e.last_calibration) == null ? void 0 : i.status) === "ok" ? Bt(e.last_calibration.value) : null;
    return c`
      <section class="status-strip tone-${r.tone}" aria-label="MVHR status">
        <span class="status-chip">
          <ha-icon icon=${le[r.tone]} aria-hidden="true"></ha-icon>
          <span>${r.label}</span>
        </span>
        ${t.show_calibration ? c`
                <span>Calibration: ${this._value(e.calibration_result, !0) ?? "—"}</span>
                ${a ? c`<span>Last calibration: ${a}</span>` : ""}
              ` : ""}
      </section>
    `;
  }
  /**
   * Applies the SPECIFICATION.md §6 / display-mode policy to one resolved
   * role: what should actually appear, and how prominent should it look.
   * Returns null when nothing should render for this role at all.
   */
  _present(e, t) {
    return e.status === "unsupported" ? null : e.status === "not_configured" ? t ? { tone: "muted", text: "Not configured" } : null : e.status === "entity_missing" ? t ? { tone: "warning", text: `Entity not found: ${e.entityId}` } : { tone: "muted", text: "Unavailable" } : e.status === "unavailable" ? { tone: "muted", text: "Unavailable" } : { tone: "normal", text: Ut(e) };
  }
  _metricSection(e, t, r, a) {
    const i = t.map(([o, n]) => {
      const l = r[o], p = l ? this._present(l, a) : null;
      return p ? this._metricCell(o, n, p) : null;
    }).filter((o) => o !== null);
    return i.length === 0 ? c`` : c`
      <section class="metric-section" aria-label=${e}>
        <h3>${e}</h3>
        <div class="metric-grid">${i}</div>
      </section>
    `;
  }
  _metricCell(e, t, r) {
    const a = ne(e);
    return c`
      <div class="metric tone-${r.tone}">
        ${a ? c`<ha-icon icon=${a} aria-hidden="true"></ha-icon>` : ""}
        <div class="metric-text">
          <span class="metric-label">${t}</span>
          <span class="metric-value">${r.text}</span>
        </div>
      </div>
    `;
  }
  _statusSection(e, t, r, a, i, o) {
    const n = t.map(([d, u]) => {
      const h = r[d], m = h ? this._present(h, a) : null;
      return m ? this._statusRow(d, u, m) : null;
    }).filter((d) => d !== null), l = Pe.map(
      ([d, u, h, m]) => this._controlRow(
        d,
        u,
        r[d],
        a,
        i,
        o,
        h,
        m
      )
    ).filter((d) => d !== null), p = [...n, ...l];
    return p.length === 0 ? c`` : c`
      <section class="status-section" aria-label=${e}>
        <h3>${e}</h3>
        <div class="status-list">${p}</div>
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
  _extraControls(e, t, r) {
    const a = Pe.filter(([i]) => i !== "calibration_start_control").map(
      ([i, o, n, l]) => this._controlRow(i, o, e[i], !0, t, r, n, l)
    ).filter((i) => i !== null);
    return a.length === 0 ? c`` : c`
      <section class="status-section extra-controls" aria-label="Additional controls">
        <div class="status-list">${a}</div>
      </section>
    `;
  }
  _statusRow(e, t, r) {
    const a = ne(e);
    return c`
      <div class="status-row tone-${r.tone}">
        ${a ? c`<ha-icon icon=${a} aria-hidden="true"></ha-icon>` : ""}
        <span class="status-label">${t}</span>
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
  _controlRow(e, t, r, a, i, o, n, l) {
    if (!r)
      return null;
    if (r.status !== "ok") {
      const m = this._present(r, a);
      return m ? this._statusRow(e, t, m) : null;
    }
    const p = i.entities[e];
    if (!p)
      return null;
    const d = this._getDispatcher(e), u = d.state, h = ne(e);
    return c`
      <div class="status-row">
        ${h ? c`<ha-icon icon=${h} aria-hidden="true"></ha-icon>` : ""}
        <span class="status-label">${t}</span>
        ${u.status === "error" ? c`<span class="status-value tone-warning"
                >Couldn't ${n.toLowerCase()}</span
              >` : ""}
        <button
          type="button"
          class="control-button"
          aria-label=${t}
          ?disabled=${u.status === "pending"}
          @click=${() => d.dispatchAction(o, p)}
        >
          ${u.status === "pending" ? l : n}
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
  _heroVisual(e, t, r, a, i) {
    const o = this._value(e.airflow, !0) ?? this._value(e.supply_airflow, !0), n = t.show_airflow_on_all_paths, l = (p, d, u, h) => {
      const m = n || h ? o : null;
      return c`
        <div class="air-path ${p} ${r ? "active" : ""}">
          <span class="path-label">${d}</span>
          <span class="path-temp">${this._value(e[u], !0) ?? "—"}</span>
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
            ${a}${a.toLowerCase().includes("mvhr") ? "" : c`<br /><span>MVHR</span>`}
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
            <strong class="recovery-value">${i.label}</strong>
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
  _controlsPanel(e, t, r) {
    var m, _, v;
    const a = t.entities.mode, i = t.entities.boost_duration, o = t.entities.override_duration, n = this._modeOptions(e.mode), l = this._selectOptions(e.override_duration), p = (m = this._state(e.mode)) == null ? void 0 : m.toLowerCase(), d = this._state(e.boost_active) === "on", u = ((_ = e.boost_remaining) == null ? void 0 : _.status) === "ok" ? this._value(e.boost_remaining) : null, h = ((v = e.override_remaining) == null ? void 0 : v.status) === "ok" ? this._value(e.override_remaining) : null;
    return c`
      <aside class="controls-panel" aria-label="MVHR controls">
        <div class="panel-heading">Controls</div>

        <div class="control-group">
          <span class="control-group-label">Mode</span>
          <div class="mode-buttons" role="group" aria-label="Operating mode">
            ${n.map((f) => {
      const w = p !== void 0 && f.toLowerCase() === p;
      return c`
                <button
                  type="button"
                  class="chip ${w ? "active" : ""} ${f.toLowerCase() === "off" ? "mode-off" : ""}"
                  ?disabled=${!a || !!this._pendingMode}
                  aria-pressed=${w}
                  aria-label=${`Set mode ${this._modeLabel(f)}`}
                  @click=${() => a && this._setMode(r, a, f)}
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
          ${u ? c`<small>${u} remaining</small>` : ""}
          <label class="field">
            <span>Duration (minutes)</span>
            <input
              type="number"
              min="1"
              step="1"
              .value=${this._state(e.boost_duration) ?? ""}
              ?disabled=${!i}
              aria-label="Boost duration"
              @change=${(f) => {
      const w = Number(f.currentTarget.value);
      i && Number.isFinite(w) && this._call(r, "number", "set_value", {
        entity_id: i,
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
              ?disabled=${d || !t.entities.start_boost}
              @click=${() => this._press(r, t.entities.start_boost)}
            >
              Start Boost
            </button>
            <button
              type="button"
              class="cta ghost"
              aria-label="Cancel Boost"
              ?disabled=${!d || !t.entities.cancel_boost}
              @click=${() => this._press(r, t.entities.cancel_boost)}
            >
              Cancel Boost
            </button>
          </div>
        </div>

        <div class="control-block">
          <div class="control-block-head">
            <span>Override</span>
            <strong
              >${this._value(e.override_duration) ?? "Until next schedule change"}</strong
            >
          </div>
          ${h ? c`<small>${h} remaining</small>` : ""}
          <label class="field">
            <span>Duration</span>
            <select
              ?disabled=${!o}
              aria-label="Override duration"
              @change=${(f) => {
      const w = f.currentTarget.value;
      o && this._call(r, "select", "select_option", {
        entity_id: o,
        option: w
      });
    }}
            >
              ${l.map(
      (f) => c`
                  <option
                    .value=${f}
                    ?selected=${this._state(e.override_duration) === f}
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
            ?disabled=${!t.entities.clear_override}
            @click=${() => this._press(r, t.entities.clear_override)}
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
   * the fuller controls). `Off` is only shown when the real mode select
   * advertises it as a supported option; no separate pretend power action is
   * invented by the card.
   * A separate method from `_header` on purpose — `display_mode: detailed`
   * is not touched by the system-mode build.
   */
  _systemHeader(e, t, r, a, i, o) {
    const n = this._dashboardStatus(a);
    return c`
      <div class="header mvhr-header">
        <div class="header-row">
          <div class="header-title-group">
            <h2 class="title">${e}</h2>
            <span class="status-dot dot-${n.tone}" aria-hidden="true"></span>
            <span class="availability tone-${n.tone}" role="status">
              <ha-icon icon=${le[n.tone]} aria-hidden="true"></ha-icon>
              <span>${n.label}</span>
            </span>
          </div>
          ${this._systemHeaderControls(a, i, o, r)}
        </div>
        <div class="subheader">${t}</div>
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
  _systemHeaderControls(e, t, r, a) {
    var m, _, v;
    const i = t.entities.mode, o = this._modeOptions(e.mode), n = (m = this._state(e.mode)) == null ? void 0 : m.toLowerCase(), l = t.show_controls && !!i && ((_ = e.mode) == null ? void 0 : _.status) === "ok", p = t.show_controls && [e.boost_duration, e.start_boost, e.cancel_boost].some(
      (f) => (f == null ? void 0 : f.status) === "ok"
    ), d = this._state(e.boost_active) === "on", u = d && ((v = e.boost_remaining) == null ? void 0 : v.status) === "ok" ? this._value(e.boost_remaining) : null, h = this._shower(e);
    return !l && !a && !p && !h.render ? c`` : c`
      <div class="system-controls header-controls" role="group" aria-label="MVHR quick controls">
        ${l ? c`
                <label class="header-control">
                  <span class="header-control-label">Operating Mode</span>
                  <select
                    class="mode-select-pill ${n === "off" ? "mode-off" : ""}"
                    aria-label="Operating mode"
                    aria-busy=${!!this._pendingMode}
                    ?disabled=${!!this._pendingMode}
                    @change=${(f) => {
      const w = f.currentTarget.value;
      i && this._setMode(r, i, w);
    }}
                  >
                    ${o.map(
      (f) => c`
                        <option
                          .value=${f}
                          ?selected=${n !== void 0 && f.toLowerCase() === n}
                        >
                          ${this._modeLabel(f)}
                        </option>
                      `
    )}
                  </select>
                  ${this._modeError ? c`<small class="control-error" role="alert">${this._modeError}</small>` : ""}
                </label>
              ` : a ? c`<span class="mode-pill">${a}</span>` : ""}
        ${p ? c`
                <div class="header-control">
                  <span class="header-control-label">Boost</span>
                  <button
                    type="button"
                    class="boost-pill-button ${d ? "is-active" : ""}"
                    aria-label=${d ? "Cancel Boost" : "Start Boost"}
                    ?disabled=${d ? !t.entities.cancel_boost : !t.entities.start_boost}
                    @click=${() => d ? this._press(r, t.entities.cancel_boost) : this._press(r, t.entities.start_boost)}
                  >
                    <ha-icon icon="mdi:rocket-launch" aria-hidden="true"></ha-icon>
                    ${d ? "Active" : "Ready"}
                    ${u ? c`<small>${u} left</small>` : ""}
                  </button>
                </div>
              ` : ""}
        ${h.render ? this._systemShowerPill(h) : ""}
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
  _systemDashboard(e, t, r, a, i, o, n, l) {
    const p = this._number(e.airflow) ?? this._number(e.supply_airflow), d = t.show_airflow_animation && n && (p ?? 0) > 0, u = this._shower(e), h = this._state(e.boost_active) === "on";
    return c`
      <div class="mvhr-system">
        ${u.active ? this._systemShowerBanner(u) : ""}
        <section class="system-main">
          <section
            class="visual-panel system-visual-panel system-overview"
            aria-label="System overview"
          >
            <div class="panel-heading-row">
              <h3>System Overview</h3>
            </div>
            ${this._systemHeroVisual(e, t, d, o, a, h)}
          </section>
        </section>

        <section class="system-lower-grid" aria-label="MVHR details">
          ${this._systemAirflowCard(e, t, l)}
          ${this._systemTemperaturesCard(e, a)}
          ${this._systemStatusCard(e, t)}
        </section>

        ${t.show_advanced_controls ? this._systemAdvancedToggle() : ""}
        ${t.show_advanced_controls ? this._advancedDrawer(e, t, r) : ""}
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
  _shower(e) {
    var l, p;
    const t = e.shower_detected, r = !!t && (t == null ? void 0 : t.status) !== "unsupported" && (t == null ? void 0 : t.status) !== "not_configured", a = (t == null ? void 0 : t.status) === "ok" && t.value.toLowerCase() === "on", i = e.shower_trigger_temperature, o = this._number(i), n = o === void 0 ? null : `${(o - Ne).toFixed(1)}${(i == null ? void 0 : i.status) === "ok" && i.unit ? ` ${i.unit}` : ""}`;
    return {
      render: r,
      active: a,
      boostActive: this._state(e.boost_active) === "on",
      // Each fact is shown only when its own entity is genuinely 'ok' — an
      // unavailable/missing sensor omits its row entirely rather than
      // showing a hollow "Pipe temperature: Unavailable" line, per the
      // redesign's "never a fake reading" rule.
      pipeTemperature: ((l = e.shower_pipe_temperature) == null ? void 0 : l.status) === "ok" ? this._value(e.shower_pipe_temperature, !0) : null,
      triggerTemperature: (i == null ? void 0 : i.status) === "ok" ? this._value(i, !0) : null,
      rearmTemperature: a ? n : null,
      // Gated on boost actually being on, not just the sensor having a
      // value — otherwise an idle "0 min"/"0" reading renders as if a
      // countdown were running (visual-polish follow-up, round 2).
      boostRemaining: this._state(e.boost_active) === "on" && ((p = e.boost_remaining) == null ? void 0 : p.status) === "ok" ? this._value(e.boost_remaining) : null
    };
  }
  /**
   * The compact, always-on shower status indicator, next to the boost pill
   * in the header — "float it as a small status card in the header"
   * (visual-polish follow-up, round 2). Rendered whenever shower detection
   * is configured at all; a quiet muted pill reading "No shower detected"
   * when idle, so the main content area never has to spend space on an
   * inactive card (the previous round's `.shower-inactive` card was exactly
   * the "creates a lot of empty whitespace" complaint). The full illustrated
   * detail only appears in `_systemShowerBanner`, and only while active.
   */
  _systemShowerPill(e) {
    return c`
      <div class="header-control">
        <span class="header-control-label">Shower</span>
        <span class="shower-pill ${e.active ? "is-active" : ""}" role="status">
          <ha-icon icon="mdi:shower-head" aria-hidden="true"></ha-icon>
          ${e.active ? "Detected" : "No shower detected"}
        </span>
      </div>
    `;
  }
  /**
   * The full illustrated "Shower detected" banner — pipe/trigger/re-arm
   * temperatures, boost status — only rendered while a shower is actually
   * active (`_shower` gates this; see `_systemShowerPill` for the idle
   * state). Moved to a full-width banner directly above System Overview
   * (visual-polish follow-up, round 2) rather than a side column, so
   * Overview can always use the full card width — "let it dominate the
   * page" — while the shower detail still sits immediately next to it, not
   * off in a separate part of the layout. Config's `show_airflow_animation`
   * doesn't gate this panel's own droplet animation — it's a separate,
   * lightweight CSS effect — but `prefers-reduced-motion` always does (see
   * the reduced-motion media query in `static styles`).
   */
  _systemShowerBanner(e) {
    return c`
      <section class="shower-panel shower-active" aria-label="Shower detection" role="status">
        <div class="shower-banner-head">
          <div class="shower-illustration" aria-hidden="true">${this._showerIllustration()}</div>
          <div class="shower-banner-titles">
            <h3 class="shower-heading">Shower Detection</h3>
            <strong class="shower-title">Shower detected</strong>
            <span class="shower-subtitle"
              >${e.boostActive ? "Boost active" : "Boost not active"}</span
            >
          </div>
        </div>
        <dl class="shower-facts">
          ${e.pipeTemperature ? c`
                  <div class="shower-fact">
                    <dt>Pipe temperature</dt>
                    <dd>${e.pipeTemperature}</dd>
                  </div>
                ` : ""}
          ${e.triggerTemperature ? c`
                  <div class="shower-fact">
                    <dt>Trigger temperature</dt>
                    <dd>${e.triggerTemperature}</dd>
                  </div>
                ` : ""}
          ${e.rearmTemperature ? c`
                  <div class="shower-fact">
                    <dt>Re-arm at</dt>
                    <dd>
                      ${e.rearmTemperature}<small
                        >(${Ne}°C below trigger)</small
                      >
                    </dd>
                  </div>
                ` : ""}
          ${e.boostRemaining ? c`
                  <div class="shower-fact">
                    <dt>Boost remaining</dt>
                    <dd>${e.boostRemaining}</dd>
                  </div>
                ` : ""}
        </dl>
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
   *
   * The gauge's arc fill is the configured *operating level*, not "current
   * airflow ÷ target airflow" — target airflow is just a separate detail
   * row here, never the gauge's maximum. `mapped_level` is the preferred
   * source (Altair's 0-10 speed scale, read as 0-100%); `selected_speed`
   * (same 0-10 concept, a different entity) is the fallback when
   * `mapped_level` isn't available. The large central number stays the
   * actual measured airflow in m³/h regardless of which of those two the
   * arc is reading — two different facts sharing one gauge, not one
   * derived from the other.
   */
  _systemAirflowCard(e, t, r) {
    const a = e.airflow ?? e.supply_airflow, i = (a == null ? void 0 : a.status) === "ok" ? a : void 0, o = i ? i.value : null, n = (i == null ? void 0 : i.unit) ?? null, l = this._number(e.airflow) ?? this._number(e.supply_airflow), p = Ft({
      current: l,
      configuredMaximum: t.max_airflow,
      entityMaximum: this._number(e.maximum_airflow),
      presetHigh: this._number(e.high_airflow),
      manufacturerMaximum: r.defaultMaxAirflow,
      mappedLevel: this._number(e.mapped_level),
      selectedSpeed: this._number(e.selected_speed)
    }), d = l !== void 0 && p.maximum !== void 0 ? `${l} of ${p.maximum} ${n ?? "m³/h"}` : null, u = l !== void 0 && this._prevAirflowNumber !== void 0 && l > this._prevAirflowNumber;
    this._prevAirflowNumber = l ?? this._prevAirflowNumber;
    const h = [];
    return t.show_fan_speeds && e.supply_fan_speed && e.extract_fan_speed && h.push(this._diagnosticRow("mdi:fan", "Fan speed", this._pair(Le, e, !0))), e.mapped_level && h.push(
      this._diagnosticRow(
        "mdi:tune-variant",
        "Current profile",
        this._value(e.mapped_level, !0)
      )
    ), e.target_airflow && h.push(
      this._diagnosticRow(
        "mdi:target",
        "Target airflow",
        this._value(e.target_airflow, !0)
      )
    ), c`
      <section
        class="lower-card airflow-card ${u ? "airflow-brighten" : ""}"
        aria-label="Airflow"
      >
        <h3>Airflow</h3>
        <div class="airflow-card-body">
          ${a ? this._airflowGauge(
      p.fraction,
      o,
      n,
      d
    ) : ""}
          <div class="airflow-card-rows">${h}</div>
        </div>
      </section>
    `;
  }
  /**
   * A semicircular gauge built from a single SVG stroked arc — no charting
   * library. `fraction` (0-1, already clamped by the caller) controls how
   * much of the arc is filled; the big central number/unit are the actual
   * formatted role value split apart (or "—"/nothing), never a synthesized
   * figure. Stacked on separate lines — "enlarge the value slightly...
   * instead of everything on one line" (visual-polish follow-up, round 2).
   */
  _airflowGauge(e, t, r, a = null) {
    const o = Math.PI * 40, n = o * (1 - e), l = t ? `Current airflow ${t}${r ? ` ${r}` : ""}` : "Current airflow unavailable";
    return c`
      <div class="gauge" role="img" aria-label=${l}>
        <svg viewBox="0 0 100 56" class="gauge-svg">
          <path d="M10 50 A40 40 0 0 1 90 50" class="gauge-track" />
          <path
            d="M10 50 A40 40 0 0 1 90 50"
            class="gauge-fill"
            style=${`stroke-dasharray:${o};stroke-dashoffset:${n}`}
          />
        </svg>
        <div class="gauge-value">
          <strong>${t ?? "—"}</strong>
          ${r ? c`<b class="gauge-unit">${r}</b>` : ""}
          <span>Current Airflow</span>
          ${a ? c`<small class="gauge-scale">${a}</small>` : ""}
        </div>
      </div>
    `;
  }
  /**
   * Lower-panel "Temperatures" card: the same four temperature roles the
   * hero visual shows, in a clean aligned list (icons + values, per the
   * brief), plus the heat-recovery percentage.
   */
  _systemTemperaturesCard(e, t) {
    const r = Yt.map(([a, i]) => {
      const o = e[a];
      return o ? this._diagnosticRow("mdi:thermometer", i, this._value(o, !0)) : null;
    }).filter((a) => a !== null);
    return c`
      <section class="lower-card temperatures-card" aria-label="Temperatures">
        <h3>Temperatures</h3>
        <div class="status-list">
          ${r} ${this._diagnosticRow("mdi:heat-wave", "Heat recovery", t.label)}
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
  _systemStatusCard(e, t) {
    var u, h;
    const r = this._dashboardStatus(e), a = this._state(e.boost_active) === "on", i = [
      e.boost_active,
      e.boost_duration,
      e.start_boost
    ].some((m) => (m == null ? void 0 : m.status) === "ok"), o = ((u = e.override_duration) == null ? void 0 : u.status) === "ok" ? this._modeLabel(e.override_duration.value) : null, n = a && ((h = e.boost_remaining) == null ? void 0 : h.status) === "ok" ? this._value(e.boost_remaining) : null, l = this._number(e.filter_remaining), p = l === void 0 ? "muted" : l / t.filter_max_days <= 0.15 ? "warning" : "success", d = [];
    return i && d.push(
      this._statusBadge(
        a ? "Boost Active" : "Boost Ready",
        a ? "success" : "muted"
      )
    ), o && d.push(this._statusBadge(`Override: ${o}`, "muted")), t.show_filter && e.filter_remaining && d.push(
      this._statusBadge(`Filter ${this._value(e.filter_remaining, !0)}`, p)
    ), d.push(this._statusBadge(r.label, r.tone)), c`
      <section class="lower-card system-status-card" aria-label="System status">
        <h3>System Status</h3>
        ${// "Make the boost remaining time more prominent" — a big countdown
    // callout above the badge row, rather than one more small row
    // buried among everything else, and only when there's an active
    // boost with a real remaining-time reading to show.
    n ? c`
                <div class="boost-remaining-highlight" role="status">
                  <ha-icon icon="mdi:timer-sand" aria-hidden="true"></ha-icon>
                  <div>
                    <strong>${n}</strong>
                    <span>Boost remaining</span>
                  </div>
                </div>
              ` : ""}
        <div class="status-badge-row">${d}</div>
      </section>
    `;
  }
  /**
   * A small coloured-dot status badge ("🟢 Boost Active", "🟡 Filter 12
   * days") in place of a label/value row — visual-polish follow-up. The dot
   * is decorative (`aria-hidden`) reinforcement only; the tone is never the
   * sole indicator since the text itself always states the state in words
   * (e.g. "Boost Active", not just a coloured dot).
   */
  _statusBadge(e, t) {
    return c`
      <span class="status-badge tone-${t}">
        <span class="status-badge-dot" aria-hidden="true"></span>
        ${e}
      </span>
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
  _advancedDrawer(e, t, r) {
    var u;
    if (!this._advancedOpen)
      return c``;
    const a = t.entities.override_duration, i = this._selectOptions(e.override_duration), o = ((u = e.override_remaining) == null ? void 0 : u.status) === "ok" ? this._value(e.override_remaining) : null, n = [e.override_duration, e.clear_override].some(
      (h) => (h == null ? void 0 : h.status) === "ok"
    ), l = t.entities.boost_duration, p = this._state(e.boost_active) === "on", d = [
      e.boost_duration,
      e.start_boost,
      e.cancel_boost
    ].some((h) => (h == null ? void 0 : h.status) === "ok");
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
                      .value=${this._state(e.boost_duration) ?? ""}
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
                      ?disabled=${p || !t.entities.start_boost}
                      @click=${() => this._press(r, t.entities.start_boost)}
                    >
                      Start Boost
                    </button>
                    <button
                      type="button"
                      class="cta ghost"
                      aria-label="Cancel Boost"
                      ?disabled=${!p || !t.entities.cancel_boost}
                      @click=${() => this._press(r, t.entities.cancel_boost)}
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
                      >${this._value(e.override_duration) ?? "Until next schedule change"}</strong
                    >
                  </div>
                  ${o ? c`<small>${o} remaining</small>` : ""}
                  <label class="field">
                    <span>Duration</span>
                    <select
                      ?disabled=${!a}
                      aria-label="Override duration"
                      @change=${(h) => {
      const m = h.currentTarget.value;
      a && this._call(r, "select", "select_option", {
        entity_id: a,
        option: m
      });
    }}
                    >
                      ${i.map(
      (h) => c`
                          <option
                            .value=${h}
                            ?selected=${this._state(e.override_duration) === h}
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
                    ?disabled=${!t.entities.clear_override}
                    @click=${() => this._press(r, t.entities.clear_override)}
                  >
                    Clear override
                  </button>
                </div>
              ` : ""}
        ${this._presetAirflowControls(e, t, r)}
        ${this._calibrationControl(e, t, r)}
        ${this._advancedCompactStats(e, t)}
        ${// Summer bypass is not part of the primary hero visual, lower
    // cards, or compact header controls in system mode for any
    // manufacturer (deliberately bypass-free, generically — not an
    // Altair-specific carve-out). It only ever appears here, and
    // only when the active profile actually declares it supported
    // (Zehnder/Aerofresh) — Altair's profile marks it unsupported, so
    // `_value` returns null and this omits the row entirely, exactly
    // like every other unsupported role (SPECIFICATION.md §6), with
    // no manufacturer conditional written here to make that happen.
    e.bypass_state && e.bypass_state.status !== "unsupported" ? c`
                <div class="status-list">
                  ${this._diagnosticRow(
      "mdi:valve",
      "Summer bypass",
      this._value(e.bypass_state, !0)
    )}
                </div>
              ` : ""}
        ${this._extraControls(e, t, r)}
      </section>
    `;
  }
  _presetAirflowControls(e, t, r) {
    const a = He.filter(([o]) => !!t.entities[o]);
    if (a.length === 0)
      return c``;
    const i = this._presetValidation(e, a.map(([o]) => o));
    return c`
      <section class="preset-controls" aria-label="Airflow presets">
        <div class="control-block-head"><span>Airflow presets</span></div>
        <div class="preset-grid">
          ${a.map(([o, n]) => {
      const l = e[o], p = t.entities[o], d = this._attributeNumber(l, "min"), u = this._attributeNumber(l, "max"), h = this._attributeNumber(l, "step") ?? 1, m = this._presetDrafts.get(o) ?? this._number(l), _ = (l == null ? void 0 : l.status) !== "ok" || !p || this._presetPending.has(o);
      return c`
              <label class="preset-field">
                <span>${n}</span>
                <span class="preset-input-wrap">
                  <input
                    type="number"
                    .value=${m === void 0 ? "" : String(m)}
                    min=${d ?? g}
                    max=${u ?? g}
                    step=${h}
                    ?disabled=${_}
                    aria-label=${`${n} airflow`}
                    aria-busy=${this._presetPending.has(o)}
                    @input=${(v) => {
        const f = Number(v.currentTarget.value);
        Number.isFinite(f) && (this._presetDrafts.set(o, f), this.requestUpdate());
      }}
                    @change=${(v) => {
        const f = Number(v.currentTarget.value);
        p && Number.isFinite(f) && this._schedulePresetUpdate(o, p, f, l, e, r);
      }}
                  />
                  <small>${(l == null ? void 0 : l.status) === "ok" ? l.unit ?? "m³/h" : "Unavailable"}</small>
                </span>
                ${this._presetErrors.has(o) ? c`<small class="control-error" role="alert"
                        >${this._presetErrors.get(o)}</small
                      >` : ""}
              </label>
            `;
    })}
        </div>
        ${i ? c`<p class="preset-validation" role="alert">${i}</p>` : ""}
      </section>
    `;
  }
  _attributeNumber(e, t) {
    if ((e == null ? void 0 : e.status) !== "ok")
      return;
    const r = e.attributes[t], a = typeof r == "number" ? r : Number(r);
    return Number.isFinite(a) ? a : void 0;
  }
  _presetValidation(e, t) {
    const r = t.map((a) => this._presetDrafts.get(a) ?? this._number(e[a])).filter((a) => a !== void 0);
    for (let a = 1; a < r.length; a += 1)
      if (r[a] < r[a - 1])
        return "Preset airflow must follow Away ≤ Low ≤ Home ≤ High.";
    return null;
  }
  _schedulePresetUpdate(e, t, r, a, i, o) {
    this._presetDrafts.set(e, r), this._presetErrors.delete(e);
    const n = this._presetRangeValidation(r, a);
    if (n) {
      this._presetErrors.set(e, n), this.requestUpdate();
      return;
    }
    if (this._presetValidation(i, He.map(([p]) => p))) {
      this.requestUpdate();
      return;
    }
    const l = this._presetTimers.get(e);
    l && clearTimeout(l), this._presetTimers.set(
      e,
      setTimeout(() => {
        this._presetTimers.delete(e), this._presetPending.add(e), this.requestUpdate(), this._call(o, "number", "set_value", { entity_id: t, value: r }).catch(() => this._presetErrors.set(e, "Couldn't save preset")).finally(() => {
          this._presetPending.delete(e), this.requestUpdate();
        });
      }, 300)
    ), this.requestUpdate();
  }
  _presetRangeValidation(e, t) {
    const r = this._attributeNumber(t, "min"), a = this._attributeNumber(t, "max"), i = this._attributeNumber(t, "step");
    if (r !== void 0 && e < r)
      return `Must be at least ${r}.`;
    if (a !== void 0 && e > a)
      return `Must be no more than ${a}.`;
    if (i !== void 0 && i > 0) {
      const n = (e - (r ?? 0)) / i;
      if (Math.abs(n - Math.round(n)) > 1e-6)
        return `Must use ${i} increments.`;
    }
    return null;
  }
  _calibrationControl(e, t, r) {
    const a = "calibration_start_control", i = e[a], o = t.entities[a];
    if (!i || i.status === "unsupported" || i.status === "not_configured")
      return c``;
    const n = this._getDispatcher(a), l = n.state.status === "pending", p = i.status !== "ok" || !o, d = n.state.status === "error" ? n.state.message : null;
    return c`
      <section class="calibration-control" aria-label="Calibration">
        <div>
          <strong>Calibration</strong>
          <small>The unit may change fan speeds during calibration.</small>
        </div>
        <button
          type="button"
          class="cta calibration-button"
          ?disabled=${p || l}
          aria-busy=${l}
          @click=${async () => {
      var h;
      !((h = globalThis.confirm) != null && h.call(
        globalThis,
        `Start airflow calibration?
The unit may change fan speeds during calibration.`
      )) || !o || (this._calibrationFeedback = void 0, await n.dispatchAction(r, o), this._calibrationFeedback = n.state.status === "idle" ? "Calibration started" : void 0);
    }}
        >
          ${l ? "Starting…" : "Calibrate airflow"}
        </button>
        ${p ? c`<small class="control-error">Calibration unavailable</small>` : d ? c`<small class="control-error" role="alert">${d}</small>` : this._calibrationFeedback ? c`<small class="control-success" role="status"
                    >${this._calibrationFeedback}</small
                  >` : ""}
      </section>
    `;
  }
  /**
   * Calibration status/progress and individual fan RPM, as a small grid of
   * compact label/value tiles rather than a full-width row each — "I don't
   * think these need an entire row... could all fit inside a small
   * expandable card" (visual-polish follow-up). Still just as gated on
   * `show_calibration`/`show_fan_speeds` and role availability as before;
   * only the presentation changed.
   */
  _advancedCompactStats(e, t) {
    const r = [];
    return t.show_calibration && (r.push(this._compactStat("Calibration", this._value(e.calibration_status, !0))), r.push(this._compactStat("Progress", this._value(e.calibration_progress, !0)))), t.show_fan_speeds && (r.push(this._compactStat("Supply fan", this._value(e.supply_fan_speed, !0))), r.push(this._compactStat("Extract fan", this._value(e.extract_fan_speed, !0)))), r.length === 0 ? c`` : c`<div class="compact-stats-card">${r}</div>`;
  }
  _compactStat(e, t) {
    return c`
      <div class="compact-stat">
        <span>${e}</span>
        <strong>${t ?? "—"}</strong>
      </div>
    `;
  }
  _diagnosticRow(e, t, r) {
    return c`
      <div class="status-row">
        <ha-icon icon=${e} aria-hidden="true"></ha-icon>
        <span class="status-label">${t}</span>
        <span class="status-value">${r ?? "—"}</span>
      </div>
    `;
  }
  /**
   * System mode's equipment cutaway. Outdoor intake/exhaust occupy the left
   * side and indoor extract/supply the right. The static cabinet, chamber,
   * filters, blower housings, exchanger cassette and collars provide the
   * appliance structure; temperature gradients, particles and impellers are
   * reactive overlays. The two physical streams remain separate throughout.
   */
  _systemHeroVisual(e, t, r, a, i, o) {
    const n = this._value(e.airflow, !0) ?? this._value(e.supply_airflow, !0), l = t.show_airflow_on_all_paths, p = {
      extract: this._number(e.extract_air_temp) ?? null,
      exhaust: this._number(e.exhaust_air_temp) ?? null,
      outdoor: this._number(e.outdoor_air_temp) ?? null,
      supply: this._number(e.supply_air_temp) ?? null
    }, d = {
      extract: this._temperatureColour(p.extract),
      exhaust: this._temperatureColour(p.exhaust),
      outdoor: this._temperatureColour(p.outdoor),
      supply: this._temperatureColour(p.supply)
    }, u = p.extract !== null && p.exhaust !== null ? this._temperatureColour((p.extract + p.exhaust) / 2) : this._temperatureColour(null), h = p.outdoor !== null && p.supply !== null ? this._temperatureColour((p.outdoor + p.supply) / 2) : this._temperatureColour(null), m = this._number(e.filter_remaining) !== void 0, _ = this._number(e.supply_fan_speed) !== void 0, v = this._number(e.extract_fan_speed) !== void 0, f = i.status === "ok" && this._prevRecoveryLabel !== void 0 && this._prevRecoveryLabel !== i.label;
    this._prevRecoveryLabel = i.status === "ok" ? i.label : this._prevRecoveryLabel;
    const w = (b, x, k, D, W, te, Ye) => {
      const _e = l || D ? n : null, re = this._number(e[k]) ?? null, Qe = this._temperatureColour(re), Ke = this._temperatureColour(re, 0.13);
      return c`
        <div
          class="air-path ${b}"
          data-side=${b === "extract" || b === "supply" ? "indoor" : "outdoor"}
          data-flow=${b === "extract" || b === "outdoor" ? "inward" : "outward"}
          data-temperature=${re ?? "unavailable"}
          style=${`--stream-color:${Qe};--stream-soft:${Ke}`}
        >
          <span class="path-label">
            <ha-icon icon=${W} aria-hidden="true"></ha-icon>
            ${x}
            <ha-icon class="path-arrow" icon=${te} aria-label=${Ye}></ha-icon>
          </span>
          <span class="path-temp">${this._value(e[k], !0) ?? "—"}</span>
          ${_e ? c`<span class="path-airflow"
                  ><ha-icon icon="mdi:weather-windy" aria-hidden="true"></ha-icon>${_e}</span
                >` : ""}
        </div>
      `;
    };
    return c`
      <div class="visual-wrap system-visual-wrap">
        ${w(
      "outdoor",
      "Outdoor air",
      "outdoor_air_temp",
      !1,
      "mdi:tree",
      "mdi:arrow-bottom-right-thin",
      "Drawn from outdoors"
    )}
        ${w(
      "extract",
      "Extract air",
      "extract_air_temp",
      !0,
      "mdi:home",
      "mdi:arrow-bottom-left-thin",
      "Drawn from the home"
    )}
        <div class="unit-stage">
          ${i.status === "ok" ? c`
                  <div
                    class="recovery-badge-plate ${f ? "recovery-pulse" : ""}"
                    title="Apparent temperature recovery"
                    role="img"
                    aria-label=${`Heat recovery ${i.label}`}
                  >
                    <strong>${i.label}</strong>
                    <span>Heat Recovery</span>
                  </div>
                  <span class="recovery-connector" aria-hidden="true"></span>
                ` : ""}
          <div
            class="unit ${r ? "active" : ""} ${r && o ? "boost-active" : ""}"
            aria-label="Heat recovery unit"
          >
          <div class="brand">
            ${a}${a.toLowerCase().includes("mvhr") ? "" : c`<br /><span>MVHR</span>`}
          </div>
          <svg
            class="airflow-schematic"
            viewBox="0 0 700 360"
            role="img"
            aria-label="Cutaway MVHR unit with two separate air streams crossing through a plate heat exchanger"
            style=${`--air-extract:${d.extract};--air-exhaust:${d.exhaust};--air-outdoor:${d.outdoor};--air-supply:${d.supply}`}
          >
            <defs>
              <clipPath id="system-exchanger-clip">
                <path d="M350 62 L470 180 L350 298 L230 180 Z"></path>
              </clipPath>
              <linearGradient id="cabinet-edge" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" class="metal-light"></stop>
                <stop offset="0.42" class="metal-mid"></stop>
                <stop offset="1" class="metal-dark"></stop>
              </linearGradient>
              <linearGradient id="inner-chamber" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" class="chamber-top"></stop>
                <stop offset="1" class="chamber-bottom"></stop>
              </linearGradient>
              <linearGradient id="collar-metal" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" class="metal-dark"></stop>
                <stop offset="0.3" class="metal-light"></stop>
                <stop offset="0.72" class="metal-mid"></stop>
                <stop offset="1" class="metal-dark"></stop>
              </linearGradient>
              <linearGradient id="blower-metal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" class="blower-light"></stop>
                <stop offset="1" class="blower-dark"></stop>
              </linearGradient>
              <linearGradient id="exchanger-frame" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" class="metal-light"></stop>
                <stop offset="0.5" class="metal-dark"></stop>
                <stop offset="1" class="metal-mid"></stop>
              </linearGradient>
              <filter id="equipment-shadow" x="-20%" y="-30%" width="140%" height="170%">
                <feDropShadow dx="0" dy="8" stdDeviation="8" flood-opacity="0.28"></feDropShadow>
              </filter>
              <filter id="component-shadow" x="-25%" y="-25%" width="150%" height="160%">
                <feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity="0.4"></feDropShadow>
              </filter>
              <linearGradient
                id="extract-gradient"
                gradientUnits="userSpaceOnUse"
                x1="700"
                y1="82"
                x2="433"
                y2="154"
              >
                <stop offset="0" stop-color=${d.extract}></stop>
                <stop offset="1" stop-color=${u}></stop>
              </linearGradient>
              <linearGradient
                id="exhaust-gradient"
                gradientUnits="userSpaceOnUse"
                x1="267"
                y1="206"
                x2="0"
                y2="278"
              >
                <stop offset="0" stop-color=${u}></stop>
                <stop offset="1" stop-color=${d.exhaust}></stop>
              </linearGradient>
              <linearGradient
                id="outdoor-gradient"
                gradientUnits="userSpaceOnUse"
                x1="0"
                y1="82"
                x2="267"
                y2="154"
              >
                <stop offset="0" stop-color=${d.outdoor}></stop>
                <stop offset="1" stop-color=${h}></stop>
              </linearGradient>
              <linearGradient
                id="supply-gradient"
                gradientUnits="userSpaceOnUse"
                x1="433"
                y1="206"
                x2="700"
                y2="278"
              >
                <stop offset="0" stop-color=${h}></stop>
                <stop offset="1" stop-color=${d.supply}></stop>
              </linearGradient>
              <linearGradient
                id="warm-exchanger-gradient"
                gradientUnits="userSpaceOnUse"
                x1="430"
                y1="135"
                x2="270"
                y2="225"
              >
                <stop offset="0" stop-color=${d.extract}></stop>
                <stop offset="1" stop-color=${d.exhaust}></stop>
              </linearGradient>
              <linearGradient
                id="cool-exchanger-gradient"
                gradientUnits="userSpaceOnUse"
                x1="270"
                y1="135"
                x2="430"
                y2="225"
              >
                <stop offset="0" stop-color=${d.outdoor}></stop>
                <stop offset="1" stop-color=${d.supply}></stop>
              </linearGradient>
            </defs>
            <g class="cabinet" filter="url(#equipment-shadow)" aria-hidden="true">
              <rect class="cabinet-outer" x="14" y="16" width="672" height="328" rx="18"></rect>
              <rect class="cutaway-shell" x="27" y="29" width="646" height="302" rx="11"></rect>
              <rect class="cabinet-seam" x="36" y="38" width="628" height="284" rx="7"></rect>
              <path class="cabinet-lip" d="M37 45 H663 M37 315 H663"></path>
            </g>
            <g class="cutaway-compartments" aria-hidden="true">
              <path d="M186 42 V318"></path>
              <path d="M514 42 V318"></path>
              <path d="M39 180 H661"></path>
              <path class="support-rail" d="M205 52 V307 M495 52 V307"></path>
            </g>
            <g class="mounting-brackets" aria-hidden="true">
              <path d="M208 83 h28 v9 h-18 v27 h-10 Z"></path>
              <path d="M492 83 h-28 v9 h18 v27 h10 Z"></path>
              <path d="M208 277 h28 v-9 h-18 v-27 h-10 Z"></path>
              <path d="M492 277 h-28 v-9 h18 v-27 h10 Z"></path>
              <rect x="114" y="305" width="72" height="9" rx="3"></rect>
              <rect x="514" y="305" width="72" height="9" rx="3"></rect>
            </g>
            <g class="casing-bolts" aria-hidden="true">
              ${[
      [31, 33],
      [669, 33],
      [31, 327],
      [669, 327],
      [187, 33],
      [513, 33],
      [187, 327],
      [513, 327]
    ].map(
      ([b, x]) => A`<g transform=${`translate(${b} ${x})`}><circle r="5"></circle><path d="M-2.2 0 H2.2"></path></g>`
    )}
            </g>
            <g class="duct-shells" aria-hidden="true">
              <path d="M700 82 H566 C512 82 488 111 433 154"></path>
              <path d="M267 206 C212 249 188 278 134 278 H0"></path>
              <path d="M0 82 H134 C188 82 212 111 267 154"></path>
              <path d="M433 206 C488 249 512 278 566 278 H700"></path>
            </g>
            <g class="duct-highlights" aria-hidden="true">
              <path d="M700 76 H566 C512 76 488 105 433 148"></path>
              <path d="M267 200 C212 243 188 272 134 272 H0"></path>
              <path d="M0 76 H134 C188 76 212 105 267 148"></path>
              <path d="M433 200 C488 243 512 272 566 272 H700"></path>
            </g>
            <path
              class="airflow-path extract-flow"
              data-flow="inward"
              d="M700 82 H566 C512 82 488 111 433 154"
            ></path>
            <path
              class="airflow-path exhaust-flow"
              data-flow="outward"
              d="M267 206 C212 249 188 278 134 278 H0"
            ></path>
            <path
              class="airflow-path outdoor-flow"
              data-flow="inward"
              d="M0 82 H134 C188 82 212 111 267 154"
            ></path>
            <path
              class="airflow-path supply-flow"
              data-flow="outward"
              d="M433 206 C488 249 512 278 566 278 H700"
            ></path>
            <g class="filters" aria-hidden="true">
              ${[
      ["outdoor-filter", 134],
      ["extract-filter", 566]
    ].map(
      ([b, x]) => A`
                  <g
                    class="filter-cartridge ${b} ${m ? "known" : "unavailable"}"
                    data-path="incoming"
                    transform=${`translate(${x} 82)`}
                    filter="url(#component-shadow)"
                  >
                    <rect class="filter-depth" x="-17" y="-50" width="34" height="100" rx="4"></rect>
                    <rect class="filter-media" x="-12" y="-45" width="24" height="90" rx="2"></rect>
                    ${[-38, -26, -14, -2, 10, 22, 34].map(
        (k) => A`<path class="filter-pleat" d=${`M-10 ${k} L10 ${k + 8}`}></path>`
      )}
                    <rect class="filter-status-edge" x="-17" y="-50" width="5" height="100" rx="2"></rect>
                  </g>
                `
    )}
            </g>
            <g class="fan-assemblies" aria-hidden="true">
              ${[
      ["exhaust-fan", 148, 273, v],
      ["supply-fan", 552, 273, _]
    ].map(
      ([b, x, k, D]) => A`
                  <g
                    class="fan-assembly ${b} ${D ? "known" : "unavailable"}"
                    data-location="internal"
                    transform=${`translate(${x} ${k})`}
                    filter="url(#component-shadow)"
                  >
                    <path class="fan-scroll" d="M-60 -43 H12 Q48 -43 52 -12 V31 H29 V10 Q29 -8 10 -8 H-60 Z"></path>
                    <rect class="fan-motor" x="22" y="-15" width="30" height="30" rx="12"></rect>
                    <ellipse class="fan-drum-back" cx="-27" rx="38" ry="35"></ellipse>
                    <path class="fan-drum-depth" d="M-27 -35 H-18 A38 35 0 0 1 -18 35 H-27 A38 35 0 0 0 -27 -35 Z"></path>
                    <circle class="fan-ring" cx="-27" r="33"></circle>
                    <g class="fan-rotor">
                      ${Array.from({ length: 18 }, (W, te) => te * 20).map(
        (W) => A`<path
                          class="fan-vane"
                          d="M-31 -27 Q-21 -34 -13 -27 L-17 -21 Q-23 -26 -29 -20 Z"
                          transform=${`rotate(${W} -27 0)`}
                        ></path>`
      )}
                      <circle class="fan-shroud" cx="-27" r="24"></circle>
                      <circle class="fan-hub" cx="-27" r="9"></circle>
                      <circle class="fan-axle" cx="-27" r="3"></circle>
                    </g>
                    <path class="fan-feet" d="M-45 39 v9 h18 v-9 M26 39 v9 h18 v-9"></path>
                  </g>
                `
    )}
            </g>
            <g class="exchanger-plate" filter="url(#component-shadow)" aria-hidden="true">
              <path class="exchanger-shadow" d="M350 52 L480 180 L350 308 L220 180 Z"></path>
              <path class="exchanger-outline" d="M350 62 L470 180 L350 298 L230 180 Z"></path>
              <path class="exchanger-warm-face" d="M350 70 L462 180 L350 180 L238 180 Z"></path>
              <path class="exchanger-cool-face" d="M238 180 H350 V290 Z M350 180 H462 L350 290 Z"></path>
              <g class="warm-channels" clip-path="url(#system-exchanger-clip)">
                ${Array.from(
      { length: 15 },
      (b, x) => A`<path d=${`M${220 + x * 11} 75 L${405 + x * 11} 260`}></path>`
    )}
              </g>
              <g class="cool-channels" clip-path="url(#system-exchanger-clip)">
                ${Array.from(
      { length: 15 },
      (b, x) => A`<path d=${`M${295 + x * 11} 75 L${110 + x * 11} 260`}></path>`
    )}
              </g>
              <path class="passage-separator" d="M350 66 V294 M234 180 H466"></path>
              <path class="exchanger-frame-detail" d="M350 62 L470 180 L350 298 L230 180 Z"></path>
            </g>
            ${["extract", "exhaust", "outdoor", "supply"].map(
      (b) => A`<g
                  class="airflow-particles ${b}-particles ${p[b] === null ? "unavailable" : ""}"
                  aria-hidden="true"
                >
                  <circle class="airflow-particle particle-1" r="5"></circle
                  ><circle class="airflow-particle particle-2" r="5"></circle
                  ><circle class="airflow-particle particle-3" r="5"></circle>
                </g>`
    )}
            <g class="port-collars" aria-hidden="true">
              ${[
      ["outdoor-collar", 24, 82, d.outdoor],
      ["exhaust-collar", 24, 278, d.exhaust],
      ["extract-collar", 676, 82, d.extract],
      ["supply-collar", 676, 278, d.supply]
    ].map(
      ([b, x, k, D]) => A`
                  <g
                    class="port-collar ${b}"
                    transform=${`translate(${x} ${k})`}
                    style=${`--collar-color:${D}`}
                  >
                    <rect x="-26" y="-31" width="52" height="62" rx="8"></rect>
                    <ellipse cx="0" cy="0" rx="14" ry="31"></ellipse>
                    <path class="collar-highlight" d="M-13 -23 C-5 -29 5 -29 13 -23"></path>
                    <path class="collar-accent" d="M-18 -26 V26"></path>
                  </g>
                `
    )}
            </g>
          </svg>
          </div>
        </div>
        ${w(
      "exhaust",
      "Exhaust air",
      "exhaust_air_temp",
      !1,
      "mdi:tree",
      "mdi:arrow-bottom-left-thin",
      "Flowing outdoors"
    )}
        ${w(
      "supply",
      "Supply air",
      "supply_air_temp",
      !0,
      "mdi:home",
      "mdi:arrow-bottom-right-thin",
      "Flowing into the home"
    )}
      </div>
    `;
  }
  _infoTile(e, t, r, a = "ok", i) {
    return c`
      <div class="info-tile tone-${a}" title=${i ?? g}>
        <ha-icon icon=${r} aria-hidden="true"></ha-icon>
        <span>${e}</span>
        <strong>${t}</strong>
      </div>
    `;
  }
  _filterTile(e, t) {
    const r = this._number(e.filter_remaining), a = r === void 0 ? 0 : Math.max(0, Math.min(100, r / t.filter_max_days * 100)), i = r === void 0 ? "—" : `${Math.round(r)} days`;
    return c`
      <div class="info-tile">
        <ha-icon icon="mdi:air-filter" aria-hidden="true"></ha-icon>
        <span>Filter</span>
        <strong>${i}</strong>
        <div class="bar" aria-hidden="true"><span style=${`width:${a}%`}></span></div>
      </div>
    `;
  }
  _heatRecovery(e, t) {
    return jt({
      outdoor: this._number(e.outdoor_air_temp),
      extract: this._number(e.extract_air_temp),
      supply: this._number(e.supply_air_temp),
      method: t
    });
  }
  _pair(e, t, r = !1) {
    return e.map(
      ([a, i]) => `${i.replace(" fan", "")}: ${this._value(t[a], r) ?? "—"}`
    ).join(" · ");
  }
  _value(e, t = !1) {
    if (!e)
      return null;
    const r = this._present(e, t);
    return (r == null ? void 0 : r.text) ?? null;
  }
  _text(e) {
    return this._value(e) ?? "";
  }
  _state(e) {
    return (e == null ? void 0 : e.status) === "ok" ? e.value : void 0;
  }
  _number(e) {
    return (e == null ? void 0 : e.status) === "ok" ? e.numericValue : void 0;
  }
  _temperatureColour(e, t = 1) {
    const r = Math.max(0, Math.min(1, t));
    if (e === null || !Number.isFinite(e))
      return `color-mix(in srgb, var(--secondary-text-color), transparent ${Math.round((1 - r) * 100)}%)`;
    const a = H[0], i = H[H.length - 1], o = Math.max(a[0], Math.min(i[0], e));
    let n = a, l = i;
    for (let u = 1; u < H.length; u += 1) {
      const h = H[u];
      if (o <= h[0]) {
        n = H[u - 1], l = h;
        break;
      }
    }
    const p = l[0] === n[0] ? 0 : (o - n[0]) / (l[0] - n[0]), d = (u, h) => Math.round(u + (h - u) * p);
    return `rgba(${d(n[1], l[1])}, ${d(n[2], l[2])}, ${d(n[3], l[3])}, ${r})`;
  }
  _modeLabel(e) {
    const t = e.toLowerCase();
    return t === "medium" || t === "normal" ? "Home" : t === "boost" ? "Boost" : e ? Dt(e) : "";
  }
  _modeOptions(e) {
    return ((e == null ? void 0 : e.status) === "ok" && Array.isArray(e.attributes.options) ? e.attributes.options.filter((r) => typeof r == "string") : ["Away", "Low", "Home", "High"]).filter((r) => r.toLowerCase() !== "boost").sort((r, a) => +(a.toLowerCase() === "off") - +(r.toLowerCase() === "off"));
  }
  async _setMode(e, t, r) {
    if (!this._pendingMode) {
      this._pendingMode = r, this._modeError = void 0;
      try {
        await this._call(e, "select", "select_option", { entity_id: t, option: r });
      } catch {
        this._modeError = `Couldn't set ${this._modeLabel(r)} mode`;
      } finally {
        this._pendingMode = void 0;
      }
    }
  }
  _selectOptions(e) {
    return (e == null ? void 0 : e.status) === "ok" && Array.isArray(e.attributes.options) ? e.attributes.options.filter((t) => typeof t == "string") : [];
  }
  _hasControls(e, t) {
    return [
      e.mode,
      e.boost_duration,
      e.start_boost,
      e.cancel_boost,
      e.override_duration,
      e.clear_override
    ].some((r) => (r == null ? void 0 : r.status) === "ok" && !!t.entities);
  }
  /**
   * Phase 10's bottom status strip signal. "Communication issue" takes
   * priority over everything else: a required role that's mapped but
   * unreachable (entity missing or unavailable) is the most actionable
   * problem. A configured, active fault entity is next, then calibration
   * state, falling back to "System OK". Optional roles that simply aren't
   * configured never factor in here — same rule as the header (Phase 4/10).
   */
  _dashboardStatus(e) {
    var a, i;
    for (const o of fe) {
      if (Wt.has(o))
        continue;
      const n = e[o];
      if ((n == null ? void 0 : n.status) === "entity_missing" || (n == null ? void 0 : n.status) === "unavailable")
        return { tone: "warning", label: "Communication issue" };
    }
    const t = e.fault_active;
    if ((t == null ? void 0 : t.status) === "ok" && Kt.has(t.value.toLowerCase()))
      return { tone: "warning", label: "Fault detected" };
    const r = ((a = e.calibration_status) == null ? void 0 : a.status) === "ok" ? e.calibration_status.value.toLowerCase() : "";
    return r && !Qt.has(r) ? { tone: "muted", label: "Calibrating…" } : ((i = e.calibration_result) == null ? void 0 : i.status) === "ok" && e.calibration_result.value === "not_calibrated" ? { tone: "warning", label: "Calibration required" } : { tone: "success", label: "System OK" };
  }
  _press(e, t) {
    t && this._call(e, "button", "press", { entity_id: t });
  }
  async _call(e, t, r, a) {
    var i;
    await ((i = e.callService) == null ? void 0 : i.call(e, t, r, a));
  }
};
be.styles = Be`
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
      .system-visual-panel .unit.active .fan-rotor,
      .system-visual-panel .unit.active .airflow-particle,
      .recovery-badge-plate.recovery-pulse,
      .airflow-card.airflow-brighten,
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
      /* Same reasoning for the airflow particles: a static dot reads
         as decoration, not motion, so just leave them off rather than
         freeze mid-animation. */
      .system-visual-panel .unit.active .airflow-particle {
        opacity: 0;
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

    /* System Status card badges (visual-polish follow-up): "🟢 Boost
       Active / 🟢 System OK / 🟡 Filter 352 days" instead of label/value
       rows. Colour is always paired with the state spelled out in words, so
       the dot is decorative reinforcement, never the only signal. */
    .status-badge-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.85em;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 999px;
      border: 1px solid var(--divider-color);
      color: var(--primary-text-color);
      background: var(--ha-card-background, var(--card-background-color));
    }
    .status-badge-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--secondary-text-color);
      flex-shrink: 0;
    }
    .status-badge.tone-success {
      border-color: color-mix(in srgb, var(--success-color), transparent 55%);
      background: color-mix(in srgb, var(--success-color), transparent 88%);
    }
    .status-badge.tone-success .status-badge-dot {
      background: var(--success-color);
    }
    .status-badge.tone-warning {
      border-color: color-mix(in srgb, var(--warning-color), transparent 55%);
      background: color-mix(in srgb, var(--warning-color), transparent 88%);
    }
    .status-badge.tone-warning .status-badge-dot {
      background: var(--warning-color);
    }
    .status-badge.tone-muted .status-badge-dot {
      background: var(--secondary-text-color);
    }

    /* The boost-remaining countdown gets its own prominent callout above
       the badge row instead of being one more small line — "make the boost
       remaining time more prominent" — since it's a live, time-sensitive
       value someone glancing at the card is likely looking for. */
    .boost-remaining-highlight {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      margin-bottom: 12px;
      border-radius: 12px;
      border: 1px solid color-mix(in srgb, var(--success-color), transparent 55%);
      background: color-mix(in srgb, var(--success-color), transparent 90%);
    }
    .boost-remaining-highlight ha-icon {
      --mdc-icon-size: 26px;
      color: var(--success-color);
      flex-shrink: 0;
    }
    .boost-remaining-highlight strong {
      display: block;
      font-size: 1.5em;
      font-weight: 800;
      color: var(--success-color);
      line-height: 1.1;
    }
    .boost-remaining-highlight span {
      font-size: 0.78em;
      color: var(--secondary-text-color);
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
       redesign: a full-width shower banner + System Overview hero, three
       lower information cards, compact header controls). Every colour here
       is a plain CSS variable or a color-mix() tint against the current
       theme's own card background — nothing is a hard-coded dark surface,
       so this stays legible in a light Home Assistant theme and simply
       reads darker automatically under a dark one. ---- */
    .mvhr-system {
      width: 100%;
      box-sizing: border-box;
      padding: 4px 16px 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      /* Scoped to system mode only — the shower banner's one deliberately
         fixed brand accent, chosen so it never gets confused with the
         success/warning/primary tones the rest of the card already uses. */
      --shower-color: #a855f7;
      /* Lets the @container rules below react to the card's own rendered
         width instead of the browser viewport — see the comment above
         those rules for why that distinction matters on a real Home
         Assistant dashboard. */
      container-type: inline-size;
    }
    /* System Overview's own wrapper — always full width. "Let the System
       Overview dominate the page" (visual-polish follow-up, round 2): the
       shower banner moved above it and the header pill replaced the old
       side-column layout, so there's no longer a competing column here at
       all, on any screen size. */
    .system-main {
      display: block;
    }
    /* A Home Assistant dashboard routinely gives a card far less width than
       the browser viewport (masonry/sidebar columns, grid sections, etc.),
       so a plain @media breakpoint can stay stuck on the wide desktop
       layout — even though the card itself is genuinely narrow, which is
       what an earlier layout bug in this card turned out to be. These
       @container rules duplicate (never replace) the equivalent @media
       rules further down using the card's own width instead, so the layout
       reflows correctly regardless of where Lovelace decides to place it.
       Where a browser doesn't support container queries yet, the @media
       rules remain as the fallback. */
    @container (max-width: 640px) {
      .system-visual-wrap {
        grid-template-columns: minmax(130px, 1fr) minmax(240px, 320px) minmax(130px, 1fr);
        min-height: 420px;
      }
      .system-lower-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .shower-active {
        flex-direction: column;
        align-items: stretch;
        text-align: left;
      }
    }
    @container (max-width: 520px) {
      .system-visual-wrap {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        grid-template-rows: auto auto auto;
        min-height: 0;
      }
      .system-visual-panel .unit-stage {
        grid-column: 1 / -1;
        grid-row: 2;
      }
      .system-visual-panel .unit {
        min-height: 180px;
      }
      .system-visual-panel .air-path {
        min-height: 66px;
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
      .boost-pill-button,
      .shower-pill {
        width: 100%;
        justify-content: center;
      }
      .airflow-card-body {
        flex-direction: column;
        align-items: stretch;
      }
      .gauge {
        width: 100%;
        max-width: 260px;
        margin: 0 auto;
      }
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
    /* "Let the System Overview dominate the page" (visual-polish follow-up,
       round 2) — with the shower panel now a header pill/full-width banner
       instead of a competing side column, Overview always gets the full
       card width, so it's sized considerably larger again here. */
    .system-visual-wrap {
      min-height: 430px;
      grid-template-columns: minmax(160px, 1fr) minmax(460px, 700px) minmax(160px, 1fr);
    }
    .unit-stage {
      grid-column: 2;
      grid-row: 1 / span 2;
      width: 100%;
      min-width: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }
    .system-visual-panel .unit {
      grid-column: auto;
      grid-row: auto;
      min-height: 360px;
      border-radius: 26px;
      background: transparent;
      border-color: transparent;
      box-shadow: none;
    }
    .airflow-schematic {
      position: absolute;
      inset: 3% 0;
      width: 100%;
      height: 94%;
      overflow: visible;
    }
    .airflow-path {
      fill: none;
      stroke-width: 40;
      stroke-linecap: round;
      stroke-linejoin: round;
      opacity: 0.96;
    }
    .duct-shells path {
      fill: none;
      stroke: color-mix(in srgb, var(--primary-text-color), #05080b 72%);
      stroke-width: 54;
      stroke-linecap: round;
      stroke-linejoin: round;
      filter: drop-shadow(0 5px 5px rgba(0, 0, 0, 0.35));
    }
    .duct-highlights path {
      fill: none;
      stroke: rgba(255, 255, 255, 0.24);
      stroke-width: 6;
      stroke-linecap: round;
      opacity: 0.75;
      pointer-events: none;
    }
    .cabinet-outer {
      fill: url(#cabinet-edge);
      stroke: color-mix(in srgb, var(--primary-text-color), #101419 54%);
      stroke-width: 4;
    }
    .cutaway-shell {
      fill: url(#inner-chamber);
      stroke: color-mix(in srgb, var(--primary-text-color), #090c10 70%);
      stroke-width: 8;
    }
    .cabinet-seam {
      fill: none;
      stroke: rgba(255, 255, 255, 0.18);
      stroke-width: 2;
    }
    .cabinet-lip {
      fill: none;
      stroke: rgba(255, 255, 255, 0.28);
      stroke-width: 3;
      stroke-linecap: round;
    }
    .metal-light {
      stop-color: #d9dde0;
    }
    .metal-mid {
      stop-color: #8c949a;
    }
    .metal-dark {
      stop-color: #343a3f;
    }
    .chamber-top {
      stop-color: #24282c;
    }
    .chamber-bottom {
      stop-color: #0f1215;
    }
    .blower-light {
      stop-color: #5b6268;
    }
    .blower-dark {
      stop-color: #15191c;
    }
    .cutaway-compartments path {
      fill: none;
      stroke: #5f676d;
      stroke-width: 7;
      filter: drop-shadow(2px 0 2px rgba(0, 0, 0, 0.5));
    }
    .cutaway-compartments .support-rail {
      stroke-width: 3;
      stroke: #9ba1a5;
      opacity: 0.62;
    }
    .mounting-brackets path,
    .mounting-brackets rect {
      fill: #71787e;
      stroke: #1b1f22;
      stroke-width: 2;
    }
    .casing-bolts circle {
      fill: #b8bdc1;
      stroke: #30363a;
      stroke-width: 1.5;
    }
    .casing-bolts path {
      stroke: #454b50;
      stroke-width: 1.2;
    }
    .filter-depth {
      fill: #555c61;
      stroke: #c2c6c9;
      stroke-width: 3;
    }
    .filter-media {
      fill: #c2b79d;
      stroke: #312e29;
      stroke-width: 2;
    }
    .filter-pleat {
      fill: none;
      stroke: #716956;
      stroke-width: 2.2;
    }
    .filter-status-edge {
      fill: #687078;
    }
    .filter-cartridge.known .filter-status-edge {
      fill: var(--success-color);
    }
    .filter-cartridge.unavailable {
      opacity: 0.68;
    }
    .port-collar rect {
      fill: url(#collar-metal);
      stroke: #252b2f;
      stroke-width: 3;
    }
    .port-collar ellipse {
      fill: #1a1f23;
      stroke: #aeb4b8;
      stroke-width: 3;
    }
    .collar-highlight {
      fill: none;
      stroke: rgba(255, 255, 255, 0.48);
      stroke-width: 3;
    }
    .collar-accent {
      fill: none;
      stroke: var(--collar-color);
      stroke-width: 5;
      opacity: 0.9;
    }
    .extract-flow {
      stroke: url(#extract-gradient);
    }
    .exhaust-flow {
      stroke: url(#exhaust-gradient);
    }
    .outdoor-flow {
      stroke: url(#outdoor-gradient);
    }
    .supply-flow {
      stroke: url(#supply-gradient);
    }
    .exchanger-outline {
      fill: #677077;
      stroke: url(#exchanger-frame);
      stroke-width: 18;
      stroke-linejoin: round;
    }
    .exchanger-shadow {
      fill: rgba(0, 0, 0, 0.45);
    }
    .exchanger-warm-face {
      fill: url(#warm-exchanger-gradient);
      opacity: 0.56;
    }
    .exchanger-cool-face {
      fill: url(#cool-exchanger-gradient);
      opacity: 0.58;
    }
    .warm-channels path,
    .cool-channels path {
      fill: none;
      stroke-width: 2.4;
      stroke-linecap: round;
      opacity: 0.86;
    }
    .warm-channels path {
      stroke: url(#warm-exchanger-gradient);
    }
    .cool-channels path {
      stroke: url(#cool-exchanger-gradient);
    }
    .passage-separator {
      fill: none;
      stroke: #d2d6d8;
      stroke-width: 6;
      opacity: 0.9;
    }
    .exchanger-frame-detail {
      fill: none;
      stroke: rgba(255, 255, 255, 0.48);
      stroke-width: 3;
      stroke-linejoin: round;
    }
    .fan-scroll {
      fill: url(#blower-metal);
      stroke: #0a0d0f;
      stroke-width: 4;
    }
    .fan-drum-back {
      fill: #080b0d;
      stroke: #c0c5c8;
      stroke-width: 5;
    }
    .fan-drum-depth {
      fill: url(#blower-metal);
      stroke: #262b2f;
      stroke-width: 2;
    }
    .fan-ring {
      fill: #101417;
      stroke: #9ca2a6;
      stroke-width: 3;
    }
    .fan-motor {
      fill: url(#blower-metal);
      stroke: #090b0d;
      stroke-width: 4;
    }
    .fan-feet {
      fill: none;
      stroke: #9ca2a6;
      stroke-width: 6;
      stroke-linejoin: round;
    }
    .fan-rotor {
      transform-box: fill-box;
      transform-origin: center;
    }
    .fan-vane {
      fill: #697279;
      stroke: #1a1e21;
      stroke-width: 1;
    }
    .fan-shroud {
      fill: none;
      stroke: #a1a8ad;
      stroke-width: 3;
    }
    .fan-hub {
      fill: url(#blower-metal);
      stroke: #24292d;
      stroke-width: 3;
    }
    .fan-axle {
      fill: #d6dadd;
      stroke: #343a3e;
      stroke-width: 1.5;
    }
    .fan-assembly.unavailable {
      opacity: 0.58;
      filter: grayscale(1);
    }
    .system-visual-panel .unit.active .fan-assembly.unavailable .fan-rotor {
      animation: none;
    }
    .airflow-particle {
      opacity: 0;
      offset-rotate: 0deg;
    }
    .extract-particles .airflow-particle {
      fill: var(--air-extract);
      offset-path: path('M700 82 H566 C512 82 488 111 433 154');
    }
    .exhaust-particles .airflow-particle {
      fill: var(--air-exhaust);
      offset-path: path('M267 206 C212 249 188 278 134 278 H0');
    }
    .outdoor-particles .airflow-particle {
      fill: var(--air-outdoor);
      offset-path: path('M0 82 H134 C188 82 212 111 267 154');
    }
    .supply-particles .airflow-particle {
      fill: var(--air-supply);
      offset-path: path('M433 206 C488 249 512 278 566 278 H700');
    }
    .system-visual-panel .unit.active .airflow-particle {
      animation: schematic-particle 2.4s linear infinite;
    }
    .system-visual-panel .unit.active .airflow-particles.unavailable .airflow-particle {
      animation: none;
      opacity: 0;
    }
    .system-visual-panel .unit.active .fan-rotor {
      animation: spin 2.8s linear infinite;
    }
    .system-visual-panel .unit.active .particle-2 {
      animation-delay: -0.8s;
    }
    .system-visual-panel .unit.active .particle-3 {
      animation-delay: -1.6s;
    }
    @keyframes schematic-particle {
      0% {
        offset-distance: 0%;
        opacity: 0;
      }
      12%,
      88% {
        opacity: 0.9;
      }
      100% {
        offset-distance: 100%;
        opacity: 0;
      }
    }
    /* Compact equipment-style information plate: it leaves all four plate
       exchanger quadrants visible while retaining the one-shot update pulse. */
    .recovery-badge-plate {
      position: relative;
      z-index: 3;
      width: 176px;
      height: 88px;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      text-align: center;
      background: color-mix(
        in srgb,
        var(--ha-card-background, var(--card-background-color)),
        transparent 4%
      );
      border: 3px solid color-mix(in srgb, var(--success-color), transparent 25%);
      box-shadow: 0 5px 14px rgba(0, 0, 0, 0.2);
      cursor: default;
    }
    .recovery-badge-plate strong {
      font-size: 2em;
      font-weight: 800;
      color: var(--success-color);
      line-height: 1.1;
    }
    .recovery-badge-plate span {
      font-size: 0.68em;
      font-weight: 700;
      color: var(--secondary-text-color);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    /* "Heat recovery badge gently pulses when efficiency changes" — a
       single, subtle scale pulse, not a loop (visual-polish follow-up,
       round 3). Only ever applied for one render, the instant the figure
       actually changes (see _systemHeroVisual's recoveryPulse), so it
       naturally plays once and stops rather than needing to be removed. */
    .recovery-badge-plate.recovery-pulse {
      animation: recovery-pulse 0.7s ease-out;
    }
    .recovery-connector {
      width: 1px;
      height: 10px;
      background: color-mix(in srgb, var(--success-color), transparent 45%);
      flex: 0 0 auto;
    }
    @keyframes recovery-pulse {
      0% {
        transform: scale(1);
      }
      35% {
        transform: scale(1.08);
        box-shadow: 0 8px 18px rgba(0, 0, 0, 0.24);
      }
      100% {
        transform: scale(1);
      }
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
    /* Each endpoint is tinted from its own live temperature. The inline
       custom properties are recalculated on every Home Assistant update. */
    .system-visual-panel .air-path {
      background: var(--stream-soft);
      border-color: color-mix(in srgb, var(--stream-color), transparent 45%);
    }
    /* System-mode endpoint cards are deliberately static. Their live tint,
       not decorative movement, communicates temperature. */
    .system-visual-panel .air-path::after {
      content: none;
      display: none;
      animation: none;
      background: none;
    }
    /* "Particles accelerate slightly during Boost" and the fans spin a
       little faster with them — a real boost mode raises fan speed
       noticeably, so this reinforces that state through the animations
       that already exist rather than adding anything new to the exchanger
       graphic (visual-polish follow-up, round 3). Same elements, same
       keyframes, just a shorter duration — .boost-active is only ever
       applied alongside .active, so this never overrides a stopped
       animation into a running one. */
    .system-visual-panel .unit.active.boost-active .fan-rotor {
      animation-duration: 1.6s;
    }
    .system-visual-panel .unit.active.boost-active .airflow-particle {
      animation-duration: 1.35s;
    }

    /* ---- shower-detection banner (full-width, active only — the idle
       state is the header's .shower-pill instead, see above) ---- */
    .shower-panel {
      border-radius: 16px;
      padding: 16px;
      box-sizing: border-box;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }
    /* A horizontal banner (illustration + heading on the left, facts as a
       row on the right) rather than a narrow vertical column — it now spans
       the full card width, directly above System Overview, instead of
       sitting in its own side column (visual-polish follow-up, round 2). */
    .shower-active {
      border: 1px solid color-mix(in srgb, var(--shower-color), transparent 55%);
      background: color-mix(in srgb, var(--shower-color), transparent 92%);
      flex-direction: row;
      flex-wrap: wrap;
      align-items: center;
      gap: 20px;
    }
    .shower-banner-head {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-shrink: 0;
    }
    .shower-banner-titles {
      display: flex;
      flex-direction: column;
      text-align: left;
    }
    .shower-heading {
      color: var(--shower-color);
      font-size: 0.85em;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin: 0;
    }
    .shower-illustration {
      width: 72px;
      height: 60px;
      flex-shrink: 0;
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
    }
    .shower-facts {
      flex: 1 1 auto;
      margin: 0;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 10px 20px;
      text-align: left;
      min-width: 260px;
    }
    .shower-fact {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding-left: 14px;
      border-left: 1px solid color-mix(in srgb, var(--shower-color), transparent 70%);
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
      transition: border-color 0.3s ease;
    }
    /* "Airflow cards brighten when airflow increases" — a brief border/glow
       flash, not a permanent state change (visual-polish follow-up, round
       3); only ever applied for the one render where the reading just went
       up (see _systemAirflowCard's airflowIncreased), so like the
       recovery pulse it plays once and stops on its own. */
    .airflow-card.airflow-brighten {
      animation: airflow-brighten 0.9s ease-out;
    }
    @keyframes airflow-brighten {
      0% {
        border-color: var(--divider-color);
        box-shadow: none;
      }
      30% {
        border-color: color-mix(in srgb, #3b82f6, transparent 30%);
        box-shadow: 0 0 0 4px color-mix(in srgb, #3b82f6, transparent 85%);
      }
      100% {
        border-color: var(--divider-color);
        box-shadow: none;
      }
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
      /* "Airflow is probably the single most important metric" — almost
         doubled from the original 140px per the visual-polish follow-up. */
      width: 260px;
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
      font-size: 2.6em;
      line-height: 1;
      color: var(--primary-text-color);
    }
    /* The unit sits on its own line under the number rather than run on
       inline ("120" / "m³/h", not "120 m³/h") — visual-polish follow-up,
       round 2. */
    .gauge-value b.gauge-unit {
      font-size: 1em;
      font-weight: 600;
      color: var(--secondary-text-color);
      margin-top: 2px;
    }
    .gauge-value span {
      font-size: 0.8em;
      color: var(--secondary-text-color);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-top: 4px;
    }
    .gauge-value .gauge-scale {
      margin-top: 4px;
      font-size: 0.72em;
      color: var(--secondary-text-color);
      text-transform: none;
      letter-spacing: normal;
    }
    .mode-select-pill.mode-off,
    .chip.mode-off.active {
      color: var(--secondary-text-color);
      background: color-mix(in srgb, var(--secondary-text-color), transparent 88%);
    }
    .control-error,
    .preset-validation {
      color: var(--error-color) !important;
    }
    .control-success {
      color: var(--success-color) !important;
    }

    /* ---- compact header controls (visual redesign) ---- */
    /* A single bordered "control panel" strip instead of loose floating
       pills in the corner — "integrate it into the header so it feels like
       part of the appliance" (visual-polish follow-up, round 2). The pills
       themselves keep their own border/background so they still read as
       individually pressable/selectable, but the strip around them ties
       Mode/Boost/Shower together as one physical-feeling control group. */
    .system-controls.header-controls {
      border: 1px solid var(--divider-color);
      border-radius: 14px;
      background: color-mix(in srgb, var(--divider-color), transparent 88%);
      padding: 10px 14px;
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
      flex-wrap: wrap;
      justify-content: center;
      gap: 4px 6px;
    }
    .boost-pill-button ha-icon {
      --mdc-icon-size: 16px;
    }
    /* The remaining-time readout wraps onto its own line under Active/Ready
       rather than squeezing onto the same line (visual-polish follow-up:
       "make the boost remaining time more prominent"). */
    .boost-pill-button small {
      flex-basis: 100%;
      text-align: center;
      font-size: 0.75em;
      font-weight: 600;
      opacity: 0.85;
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
    /* The always-on shower status indicator in the header ("float it as a
       small status card in the header" — visual-polish follow-up, round
       2). Read-only, so it's a plain pill, not a button. */
    .shower-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-weight: 700;
      font-size: 0.95em;
      border: 1px solid var(--divider-color);
      border-radius: 999px;
      padding: 8px 14px;
      min-height: 40px;
      box-sizing: border-box;
      background: var(--ha-card-background, var(--card-background-color));
      color: var(--secondary-text-color);
      white-space: nowrap;
    }
    .shower-pill ha-icon {
      --mdc-icon-size: 16px;
    }
    .shower-pill.is-active {
      background: color-mix(in srgb, var(--shower-color, #a855f7), transparent 82%);
      border-color: color-mix(in srgb, var(--shower-color, #a855f7), transparent 45%);
      color: var(--shower-color, #a855f7);
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
    .preset-controls,
    .calibration-control {
      border: 1px solid var(--divider-color);
      border-radius: 12px;
      padding: 14px;
      background: var(--ha-card-background, var(--card-background-color));
    }
    .preset-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-top: 10px;
    }
    .preset-field {
      display: flex;
      flex-direction: column;
      gap: 5px;
      min-width: 0;
      font-size: 0.82em;
      color: var(--secondary-text-color);
    }
    .preset-input-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .preset-input-wrap input {
      width: 100%;
      min-width: 0;
      min-height: 42px;
      box-sizing: border-box;
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      padding: 8px;
      font: inherit;
      color: var(--primary-text-color);
      background: var(--ha-card-background, var(--card-background-color));
    }
    .preset-input-wrap small {
      white-space: nowrap;
    }
    .preset-validation {
      margin: 10px 0 0;
      font-size: 0.8em;
    }
    .calibration-control {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .calibration-control > div {
      display: flex;
      flex: 1 1 220px;
      flex-direction: column;
      gap: 3px;
    }
    .calibration-control small {
      color: var(--secondary-text-color);
    }
    .calibration-button {
      flex: 0 0 auto;
    }
    /* Calibration + fan-speed diagnostics as compact tiles rather than
       full-width rows (visual-polish follow-up). */
    .compact-stats-card {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px 20px;
      border: 1px solid var(--divider-color);
      border-radius: 12px;
      padding: 12px 16px;
      background: var(--ha-card-background, var(--card-background-color));
    }
    .compact-stat {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .compact-stat span {
      font-size: 0.75em;
      color: var(--secondary-text-color);
    }
    .compact-stat strong {
      font-size: 1em;
      color: var(--primary-text-color);
      overflow-wrap: break-word;
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
        grid-template-columns: minmax(140px, 1fr) minmax(360px, 520px) minmax(140px, 1fr);
        min-height: 440px;
      }
      .system-visual-panel .unit {
        min-height: 320px;
      }
      .recovery-badge-plate {
        width: 148px;
        height: 76px;
      }
      /* Tablet: the three lower cards wrap to two columns instead of
         three, and the shower banner stacks to a column. */
      .system-lower-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .shower-active {
        flex-direction: column;
        align-items: stretch;
        text-align: left;
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
      .system-visual-panel .unit-stage {
        grid-column: 1 / -1;
        grid-row: 2;
      }
      .system-visual-panel .unit {
        min-height: 170px;
      }
      .airflow-schematic {
        inset: 4% 0;
        height: 92%;
      }
      /* Single column everywhere on mobile: lower cards and the header's
         compact controls all stack, the shower banner drops to a column
         layout, and the gauge shrinks so nothing overlaps or forces
         horizontal scroll. */
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
      .boost-pill-button,
      .shower-pill {
        width: 100%;
        justify-content: center;
      }
      .shower-active {
        flex-direction: column;
        align-items: stretch;
        text-align: left;
      }
      .shower-illustration {
        width: 60px;
        height: 50px;
      }
      .airflow-card-body {
        flex-direction: column;
        align-items: stretch;
      }
      .gauge {
        width: 100%;
        max-width: 300px;
        margin: 0 auto;
      }
      .disclosure-toggle {
        width: 100%;
      }
      .preset-grid {
        grid-template-columns: minmax(0, 1fr);
      }
      .calibration-button {
        width: 100%;
      }
    }

    /* Container-query overrides must follow the desktop system-visual
       rules above: dashboard columns can be narrow even when the browser
       viewport is wide, so viewport media queries alone are insufficient. */
    @container (max-width: 520px) {
      .system-visual-wrap {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        grid-template-rows: auto auto auto;
        min-height: 0;
        gap: 10px;
      }
      .system-visual-panel .unit-stage {
        grid-column: 1 / -1;
        grid-row: 2;
      }
      .system-visual-panel .unit {
        min-height: 180px;
      }
      .system-visual-panel .air-path {
        min-height: 66px;
        padding: 10px;
      }
      .system-visual-panel .duct-highlights,
      .system-visual-panel .mounting-brackets {
        opacity: 0.45;
      }
      .system-visual-panel .particle-3 {
        display: none;
      }
      .system-visual-panel .recovery-badge-plate {
        width: 106px;
        height: 58px;
        border-radius: 8px;
      }
      .system-visual-panel .recovery-badge-plate strong {
        font-size: 1.45em;
      }
      .system-visual-panel .recovery-badge-plate span {
        font-size: 0.54em;
      }
      .system-lower-grid {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `;
let $ = be;
z([
  me({ attribute: !1 })
], $.prototype, "hass");
z([
  O()
], $.prototype, "_config");
z([
  O()
], $.prototype, "_configError");
z([
  O()
], $.prototype, "_advancedOpen");
z([
  O()
], $.prototype, "_pendingMode");
z([
  O()
], $.prototype, "_modeError");
z([
  O()
], $.prototype, "_calibrationFeedback");
customElements.get(J) || customElements.define(J, $);
window.customCards = window.customCards ?? [];
window.customCards.some((s) => s.type === J) || window.customCards.push({
  type: J,
  name: "HiPer MVHR Card",
  description: "Universal MVHR dashboard card for Home Assistant"
});
