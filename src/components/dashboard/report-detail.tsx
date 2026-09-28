"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Pencil, Printer, Trash2, X } from "lucide-react";
import { AiDispatch } from "@/components/dashboard/ai-dispatch";
import { StatusBadge } from "@/components/dashboard/badges";
import { categoryIcon, categoryLabel } from "@/lib/categories";
import { formatAgo, reportTitle, shortLocation } from "@/lib/format";
import { reportImageCandidates } from "@/lib/report-image";
import { downloadWorkOrderPdf } from "@/lib/work-order-pdf";
import { cn } from "@/lib/utils";
import type { RankItem } from "@/lib/ai/types";
import type { Report, ReportStatus, ReportUpdate } from "@/lib/types";

type Props = {
  report: Report;
  queue: Report[];
  rank?: RankItem;
  updates: ReportUpdate[];
  updatesLoading?: boolean;
  onClose: () => void;
  onPostUpdate: (payload: {
    status?: ReportStatus;
    comment?: string | null;
  }) => Promise<void>;
  onEditUpdate: (
    updateId: number,
    payload: { comment?: string | null; new_status?: ReportStatus }
  ) => Promise<void>;
  onDeleteUpdate: (updateId: number) => Promise<void>;
  saving?: boolean;
};

const statusActions: { value: ReportStatus; label: string }[] = [
  { value: "Open", label: "Open" },
  { value: "In Progress", label: "Active" },
  { value: "Resolved", label: "Resolved" },
];

function statusChipLabel(status: ReportStatus) {
  if (status === "In Progress") return "Active";
  return status;
}

