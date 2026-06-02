'use client';

import { PartFileBadge } from '../../../_components/part-file-badge';

type MemberPartFile = {
  area: 'instrumental' | 'shared' | 'vocal';
  description: string | null;
  id: string;
  kind: 'chart_pdf' | 'guide_audio';
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
