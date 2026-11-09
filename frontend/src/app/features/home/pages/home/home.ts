import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon, IconName } from '../../../../shared/components/icon/icon';

interface ProcessStep {
  number: string;
  title: string;
  description: string;
  icon: IconName;
}

interface FeaturedItem {
  title: string;
  category: string;
  location: string;
  date: string;
  status: 'Lost' | 'Found';
  icon: IconName;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, Icon],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  readonly steps: ProcessStep[] = [
    {
      number: '01',
      title: 'Report an Item',
      description:
        'Submit details and a photo of an item you have lost or found.',
      icon: 'clipboard',
    },
    {
      number: '02',
      title: 'Find a Match',
      description:
        'KhojNepal intelligently compares reports to identify potential matches.',
      icon: 'search',
    },
    {
      number: '03',
      title: 'Verify Ownership',
      description:
        'Submit a claim and provide details to verify that the item belongs to you.',
      icon: 'shield-check',
    },
    {
      number: '04',
      title: 'Reunite',
      description:
        'Once the claim is approved, reconnect with your missing belongings.',
      icon: 'reunite',
    },
  ];

  readonly featuredItems: FeaturedItem[] = [
    {
      title: 'Black Wallet',
      category: 'Accessories',
      location: 'Kathmandu',
      date: 'Recently reported',
      status: 'Lost',
      icon: 'wallet',
    },
    {
      title: 'Blue Backpack',
      category: 'Bags',
      location: 'Pokhara',
      date: 'Recently reported',
      status: 'Found',
      icon: 'bag',
    },
    {
      title: 'Silver Smartphone',
      category: 'Electronics',
      location: 'Lalitpur',
      date: 'Recently reported',
      status: 'Lost',
      icon: 'smartphone',
    },
  ];
}