/**
 * Dev-only stand-in for Home Assistant's real `<ha-card>` element, so the
 * card is legible when previewed outside an actual HA frontend. Not part of
 * the production bundle — src/index.ts never imports this, only
 * dev/preview.ts does.
 */
class FakeHaCard extends HTMLElement {
  private _header?: string;

  set header(value: string | undefined) {
    this._header = value;
    this._render();
  }

  get header(): string | undefined {
    return this._header;
  }

  connectedCallback(): void {
    this._render();
  }

  private _render(): void {
    let header = this.querySelector<HTMLElement>('[data-fake-ha-card-header]');
    if (!header) {
      header = document.createElement('div');
      header.setAttribute('data-fake-ha-card-header', '');
      header.style.fontWeight = '600';
      header.style.padding = '12px 16px 4px';
      this.prepend(header);
    }
    header.textContent = this._header ?? '';
    header.style.display = this._header ? 'block' : 'none';
  }
}

if (!customElements.get('ha-card')) {
  customElements.define('ha-card', FakeHaCard);
}
