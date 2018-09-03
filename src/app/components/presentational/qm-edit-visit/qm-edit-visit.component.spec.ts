import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { QmEditVisitComponent } from './qm-edit-visit.component';

describe('QmEditVisitComponent', () => {
  let component: QmEditVisitComponent;
  let fixture: ComponentFixture<QmEditVisitComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ QmEditVisitComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(QmEditVisitComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
