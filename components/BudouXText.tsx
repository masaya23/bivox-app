'use client';

import { useMemo } from 'react';
import { loadDefaultJapaneseParser } from 'budoux';

type BudouXTag = 'div' | 'h1' | 'h2' | 'h3' | 'label' | 'li' | 'p' | 'span';

interface BudouXTextProps {
  text: string;
  as?: BudouXTag;
  className?: string;
}

const jaParser = loadDefaultJapaneseParser();

function containsJapanese(text: string): boolean {
  return /[\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(text);
}

export function BudouXText({
  text,
  as: Tag = 'span',
  className = '',
}: BudouXTextProps) {
  const chunks = useMemo(() => {
    if (!containsJapanese(text)) {
      return null;
    }

    return jaParser.parse(text);
  }, [text]);

  return (
    <Tag className={className}>
      {chunks
        ? chunks.map((chunk, index) => (
            <span key={`${chunk}-${index}`} style={{ whiteSpace: 'nowrap' }}>
              {chunk}
            </span>
          ))
        : text}
    </Tag>
  );
}