export function ReportDetail({
  report,
  queue,
  rank,
  updates,
  updatesLoading,
  onClose,
  onPostUpdate,
  onEditUpdate,
  onDeleteUpdate,
  saving,
}: Props) {
  const Icon = categoryIcon(report.category);
  const [draftStatus, setDraftStatus] = useState<ReportStatus>(report.status);
  const [comment, setComment] = useState("");
  const [confirmPost, setConfirmPost] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editComment, setEditComment] = useState("");
  const [editStatus, setEditStatus] = useState<ReportStatus>("Open");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [printing, setPrinting] = useState(false);
  const [imageCandidateIndex, setImageCandidateIndex] = useState(0);
  const photoRef = useRef<HTMLImageElement>(null);
  const imageCandidates = reportImageCandidates(report.image);
  const imageSrc = imageCandidates[imageCandidateIndex] ?? null;

  useEffect(() => {
    setDraftStatus(report.status);
    setComment("");
    setConfirmPost(false);
    setEditingId(null);
    setConfirmDeleteId(null);
    setImageCandidateIndex(0);
  }, [report.id, report.status]);

  const latest = updates[0] ?? null;
  const trimmedComment = comment.trim();
  const statusChanging = draftStatus !== report.status;
  const canPost = statusChanging || Boolean(trimmedComment);

  async function submitUpdate() {
    await onPostUpdate({
      ...(statusChanging ? { status: draftStatus } : {}),
      comment: trimmedComment || null,
    });
    setComment("");
    setConfirmPost(false);
    setDraftStatus(draftStatus);
  }

  function requestPost() {
    if (!canPost || saving) return;
    setConfirmDeleteId(null);
    setEditingId(null);
    if (statusChanging) {
      setConfirmPost(true);
      return;
    }
    void submitUpdate();
  }

  async function saveEdit() {
    if (editingId == null) return;
    await onEditUpdate(editingId, {
      comment: editComment.trim() || null,
      new_status: editStatus,
    });
    setEditingId(null);
  }

  async function confirmDelete() {
    if (confirmDeleteId == null) return;
    await onDeleteUpdate(confirmDeleteId);
    setConfirmDeleteId(null);
  }

  async function printWorkOrder() {
    if (printing) return;
    setPrinting(true);
    try {
      await downloadWorkOrderPdf(report, updates, photoRef.current);
    } catch (e) {
      console.error(e);
      window.alert("Could not create the work order PDF. Try again.");
    } finally {
      setPrinting(false);
    }
  }

  return (
    <aside className="ss-panel-enter flex h-full w-[340px] shrink-0 flex-col border-l border-[#E5E7EB] bg-white">
      <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#EEF0F3]">
            <Icon className="size-4 text-[#111827]" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[12px] text-[#757575]">
              {categoryLabel(report.category)} · #{report.id}
            </p>
            <h2 className="truncate text-[16px] font-semibold tracking-[-0.2px] text-[#111827]">
              {reportTitle(report)}
            </h2>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-[#757575] hover:bg-[#E8EAED]"
          aria-label="Close detail"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={report.status} />
          {report.synthetic && (
            <span className="text-[12px] text-[#757575]">Demo data</span>
          )}
          {saving && (
            <span className="text-[12px] text-[#757575]">Saving…</span>
          )}
        </div>

        <p className="text-[14px] leading-relaxed text-[#111827] text-pretty">
          {report.description}
        </p>

        <div className="text-[13px] text-[#757575]">
          <p>{shortLocation(report.location)}</p>
          <p className="mt-0.5 font-mono text-[11px] text-[#9CA3AF]">
            {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
          </p>
          <p className="mt-2">
            {format(new Date(report.time), "MMM d, yyyy")} · {formatAgo(report.time)}
          </p>
        </div>

        {imageSrc ? (
          <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-[#F7F8FA]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={photoRef}
              src={imageSrc}
              alt={`Report #${report.id} photo`}
              crossOrigin="anonymous"
              className="max-h-44 w-full object-cover"
              onError={() => {
                setImageCandidateIndex((i) =>
                  i + 1 < imageCandidates.length ? i + 1 : i
                );
              }}
            />
          </div>
        ) : null}

        <AiDispatch
          report={report}
          queue={queue}
          rank={rank}
          onUseDraft={(text) => {
            setComment(text);
            setConfirmPost(false);
          }}
          onSuggestStatus={(status) => {
            setDraftStatus(status);
            setConfirmPost(false);
          }}
        />

        <div>
          <p className="mb-2 text-[12px] text-[#757575]">Update</p>
          <p className="mb-1.5 text-[11px] text-[#9CA3AF]">
            Change status, leave a comment, or both
          </p>
          <div className="flex rounded-full bg-[#EEF0F3] p-1">
            {statusActions.map((s) => {
              const selected = draftStatus === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => {
                    setDraftStatus(s.value);
                    setConfirmPost(false);
                    setConfirmDeleteId(null);
                    setEditingId(null);
                  }}
                  disabled={saving}
                  className={cn(
                    "flex-1 rounded-full py-1.5 text-[12px] font-medium",
                    selected
                      ? "bg-[#111827] text-white"
                      : "text-[#6B7280] hover:text-[#111827]"
                  )}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          <textarea
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
              setConfirmPost(false);
            }}
            rows={3}
            placeholder={
              statusChanging
                ? "Optional comment…"
                : "Add a comment without changing status…"
            }
            disabled={saving}
            className="mt-2 w-full resize-none rounded-2xl border border-[#E5E7EB] bg-[#F7F8FA] px-3 py-2 text-[13px] text-[#111827] outline-none placeholder:text-[#9CA3AF] focus:border-[#111827]"
          />

          {confirmPost ? (
            <div className="mt-2 rounded-2xl bg-[#F7F8FA] px-3 py-2.5">
              <p className="text-[12px] text-[#111827]">
                Change status to{" "}
                <span className="font-semibold">
                  {statusChipLabel(draftStatus)}
                </span>
                {trimmedComment ? " and post your comment?" : "?"}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void submitUpdate()}
                  className="rounded-full bg-[#111827] px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setConfirmPost(false)}
                  className="rounded-full px-3 py-1.5 text-[12px] font-medium text-[#757575] hover:bg-[#E8EAED]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={saving || !canPost}
              onClick={requestPost}
              className="mt-2 rounded-full bg-[#111827] px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-40"
            >
              {statusChanging ? "Post update" : "Post comment"}
            </button>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[12px] text-[#757575]">Work order</p>
          </div>
          <button
            type="button"
            disabled={printing || updatesLoading}
            onClick={() => void printWorkOrder()}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-3 py-2 text-[12px] font-semibold text-[#111827] hover:bg-[#F7F8FA] disabled:opacity-40"
          >
            <Printer className="size-3.5" aria-hidden />
            {printing ? "Preparing PDF…" : "Print work order"}
          </button>
          <p className="mt-1.5 text-[11px] text-[#9CA3AF]">
            PDF with details, photo, and update history
          </p>
        </div>

        <div>
          <p className="mb-2 text-[12px] text-[#757575]">Update history</p>
          {updatesLoading ? (
            <p className="text-[13px] text-[#757575]">Loading updates…</p>
          ) : updates.length === 0 ? (
            <p className="text-[13px] text-[#757575]">No updates yet.</p>
          ) : (
            <ul className="space-y-2">
              {updates.map((u, index) => {
                const isLatest = index === 0 && latest?.id === u.id;
                const statusChanged = u.old_status !== u.new_status;
                const isEditing = editingId === u.id;

                return (
                  <li
                    key={u.id}
                    className="rounded-2xl border border-[#E5E7EB] bg-[#F7F8FA] px-3 py-2.5"
                  >
                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="flex rounded-full bg-white p-1">
                          {statusActions.map((s) => (
                            <button
                              key={s.value}
                              type="button"
                              disabled={saving}
                              onClick={() => setEditStatus(s.value)}
                              className={cn(
                                "flex-1 rounded-full py-1 text-[11px] font-medium",
                                editStatus === s.value
                                  ? "bg-[#111827] text-white"
                                  : "text-[#6B7280]"
                              )}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                        <textarea
                          value={editComment}
                          onChange={(e) => setEditComment(e.target.value)}
                          rows={3}
                          disabled={saving}
                          className="w-full resize-none rounded-xl border border-[#E5E7EB] bg-white px-2.5 py-2 text-[12px] text-[#111827] outline-none focus:border-[#111827]"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void saveEdit()}
                            className="rounded-full bg-[#111827] px-3 py-1 text-[11px] font-semibold text-white"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => setEditingId(null)}
                            className="rounded-full px-3 py-1 text-[11px] font-medium text-[#757575] hover:bg-[#E8EAED]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            {statusChanged ? (
                              <p className="text-[12px] font-medium text-[#111827]">
                                {statusChipLabel(u.old_status)} →{" "}
                                {statusChipLabel(u.new_status)}
                              </p>
                            ) : (
                              <p className="text-[12px] font-medium text-[#111827]">
                                Comment
                              </p>
                            )}
                            <p className="mt-0.5 text-[11px] text-[#9CA3AF]">
                              {format(new Date(u.created_at), "MMM d, yyyy · h:mm a")} ·{" "}
                              {formatAgo(u.created_at)}
                            </p>
                          </div>
                          {isLatest && (
                            <div className="flex shrink-0 gap-0.5">
                              <button
                                type="button"
                                disabled={saving}
                                aria-label="Edit latest update"
                                onClick={() => {
                                  setEditingId(u.id);
                                  setEditComment(u.comment ?? "");
                                  setEditStatus(u.new_status);
                                  setConfirmPost(false);
                                  setConfirmDeleteId(null);
                                }}
                                className="flex size-7 items-center justify-center rounded-full text-[#757575] hover:bg-[#E8EAED]"
                              >
                                <Pencil className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={saving}
                                aria-label="Delete latest update"
                                onClick={() => {
                                  setConfirmDeleteId(u.id);
                                  setEditingId(null);
                                  setConfirmPost(false);
                                }}
                                className="flex size-7 items-center justify-center rounded-full text-[#757575] hover:bg-[#FEE2E2] hover:text-[#E53935]"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                        {u.comment && (
                          <p className="mt-1.5 text-[13px] leading-snug text-[#374151] text-pretty">
                            {u.comment}
                          </p>
                        )}
                        {confirmDeleteId === u.id && (
                          <div className="mt-2 rounded-xl bg-white px-2.5 py-2">
                            <p className="text-[12px] text-[#111827]">
                              Delete this update
                              {statusChanged
                                ? ` and revert status to ${statusChipLabel(u.old_status)}`
                                : ""}
                              ?
                            </p>
                            <div className="mt-2 flex gap-2">
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => void confirmDelete()}
                                className="rounded-full bg-[#E53935] px-3 py-1 text-[11px] font-semibold text-white"
                              >
                                Delete
                              </button>
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => setConfirmDeleteId(null)}
                                className="rounded-full px-3 py-1 text-[11px] font-medium text-[#757575] hover:bg-[#E8EAED]"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </aside>
  );
}
