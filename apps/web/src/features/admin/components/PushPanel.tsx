import { useState } from "react";

import { adminApi } from "../../../shared/api/admin";
import type { AdminNotificationTargetType, AdminTestNotificationType } from "../../../shared/api/types";
import { Button } from "../../../shared/ui/button";
import {
  getErrorMessage,
  testNotificationTargetTypes,
  testNotificationTypes,
} from "../adminViewModel";

interface PushPanelProps {
  accessToken: string;
  onAction: (message: string) => void;
  onError: (message: string) => void;
}

export function PushPanel({ accessToken, onAction, onError }: PushPanelProps) {
  const [email, setEmail] = useState("");
  const [type, setType] = useState<AdminTestNotificationType>("support_replied");
  const [targetId, setTargetId] = useState("");
  const [targetType, setTargetType] = useState<AdminNotificationTargetType>("support_ticket");
  const [dispatch, setDispatch] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function dispatchPending() {
    if (!window.confirm("대기 중인 푸시 발송을 처리할까요?")) return;

    setIsSubmitting(true);
    try {
      const result = await adminApi.dispatchPendingPushDeliveries(accessToken);
      onAction(`푸시 처리 완료: sent ${result.sent}, failed ${result.failed}`);
    } catch (error) {
      onError(getErrorMessage(error, "푸시 발송을 처리하지 못했습니다."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function sendTest() {
    if (!email.trim()) {
      onError("테스트 받을 이메일을 입력해 주세요.");
      return;
    }
    if (dispatch && !window.confirm("실제 기기 알림을 발송할까요?")) return;

    setIsSubmitting(true);
    try {
      await adminApi.sendTestNotification(
        {
          email,
          type,
          target_type: targetType || null,
          target_id: targetId.trim() || null,
          dispatch,
        },
        accessToken,
      );
      onAction(dispatch ? "테스트 알림을 만들고 발송했습니다." : "테스트 알림을 만들었습니다.");
    } catch (error) {
      onError(getErrorMessage(error, "테스트 알림을 만들지 못했습니다."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-hypo-xl border border-hypo-border bg-white p-5">
      <h2 className="text-lg font-black">알림/푸시</h2>
      <p className="mt-1 text-sm text-hypo-text-muted">
        업무 이벤트와 테스트 알림만 다룹니다. 전체 발송이나 마케팅 푸시는 만들지 않습니다.
      </p>

      <div className="mt-5 rounded-hypo-lg border border-hypo-border p-4">
        <h3 className="font-black">대기 푸시 처리</h3>
        <p className="mt-1 text-sm text-hypo-text-muted">이미 생성된 push delivery row를 provider로 보냅니다.</p>
        <Button className="mt-3" disabled={isSubmitting} size="sm" onClick={dispatchPending}>
          대기 푸시 처리
        </Button>
      </div>

      <div className="mt-4 rounded-hypo-lg border border-hypo-border p-4">
        <h3 className="font-black">테스트 알림</h3>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <input
            aria-label="테스트 수신 이메일"
            className="rounded-hypo-lg border border-hypo-border px-3 py-2 text-sm"
            placeholder="user@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <select
            aria-label="테스트 알림 유형"
            className="rounded-hypo-lg border border-hypo-border px-3 py-2 text-sm"
            value={type}
            onChange={(event) => setType(event.target.value as AdminTestNotificationType)}
          >
            {testNotificationTypes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            aria-label="테스트 알림 대상 유형"
            className="rounded-hypo-lg border border-hypo-border px-3 py-2 text-sm"
            value={targetType}
            onChange={(event) => setTargetType(event.target.value as AdminNotificationTargetType)}
          >
            {testNotificationTargetTypes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <input
            aria-label="테스트 알림 대상 ID"
            className="rounded-hypo-lg border border-hypo-border px-3 py-2 text-sm"
            placeholder="target_id"
            value={targetId}
            onChange={(event) => setTargetId(event.target.value)}
          />
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm font-bold">
          <input checked={dispatch} type="checkbox" onChange={(event) => setDispatch(event.target.checked)} />
          실제 푸시까지 발송
        </label>
        <Button className="mt-3" disabled={isSubmitting} size="sm" onClick={sendTest}>
          테스트 알림 만들기
        </Button>
      </div>
    </section>
  );
}
