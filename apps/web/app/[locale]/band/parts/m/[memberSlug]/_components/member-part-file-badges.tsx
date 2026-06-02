'use client';

import { PartFileBadge } from '../../../_components/part-file-badge';
import { PartNoteContent } from '../../../_components/part-note-rich-text';

type MemberPartFile = {
  area: 'instrumental' | 'shared' | 'vocal';
  content: PartNoteContent | null;
  description: string | null;
  id: string;
  kind: 'chart_pdf' | 'guide_audio' | 'rich_text_note';
  signedUrl: string | null;
  title: string;
};

export function MemberPartFileBadges({ files }: { files: MemberPartFile[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {files.map((file) => (
        <PartFileBadge
          kind={file.kind}
          key={`${file.id}-${file.area}`}
          label={file.title}
          noteContent={file.content}
          previewUrl={file.signedUrl}
          tooltip={
            file.description
              ? `${formatArea(file.area)}: ${file.description}`
              : formatArea(file.area)
          }
          variant="secondary"
        />
      ))}
    </div>
  );
}

function formatArea(area: 'instrumental' | 'shared' | 'vocal') {
  if (area === 'shared') {
    return 'ALL';
  }

  return area === 'instrumental' ? 'Instrumental' : 'Vocal';
}
