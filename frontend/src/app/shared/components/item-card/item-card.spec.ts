import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ItemCard } from './item-card';

describe('ItemCard', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItemCard],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders metadata, item image, status badge, and item detail router links', () => {
    const fixture = TestBed.createComponent(ItemCard);
    fixture.componentRef.setInput('id', 'item-99');
    fixture.componentRef.setInput('title', 'Samsung Galaxy S23');
    fixture.componentRef.setInput('description', 'Found near New Road gate.');
    fixture.componentRef.setInput('imageUrl', 'http://localhost:3000/uploads/items/s23.jpg');
    fixture.componentRef.setInput('category', 'Electronics');
    fixture.componentRef.setInput('location', 'Kathmandu');
    fixture.componentRef.setInput('date', 'May 3, 2026');
    fixture.componentRef.setInput('status', 'found');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Samsung Galaxy S23');
    expect(el.textContent).toContain('Electronics');
    expect(el.textContent).toContain('Found Item');
    expect(el.querySelector('img.item-image')?.getAttribute('src')).toBe(
      'http://localhost:3000/uploads/items/s23.jpg',
    );
    expect(el.querySelector('a.item-link')?.getAttribute('href')).toBe('/items/item-99');
  });

  it('renders fallback placeholder when no imageUrl is provided', () => {
    const fixture = TestBed.createComponent(ItemCard);
    fixture.componentRef.setInput('id', 'item-100');
    fixture.componentRef.setInput('title', 'Black Keychain');
    fixture.componentRef.setInput('status', 'lost');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.image-placeholder')).toBeTruthy();
    expect(el.textContent).toContain('Lost Item');
  });
});
