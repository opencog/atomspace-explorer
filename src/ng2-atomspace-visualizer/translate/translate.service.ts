/**
 * Created by sshermz on 2/23/18.
 */

import { Injectable, Inject } from '@angular/core';
import { DICTIONARY } from './translations';

@Injectable()
export class TranslateService {
  private _currentLang: string;

  // inject translations
  constructor(@Inject(DICTIONARY) private _translations: any) {
  }

  public get currentLang() {
    return this._currentLang;
  }

  public use(lang: string): void {
    this._currentLang = lang;
  }

  private translate(key: string): string {
    const translation = key;

    if (this._translations[this.currentLang] && this._translations[this.currentLang][key]) {
      return this._translations[this.currentLang][key];
    }

    return translation;
  }

  public instant(key: string) {
    return this.translate(key);
  }
}
