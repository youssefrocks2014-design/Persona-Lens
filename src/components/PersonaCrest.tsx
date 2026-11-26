import { useState } from 'react';
import abrahamLincolnPortrait from '../assets/images/abraham_lincoln_portrait_1795701744985.jpg';
import benjaminFranklinPortrait from '../assets/images/benjamin_franklin_portrait_1795701745350.jpg';
import frederickDouglassPortrait from '../assets/images/frederick_douglass_portrait_1795701746971.jpg';
import ibnKhaldunPortrait from '../assets/images/ibn_khaldun_portrait_1795701745898.jpg';
import marcusAureliusPortrait from '../assets/images/marcus_aurelius_portrait_1795701743936.jpg';
import marieCuriePortrait from '../assets/images/marie_curie_portrait_1795701745187.jpg';
import nelsonMandelaPortrait from '../assets/images/nelson_mandela_portrait_1795701744031.jpg';

interface PersonaCrestProps {
  personaId: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const PORTRAIT_MAP: Record<string, string> = {
  'marcus-aurelius': marcusAureliusPortrait,
  'nelson-mandela': nelsonMandelaPortrait,
  'abraham-lincoln': abrahamLincolnPortrait,
  'marie-curie': marieCuriePortrait,
  'ibn-khaldun': ibnKhaldunPortrait,
  'benjamin-franklin': benjaminFranklinPortrait,
  'frederick-douglass': frederickDouglassPortrait,
};

const MONOGRAM_MAP: Record<string, string> = {
  'marcus-aurelius': 'MA',
  'nelson-mandela': 'NM',
  'abraham-lincoln': 'AL',
  'marie-curie': 'MC',
  'ibn-khaldun': 'IK',
  'benjamin-franklin': 'BF',
  'frederick-douglass': 'FD',
};

const SIZE_CLASSES: Record<NonNullable<PersonaCrestProps['size']>, string> = {
  xs: 'w-5 h-5 text-[9px]',
  sm: 'w-10 h-10 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-14 h-14 text-base',
};

function getInitials(personaId: string, name: string): string {
  if (MONOGRAM_MAP[personaId]) return MONOGRAM_MAP[personaId];
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function PersonaCrest({ personaId, name, size = 'md' }: PersonaCrestProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const portraitSrc = PORTRAIT_MAP[personaId];
  const initials = getInitials(personaId, name);
  const dim = SIZE_CLASSES[size];

  if (portraitSrc && failedSrc !== portraitSrc) {
    return (
      <div
        className={`${dim} shrink-0 rounded-full border border-[#D6CEBE] bg-[#F2EFE9] overflow-hidden`}
      >
        <img
          src={portraitSrc}
          alt={name ? `Portrait of ${name}` : 'Historical figure portrait'}
          referrerPolicy="no-referrer"
          decoding="async"
          onError={() => setFailedSrc(portraitSrc)}
          className="w-full h-full object-cover object-top scale-[1.12]"
        />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`${dim} shrink-0 rounded-full border border-[#D6CEBE] bg-[#F2EFE9] flex items-center justify-center font-serif font-semibold tracking-tight text-[#1C1917]`}
    >
      {initials}
    </div>
  );
}
