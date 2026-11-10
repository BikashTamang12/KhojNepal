import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon, type IconName } from '../../../../shared/components/icon/icon';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { AuthService } from '../../../auth/services/auth';

interface FeaturePillar {
  title: string;
  description: string;
  icon: IconName;
}

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [RouterLink, PageHeader, Icon],
  templateUrl: './about.html',
  styleUrl: './about.css',
})
export class About {
  readonly authService = inject(AuthService);
  readonly pillars: FeaturePillar[] = [
    {
      title: 'Multi-Signal Smart Matching',
      description:
        'Compares keywords, item attributes, visual image signatures, Nepal district/municipality proximity, and report timestamps.',
      icon: 'sparkles',
    },
    {
      title: 'Privacy-First Contact Protection',
      description:
        'Reporter contact details remain hidden publicly and are unlocked only after ownership claims are reviewed and approved.',
      icon: 'shield-check',
    },
    {
      title: 'Two-Step Verification Workflow',
      description:
        'Finders can confirm or dispute incoming claims, and administrators review evidence before authorizing handover.',
      icon: 'check-badge',
    },
    {
      title: 'Tracked Safe Handover',
      description:
        'Schedule a safe meeting point and record confirmation once the owner receives their item to mark the report resolved.',
      icon: 'reunite',
    },
  ];
}
