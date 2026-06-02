'use client';

import {
  Fragment,
  type ReactNode,
  useMemo,
  useRef,
  useState,
} from 'react';

import LinkExtension from '@tiptap/extension-link';
import {
  EditorContent,
  JSONContent,
  useEditor,
} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, Link, List, ListOrdered, Unlink } from 'lucide-react';

import { Button } from '@kit/ui/button';
import { cn } from '@kit/ui/utils';

export type PartNoteContent = JSONContent;

const emptyDoc: PartNoteContent = {
  content: [
    {
      type: 'paragraph',
    },
  ],
  type: 'doc',
};

const editableRichTextExtensions = [
  StarterKit.configure({
    heading: false,
  }),
  LinkExtension.configure({
    autolink: true,
    defaultProtocol: 'https',
    openOnClick: false,
    protocols: ['http', 'https', 'mailto'],
  }),
];

const richTextClassName = cn(
  'text-sm leading-6 outline-none',
  '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4',
  '[&_ol]:ml-5 [&_ol]:list-decimal [&_ul]:ml-5 [&_ul]:list-disc',
  '[&_p:not(:last-child)]:mb-2',
);

export function PartNoteEditor({
  className,
  content,
  onChange,
}: {
  className?: string;
  content?: PartNoteContent | null;
  onChange: (content: PartNoteContent) => void;
}) {
  const initialContent = useMemo(() => content ?? emptyDoc, [content]);
  const selectionRef = useRef<{ from: number; to: number } | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const editor = useEditor({
    content: initialContent,
    editorProps: {
      attributes: {
        class: cn(
          richTextClassName,
          'min-h-36 rounded-b-lg border-x border-b px-3 py-2',
        ),
      },
    },
    extensions: editableRichTextExtensions,
    immediatelyRender: false,
    onSelectionUpdate: ({ editor: updatedEditor }) => {
      selectionRef.current = {
        from: updatedEditor.state.selection.from,
        to: updatedEditor.state.selection.to,
      };
      setLinkUrl(
        typeof updatedEditor.getAttributes('link').href === 'string'
          ? updatedEditor.getAttributes('link').href
          : '',
      );
    },
    onUpdate: ({ editor: updatedEditor }) => {
      onChange(updatedEditor.getJSON());
    },
  });

  function applyLink() {
    if (!editor) {
      return;
    }

    const selection = selectionRef.current ?? {
      from: editor.state.selection.from,
      to: editor.state.selection.to,
    };
    const href = normalizeHref(linkUrl);

    if (!href) {
      return;
    }

    editor
      .chain()
      .focus()
      .setTextSelection(selection)
      .setMark('link', {
        href,
        rel: 'noopener noreferrer nofollow',
        target: '_blank',
      })
      .run();

    const nextContent = repairMissingLinkHrefs(editor.getJSON(), href);

    editor.commands.setContent(nextContent, { emitUpdate: false });
    setLinkUrl(href);
    onChange(nextContent);
  }

  function removeLink() {
    if (!editor) {
      return;
    }

    const selection = selectionRef.current ?? {
      from: editor.state.selection.from,
      to: editor.state.selection.to,
    };

    editor
      .chain()
      .focus()
      .setTextSelection(selection)
      .extendMarkRange('link')
      .unsetLink()
      .run();
    setLinkUrl('');
    onChange(editor.getJSON());
  }

  return (
    <div className={className}>
      <div className="border-input bg-muted/30 flex flex-wrap items-center gap-1 rounded-t-lg border px-2 py-1">
        <ToolbarButton
          active={editor?.isActive('bold') ?? false}
          disabled={!editor}
          label="Bold"
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold />
        </ToolbarButton>
        <ToolbarButton
          active={editor?.isActive('italic') ?? false}
          disabled={!editor}
          label="Italic"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic />
        </ToolbarButton>
        <ToolbarButton
          active={editor?.isActive('bulletList') ?? false}
          disabled={!editor}
          label="Bullet list"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List />
        </ToolbarButton>
        <ToolbarButton
          active={editor?.isActive('orderedList') ?? false}
          disabled={!editor}
          label="Numbered list"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered />
        </ToolbarButton>
        <ToolbarButton
          active={editor?.isActive('link') ?? false}
          disabled={!editor}
          label="Prepare link"
          onClick={() => {
            if (!editor) {
              return;
            }

            selectionRef.current = {
              from: editor.state.selection.from,
              to: editor.state.selection.to,
            };
          }}
        >
          <Link />
        </ToolbarButton>
        <ToolbarButton
          disabled={!editor || !editor.isActive('link')}
          label="Remove link"
          onClick={removeLink}
        >
          <Unlink />
        </ToolbarButton>
        <div className="ml-1 flex min-w-48 flex-1 items-center gap-1">
          <input
            className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-8 min-w-0 flex-1 rounded-md border px-2 text-sm outline-none focus-visible:ring-2"
            onChange={(event) => setLinkUrl(event.target.value)}
            onFocus={() => {
              if (!editor) {
                return;
              }

              selectionRef.current = {
                from: editor.state.selection.from,
                to: editor.state.selection.to,
              };
            }}
            onMouseDown={() => {
              if (!editor) {
                return;
              }

              selectionRef.current = {
                from: editor.state.selection.from,
                to: editor.state.selection.to,
              };
            }}
            placeholder="https://..."
            type="url"
            value={linkUrl}
          />
          <Button
            disabled={!editor || !normalizeHref(linkUrl)}
            onClick={applyLink}
            size="sm"
            type="button"
            variant="outline"
          >
            Apply
          </Button>
        </div>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

export function PartNoteViewer({
  className,
  content,
}: {
  className?: string;
  content?: PartNoteContent | null;
}) {
  return (
    <div className={cn(richTextClassName, className)}>
      {renderNoteNodes((content ?? emptyDoc).content)}
    </div>
  );
}

function renderNoteNodes(nodes: PartNoteContent['content']): ReactNode {
  return nodes?.map((node, index) => renderNoteNode(node, index)) ?? null;
}

function renderNoteNode(node: PartNoteContent, index: number): ReactNode {
  const children = renderNoteNodes(node.content);

  switch (node.type) {
    case 'paragraph':
      return <p key={index}>{children}</p>;
    case 'bulletList':
      return <ul key={index}>{children}</ul>;
    case 'orderedList':
      return <ol key={index}>{children}</ol>;
    case 'listItem':
      return <li key={index}>{children}</li>;
    case 'hardBreak':
      return <br key={index} />;
    case 'text':
      return (
        <Fragment key={index}>{applyTextMarks(node.text ?? '', node.marks)}</Fragment>
      );
    default:
      return <Fragment key={index}>{children}</Fragment>;
  }
}

function applyTextMarks(
  text: string,
  marks: PartNoteContent['marks'],
): ReactNode {
  return (marks ?? []).reduce<ReactNode>((children, mark, index) => {
    switch (mark.type) {
      case 'bold':
        return <strong key={index}>{children}</strong>;
      case 'italic':
        return <em key={index}>{children}</em>;
      case 'link': {
        const href = normalizeHref(mark.attrs?.href);

        if (!href) {
          return children;
        }

        return (
          <a href={href} key={index} rel="noreferrer" target="_blank">
            {children}
          </a>
        );
      }
      default:
        return children;
    }
  }, text);
}

function normalizeHref(href: unknown) {
  if (typeof href !== 'string') {
    return null;
  }

  const trimmedHref = href.trim();

  if (!trimmedHref) {
    return null;
  }

  if (/^(https?:\/\/|mailto:)/i.test(trimmedHref)) {
    return trimmedHref;
  }

  return `https://${trimmedHref}`;
}

function repairMissingLinkHrefs(
  content: PartNoteContent,
  href: string,
): PartNoteContent {
  return {
    ...content,
    content: content.content?.map((node) => repairNodeLinkHrefs(node, href)),
  };
}

function repairNodeLinkHrefs(
  node: PartNoteContent,
  href: string,
): PartNoteContent {
  return {
    ...node,
    content: node.content?.map((child) => repairNodeLinkHrefs(child, href)),
    marks: node.marks?.map((mark) => {
      if (mark.type !== 'link') {
        return mark;
      }

      return {
        ...mark,
        attrs: {
          ...mark.attrs,
          href:
            typeof mark.attrs?.href === 'string' && mark.attrs.href.trim()
              ? mark.attrs.href
              : href,
          rel: 'noopener noreferrer nofollow',
          target: '_blank',
        },
      };
    }),
  };
}

function ToolbarButton({
  active = false,
  children,
  disabled,
  label,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      aria-label={label}
      aria-pressed={active}
      className={cn('size-8', active && 'bg-muted text-foreground')}
      disabled={disabled}
      onClick={onClick}
      onMouseDown={(event) => event.preventDefault()}
      size="icon"
      title={label}
      type="button"
      variant="ghost"
    >
      {children}
    </Button>
  );
}
