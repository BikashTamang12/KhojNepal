import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PageHeader } from './page-header';

@Component({
  standalone: true,
  imports: [PageHeader],
  template: `
    <app-page-header
      eyebrow="User Workspace"
      title="My Reports"
      description="Track all submitted reports."
    >
      <div page-actions>
        <button type="button" class="action-btn">New Report</button>
      </div>
    </app-page-header>
  `,
})
class HeaderHostComponent {}

describe('PageHeader', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderHostComponent],
    }).compileComponents();
  });

  it('renders eyebrow, heading, description, and projected action slot', () => {
    const fixture = TestBed.createComponent(HeaderHostComponent);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.page-eyebrow')?.textContent?.trim()).toBe('User Workspace');
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('My Reports');
    expect(el.querySelector('.page-description')?.textContent?.trim()).toBe(
      'Track all submitted reports.',
    );
    expect(el.querySelector('.action-btn')?.textContent?.trim()).toBe('New Report');
  });
});
