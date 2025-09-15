import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Foot } from './foot';

describe('Foot', () => {
  let component: Foot;
  let fixture: ComponentFixture<Foot>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Foot]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Foot);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
