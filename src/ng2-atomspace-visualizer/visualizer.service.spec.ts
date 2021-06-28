import { TestBed, inject } from '@angular/core/testing';
import { VisualizerService } from './visualizer/visualizer.service';

describe('VisualizerService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [VisualizerService]
    });
  });

  it('should be created', inject([VisualizerService], (service: VisualizerService) => {
    expect(service).toBeTruthy();
  }));
});
