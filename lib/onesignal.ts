export interface OneSignalResult {
  success: boolean;
  notificationId: string;
  /**
   * False when the request succeeded but nobody was reachable — typically
   * because the target has no subscribed device. Callers should treat this as
   * informational, never as a failure of the action that triggered the push.
   */
  delivered: boolean;
}

/**
 * Sends a push to specific users.
 *
 * Targeting is REQUIRED. The previous version of this function had no targeting
 * field at all, which meant OneSignal fell back to the app's default segment and
 * every notification went to every subscriber — its `recipientName` argument was
 * only ever console.logged.
 *
 * `externalUserIds` are `users.id` values, which hold the Supabase auth uid
 * verbatim. They only resolve if the browser called `OneSignal.login(userId)`
 * (see components/OneSignalInit.tsx) — without that no device carries a user
 * identity and every send here is a silent no-op.
 */
export async function sendPushNotification(opts: {
  message: string;
  heading?: string;
  externalUserIds: string[];
  data?: Record<string, unknown>;
}): Promise<OneSignalResult> {
  const { message, heading = 'Exotic Aquascape', externalUserIds, data } = opts;

  if (externalUserIds.length === 0) {
    return { success: true, notificationId: '', delivered: false };
  }

  const payload = {
    app_id: process.env.ONESIGNAL_APP_ID,
    contents: { en: message },
    headings: { en: heading },
    // `include_aliases` + `target_channel` is the current targeting API;
    // `include_external_user_ids` is the deprecated equivalent and is only
    // needed for OneSignal apps that predate aliases.
    include_aliases: { external_id: externalUserIds },
    target_channel: 'push',
    ...(data ? { data } : {}),
  };

  try {
    const res = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${process.env.ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      console.error('[OneSignal] ✗ Failed:', res.status, body);
      return { success: false, notificationId: '', delivered: false };
    }

    // OneSignal returns 200 with an `errors` array when none of the targeted
    // users has a subscribed device. That is a normal outcome — the agent just
    // hasn't enabled notifications — so report it rather than treating it as a
    // failure. The job list is the channel of record; push is a nudge.
    const noRecipients =
      Array.isArray(body?.errors) &&
      body.errors.some((e: unknown) =>
        typeof e === 'string' ? /not subscribed/i.test(e) : false
      );

    return {
      success: true,
      notificationId: body?.id ?? '',
      delivered: !noRecipients && (body?.recipients ?? 0) > 0,
    };
  } catch (error) {
    console.error('[OneSignal] ✗ Request threw:', error);
    return { success: false, notificationId: '', delivered: false };
  }
}
