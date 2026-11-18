import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';

export interface Pays {
  names: { common: string };
  codes?: { alpha_2: string };
  capitals?: { name: string }[];
  population: number;
  flag: { url_png: string; url_svg?: string; description?: string };
  links: { google_maps: string };
  coordinates: { lat: number; lng: number };
  area?: { kilometers: number };
  languages?: any[];
}

interface Reponse {
  data: { objects: Pays[] };
}

@Injectable({ providedIn: 'root' })
export class Country {
  private http = inject(HttpClient);
  private baseUrl = 'https://api.restcountries.com/countries/v5'; 
  private apiKey =  'rc_live_e5fbf64a9cf64cea9aa17e206239643e'
  
  private fields =
    'names.common,codes.alpha_2,capitals,population,flag.url_png,flag.url_svg,flag.description,links.google_maps,coordinates,area.kilometers,languages';

  private getPage(offset: number): Observable<Pays[]> {
    const headers = new HttpHeaders({ Authorization: `Bearer ${this.apiKey}` });
    const url = `${this.baseUrl}?limit=100&offset=${offset}&response_fields=${this.fields}`;
    return this.http.get<Reponse>(url, { headers }).pipe(map(r => r.data.objects));
  }

  getCountries(): Observable<Pays[]> {
    return forkJoin([this.getPage(0), this.getPage(100), this.getPage(200)])
      .pipe(map(pages => pages.flat()));
  }
}