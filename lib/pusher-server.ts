import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
});

export async function triggerUpdate(
  event: string = 'state-changed',
  data: Record<string, unknown> = {}
): Promise<void> {
  try {
    console.log(`[Pusher] ✉  Broadcasting event: ${event}`);
    await pusher.trigger('dashboard', event, data);
    console.log(`[Pusher] ✓ Event sent`);
  } catch (error) {
    console.error(`[Pusher] ✗ Failed to trigger event:`, error);
  }
}
