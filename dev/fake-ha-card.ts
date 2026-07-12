/**
 * Dev-only stand-in for Home Assistant's real `<ha-card>` element, so the
 * card is legible when previewed outside an actual HA frontend. Not part of
 * the production bundle — src/index.ts never imports this, only
 * dev/preview.ts does.
 *
 * As of Phase 2 the card builds its own header markup internally rather
 * than setting `ha-card`'s `.header` property, so this stand-in only needs
 * to be a plain block-level container — dev/preview.html supplies its
 * background/border-radius/shadow via the same CSS variables real HA would.
 */
class FakeHaCard extends HTMLElement {}

if (!customElements.get('ha-card')) {
  customElements.define('ha-card', FakeHaCard);
}
