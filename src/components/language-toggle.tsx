'use client';

import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { Languages } from 'lucide-react';

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'nl' ? 'en' : 'nl');
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="gap-2"
      title={language === 'nl' ? 'Switch to English' : 'Schakel naar Nederlands'}
    >
      <Languages className="h-4 w-4" />
      <span className="font-semibold uppercase">{language}</span>
    </Button>
  );
}
