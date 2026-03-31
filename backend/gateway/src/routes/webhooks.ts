import { FastifyInstance, FastifyRequest } from 'fastify';
import { db } from '../db/client.js';
import { config } from '../config.js';
import crypto from 'crypto';

export async function registerWebhookRoutes(app: FastifyInstance) {
  /**
   * Polar.sh Webhook Listener
   */
  app.post('/api/webhooks/polar', async (request: FastifyRequest, reply) => {
    const signature = request.headers['polar-webhook-signature'] as string;
    const webhookSecret = config.polarWebhookSecret;

    if (!signature || !webhookSecret) {
      return reply.code(400).send({ error: 'Missing signature or secret' });
    }

    const payload = JSON.stringify(request.body);

    // Verify webhook signature
    const hmac = crypto.createHmac('sha256', webhookSecret);
    const digest = Buffer.from(hmac.update(payload).digest('hex'), 'utf8');
    const signatureBuffer = Buffer.from(signature, 'utf8');

    if (!crypto.timingSafeEqual(digest, signatureBuffer)) {
      request.log.warn('[Webhook] Invalid signature received.');
      return reply.code(401).send({ error: 'Invalid signature' });
    }

    const event = request.body as any;
    const { type, data } = event;

    request.log.info(`[Webhook] Received Polar event: ${type}`);

    try {
      if (type === 'subscription.created' || type === 'subscription.updated') {
        const userId = data.metadata?.userId;
        const planId = data.product?.name?.toLowerCase() || 'pro';
        const status = data.status;

        if (userId) {
          // Map Polar plan names to internal tiers
          const tier = planId.includes('creator') ? 'creator' : 'pro';
          const credits = tier === 'creator' ? 500 : 100; // Example credit grant

          await db`
            UPDATE users 
            SET tier = ${tier}, 
                credits = credits + ${credits},
                updated_at = NOW() 
            WHERE id = ${userId}
          `;
          
          request.log.info(`[Webhook] Upgraded user ${userId} to ${tier}`);
        }
      }

      if (type === 'subscription.revoked' || type === 'subscription.deleted') {
        const userId = data.metadata?.userId;
        if (userId) {
          await db`
            UPDATE users SET tier = 'free', updated_at = NOW() WHERE id = ${userId}
          `;
          request.log.info(`[Webhook] Revoked subscription for user ${userId}`);
        }
      }

      return reply.code(200).send({ received: true });
    } catch (err: any) {
      request.log.error(`[Webhook] Error processing event: ${err.message}`);
      return reply.code(500).send({ error: 'Processing failed' });
    }
  });
}
