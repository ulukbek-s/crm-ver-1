'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTabsStore } from '@/store/tabs';

type Props = {
  href: string;
  label?: string;
  children: React.ReactNode;
  className?: string;
};

export function LinkWithTab({ href, label, children, className }: Props) {
  const pathname = usePathname();
  const addTab = useTabsStore((s) => s.addTab);

  const handleClick = (e: React.MouseEvent) => {
    const match = href.match(/^\/(candidates|vacancies|visa)\/([^/]+)/);
    if (match) {
      const [, entity, id] = match;
      const entityLabel = entity === 'candidates' ? 'Candidate' : entity === 'vacancies' ? 'Vacancy' : 'Visa';
      addTab({
        id: href,
        label: label ?? `${entityLabel} ${id.slice(0, 8)}`,
        path: href,
      });
    }
  };

  return (
    <Link href={href} onClick={handleClick} className={className}>
      {children}
    </Link>
  );
}
