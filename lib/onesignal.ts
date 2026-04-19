export interface OneSignalResult {
  success: boolean;
  notificationId: string;
}

/**
 * Mock OneSignal push notification sender.
 *
 * In production replace the body with a real fetch to:
 *   POST https://onesignal.com/api/v1/notifications
 * with Authorization: Basic <REST_API_KEY>
 */
export async function sendPushNotification(
  message: string,
  recipientName?: string
): Promise<OneSignalResult> {
  const payload = {
    app_id: process.env.ONESIGNAL_APP_ID ?? 'mock-app-id',
    contents: { en: message },
    headings: { en: 'Exotic Aquascape' },
    // production: include `include_external_user_ids` or `include_player_ids`
  };

  console.log(`\n[OneSignal] ✉  Notification dispatched`);
  console.log(`[OneSignal]    To      : ${recipientName ?? 'homeowner'}`);
  console.log(`[OneSignal]    Message : "${message}"`);
  console.log(`[OneSignal]    Payload :`, JSON.stringify(payload, null, 2));

  /*
   * Real implementation (uncomment when ONESIGNAL_REST_API_KEY is set):
   *
   * const res = await fetch('https://onesignal.com/api/v1/notifications', {
   *   method: 'POST',
   *   headers: {
   *     'Content-Type': 'application/json',
   *     Authorization: `Basic ${process.env.ONESIGNAL_REST_API_KEY}`,
   *   },
   *   body: JSON.stringify(payload),
   * });
   * const data = await res.json();
   * return { success: res.ok, notificationId: data.id };
   */

  return { success: true, notificationId: crypto.randomUUID() };
}
