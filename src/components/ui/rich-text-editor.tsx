"use client";

import {
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Underline,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * A minimal rich-text editor for product/category descriptions — no new
 * dependency (AGENTS.md §0 rule 6 requires asking first, and nothing on
 * the approved list is a rich-text package). Built on native
 * `contentEditable` + `document.execCommand`: deprecated on MDN but still
 * implemented by every evergreen browser, and the only zero-dependency way
 * to get real bold/italic/list formatting without shipping an editor
 * framework for a two-field use case.
 *
 * Stores/emits HTML (`value`/`onChange`), not plain text — callers that
 * render this content publicly must use `dangerouslySetInnerHTML`, and
 * anything using it as plain text (a `<meta description>`, JSON-LD, a card
 * excerpt) must run it through `stripHtml` first. Both are admin-authored
 * fields behind the dashboard's own auth gate, the same trust boundary any
 * CMS rich-text field relies on.
 */
const COMMANDS: {
  command: string;
  label: string;
  icon: typeof Bold;
  value?: string;
}[] = [
  { command: "bold", label: "Bold", icon: Bold },
  { command: "italic", label: "Italic", icon: Italic },
  { command: "underline", label: "Underline", icon: Underline },
  { command: "insertUnorderedList", label: "Bullet list", icon: List },
  { command: "insertOrderedList", label: "Numbered list", icon: ListOrdered },
];

export function RichTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  // Tracks whether the last `innerHTML` write came from this component
  // itself (typing) vs. an external `value` change (switching which
  // product/category is being edited) — only the latter should overwrite
  // the DOM, otherwise every keystroke would reset the caret to the start.
  const lastEmitted = useRef(value);

  useEffect(() => {
    if (editorRef.current && value !== lastEmitted.current) {
      editorRef.current.innerHTML = value;
      lastEmitted.current = value;
    }
  }, [value]);

  function emit() {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    lastEmitted.current = html;
    onChange(html);
  }

  function runCommand(command: string, commandValue?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    emit();
  }

  function insertLink() {
    const url = window.prompt("Link URL");
    if (!url) return;
    runCommand("createLink", url);
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-md border border-line bg-surface">
      <div className="flex flex-wrap gap-0.5 border-b border-line bg-muted p-1.5">
        {COMMANDS.map(({ command, label, icon: Icon }) => (
          <button
            key={command}
            type="button"
            // Mousedown, not click — click fires after the editor loses
            // focus/selection to the button, so `execCommand` would have
            // nothing left to apply to.
            onMouseDown={(event) => {
              event.preventDefault();
              runCommand(command);
            }}
            aria-label={label}
            className="grid size-8 place-items-center rounded text-ink-secondary transition-colors hover:bg-surface hover:text-ink"
          >
            <Icon aria-hidden className="size-4" />
          </button>
        ))}
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            insertLink();
          }}
          aria-label="Insert link"
          className="grid size-8 place-items-center rounded text-ink-secondary transition-colors hover:bg-surface hover:text-ink"
        >
          <Link2 aria-hidden className="size-4" />
        </button>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        data-placeholder={placeholder}
        className={cn(
          "min-h-32 px-3.5 py-2.5 text-sm text-ink focus:outline-none",
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
          "[&_a]:text-accent [&_a]:underline",
          "empty:before:text-ink-muted empty:before:content-[attr(data-placeholder)]",
        )}
      />
    </div>
  );
}
