import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import 'rxjs/add/operator/distinctUntilChanged';

// Default (empty) AtomSpace
const emptyAtomSpace = { 'result': { 'atoms': [] }};

// Default (empty) Unordered (Symmetric) Link types
const emptyUnorderedLinktypes = [];

// Default (empty) Custom Style
const emptyStyle = '';

// Default language
const defaultLang = 'en';

// Data object for passing AtomService parameters
export interface AtomServiceData {
  atoms: object;
  unordered_linktypes: string[];
  custom_style: string;
  language: string;
  numAtoms: number;
}

@Injectable()
export class AtomService {
  private defaultState: AtomServiceData = {
    atoms: emptyAtomSpace,
    unordered_linktypes: emptyUnorderedLinktypes,
    custom_style: emptyStyle,
    language: defaultLang,
    numAtoms: 0};
  private editItemSource: BehaviorSubject<any> = new BehaviorSubject(this.defaultState);
  public editItem = this.editItemSource.asObservable().distinctUntilChanged();

  changeItem(state) {
    // console.log('AtomService: Item Changed', state);
    this.editItemSource.next(state);
  }
}
