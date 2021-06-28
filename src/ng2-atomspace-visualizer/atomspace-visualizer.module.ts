import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VisualizerComponent } from './visualizer/visualizer.component';
import { AtomService } from './atom.service';
import { VisualizerService } from './visualizer/visualizer.service';
import { InitializeDropdown } from './directives/intialize-dropdown.directive';
import { TranslateModule } from './translate/translate.module';

@NgModule({
  imports: [
    CommonModule,
    TranslateModule
  ],
  declarations: [ VisualizerComponent, InitializeDropdown ],
  exports: [ VisualizerComponent ]
})
export class AtomspaceVisualizerModule {
  static forRoot() {
    return {
      ngModule: AtomspaceVisualizerModule,
      providers: [ VisualizerService, AtomService ]
    };
  }
}
