import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { QmEditVisitListComponent } from './qm-edit-visit-list.component';

describe('QmEditVisitListComponent', () => {
  let component: QmEditVisitListComponent;
  let fixture: ComponentFixture<QmEditVisitListComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ QmEditVisitListComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(QmEditVisitListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
