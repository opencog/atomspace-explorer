/**
 * Created by tsadik on 11/14/17.
 */

import {Directive, OnInit, OnDestroy, ElementRef} from "@angular/core";

declare var $: any

@Directive({
  selector: '.ui.dropdown'
})
export class InitializeDropdown implements OnInit, OnDestroy {

  constructor(private el: ElementRef) {
  }

  public ngOnInit() {
    $(this.el.nativeElement).dropdown();
  }

  public ngOnDestroy() {
    $(this.el.nativeElement).dropdown('destroy');
  }
}
