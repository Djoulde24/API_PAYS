import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Country, Pays } from './country';

@Component({
  selector: 'app-root',
  imports: [DecimalPipe],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private countryService = inject(Country);
  private sanitizer = inject(DomSanitizer);

  countries = signal<Pays[]>([]);
  search = signal('');
  loading = signal(true);
  error = signal('');

  selected = signal<Pays | null>(null);
  mapUrl = signal<SafeResourceUrl | null>(null);

  flagFailed = signal<Set<string>>(new Set());

  filtered = computed(() => {
    const t = this.search().toLowerCase();
    return this.countries().filter(c =>
      c.names.common.toLowerCase().includes(t)
    );
  });

  ngOnInit() {
    this.countryService.getCountries().subscribe({
      next: data => {
        data.sort((a, b) => a.names.common.localeCompare(b.names.common));
        this.countries.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger les pays.');
        this.loading.set(false);
      }
    });
  }

  // ---------- Carte ----------
  isSelected(c: Pays): boolean {
    return this.selected()?.names.common === c.names.common;
  }

  toggleMap(c: Pays) {
    if (this.isSelected(c)) {
      this.selected.set(null);
      this.mapUrl.set(null);
      return;
    }
    const { lat, lng } = c.coordinates;
    // plus le pays est grand, plus la carte est dézoomée
    const d = Math.min(Math.max(Math.sqrt(c.area?.kilometers ?? 10000) / 80, 0.5), 40);
    const url =
      `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d},${lat - d},${lng + d},${lat + d}` +
      `&layer=mapnik&marker=${lat},${lng}`;
    this.mapUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
    this.selected.set(c);
  }

  // ---------- Langues ----------
  langues(c: Pays): string {
    const noms = (c.languages ?? [])
      .map(l => this.nomLangue(l))
      .filter(n => n);
    return noms.length ? noms.join(', ') : '—';
  }

  private nomLangue(l: any): string {
    if (typeof l === 'string') return l;
    if (!l || typeof l !== 'object') return '';
    const cles = Object.keys(l);
    const cle =
      cles.find(k => k.toLowerCase().includes('english')) ??
      cles.find(k => k.toLowerCase().includes('name'));
    if (!cle) return '';
    const v = l[cle];
    if (typeof v === 'string') return v;
    if (v && typeof v === 'object') {
      const premier = Object.values(v).find(x => typeof x === 'string');
      return (premier as string) ?? '';
    }
    return '';
  }

  // ---------- Drapeaux ----------
  private flagSources(c: Pays): string[] {
    const code = c.codes?.alpha_2?.toLowerCase();
    return [
      c.flag?.url_png,
      c.flag?.url_svg,
      code ? `https://flags.restcountries.com/v5/w320/${code}.png` : ''
    ].filter((u): u is string => !!u);
  }

  flagUrl(c: Pays): string {
    return this.flagSources(c)[0] ?? '';
  }

  hasFlagFailed(c: Pays): boolean {
    return this.flagFailed().has(c.names.common) || this.flagSources(c).length === 0;
  }

  onFlagError(event: Event, c: Pays) {
    const img = event.target as HTMLImageElement;
    const sources = this.flagSources(c);
    const suivant = Number(img.dataset['essai'] ?? '0') + 1;

    if (suivant < sources.length) {
      img.dataset['essai'] = String(suivant);
      img.src = sources[suivant];            // on essaie la source suivante
    } else {
      this.flagFailed.update(s => new Set(s).add(c.names.common));
    }
  }
}