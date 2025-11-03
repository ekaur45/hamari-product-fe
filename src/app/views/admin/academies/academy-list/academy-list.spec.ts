import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AcademyList } from './academy-list';

describe('AcademyList', () => {
  let component: AcademyList;
  let fixture: ComponentFixture<AcademyList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AcademyList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AcademyList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
