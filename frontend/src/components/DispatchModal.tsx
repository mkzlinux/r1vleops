import { useEffect, useRef, useState } from "react";
import { api, fmtDateTime } from "../api";
import type { DispatchState } from "../types";
import Modal from "./Modal";
import { Avatar, DeptBar, StatusPill } from "./ui";

export default function DispatchModal({
  dispatchId,
  onClose,
  onSettled,
}: {
  dispatchId: number;
  onClose: () => void;
  onSettled?: () => void;
}) {
  const [state, setState] = useState<DispatchState | null>(null);
  const [err, setErr] = useState("");
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dispatchId) return;
    let active = true;
    const poll = async () => {
      try {
        const s = await api.dispatch(dispatchId);
        if (!active) return;
        setState(s);
        if (s.status === "done" || s.status === "error") {
          onSettled?.();
          return; // stop polling
        }
        setTimeout(poll, 900);
      } catch (e: any) {
        setErr(String(e?.message || e));
      }
    };
    poll();
    return () => {
      active = false;
    };
  }, [dispatchId]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [state?.live_log?.length]);

  const running = state && state.status === "running";
  const title = (
    <span>
      {running ? "Dispatch in progress" : "Dispatch complete"}
      <span className="modal-sub">{state?.dept_name} crew</span>
    </span>
  );

  return (
    <Modal open={!!dispatchId} onClose={onClose} title={title} wide>
      {!state && !err && <div className="muted">Starting…</div>}
      {err && <div className="error-banner">{err}</div>}

      {state && (
        <div className="dispatch-grid">
          <div className="dispatch-log-panel">
            <div className="panel-title">Crew activity</div>
            {running && (
              <div className="log-live">
                <span className="pulse" />
                <span>{state.dept_name} lead planning → specialists executing…</span>
              </div>
            )}
            <div className="log-scroll" ref={logRef}>
              {state.live_log.map((l, i) => (
                <div className="log-line" key={i}>
                  <span className="log-ts">{fmtDateTime(state.created_at)}</span>
                  <div className="log-dot" />
                  <span>{l}</span>
                </div>
              ))}
            </div>
          </div>

          {state.status === "done" ? (
            <div className="dispatch-result">
              <div className="panel-title">Founder hand-off</div>
              <div className="summary-box">{state.summary}</div>

              {(state.tasks || []).length > 0 && (
                <div className="panel-title" style={{ marginTop: 14 }}>
                  Workstreams on the board
                </div>
              )}
              {(state.tasks || []).map((t) => (
                <div className="result-task" key={t.id}>
                  <Avatar initials={t.assignee_avatar} color={t.dept_color} size={28} name={t.assignee_name} />
                  <div className="rt-main">
                    <div className="rt-title">{t.title}</div>
                    <div className="muted">{t.assignee_name} · {t.assignee_title}</div>
                  </div>
                  <StatusPill status={t.status} />
                </div>
              ))}

              {(state.events || []).length > 0 && (
                <div className="muted" style={{ marginTop: 10 }}>
                  A review checkpoint was scheduled on the Calendar.
                </div>
              )}
              <button className="btn primary" onClick={onClose}>
                Back to the desk
              </button>
            </div>
          ) : (
            <div className="dispatch-result">
              <DeptBar color={state.dept_color} name={state.dept_name} />
              <div className="muted" style={{ marginTop: 6 }}>
                {state.goal}
              </div>
              <div className="goal-echo">“{state.goal}”</div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
