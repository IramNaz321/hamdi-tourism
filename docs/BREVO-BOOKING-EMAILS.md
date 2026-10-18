# Brevo owner booking notifications

Owner-facing booking notifications are sent **only to `Hamid.shah@mail.ru`**.
The recipient is fixed server-side, independent of Auth identities. No CC, BCC,
attachments, browser credentials or passenger-controlled recipient are supported.
The existing strict, database-verified projection supplies passenger name, email,
phone, reference, locations, pickup time, party size, recorded category, fare,
payment status and optional flight number. Missing email/luggage/category is
labelled as not provided/recorded; no assignments, fares or confirmations are invented.

## Secure configuration

In the serving environment's private secrets (Codespaces Secrets plus restart,
or deployment server environment), configure:

- `BREVO_API_KEY`: transactional email API key; never a public/client variable.
- `BREVO_SENDER_EMAIL`: `irumnaaz2020@gmail.com`, reported verified by the client.
- `NOTIFICATION_WORKER_SECRET`: independent random secret, at least 32 characters.
- Existing server-side Supabase service credentials and site origin.
- Keep `NOTIFICATION_EMAIL_ENABLED=false` until the controlled test is approved.

Sender name is HAMDI TOURISM. Sender verification is client-reported, not independently
verified by this change. Existing passenger transactional emails remain on Resend
and are claimed only when their Resend key and sender are configured. They are
not redirected to the Owner or silently migrated to Brevo. The existing signed
Resend webhook is retained for those notices; it is not a Brevo webhook.

## Retry and production database dependency

Brevo POST `/v3/smtp/email` uses `api-key`, `textContent`, and a stable custom
`headers.IdempotencyKey` derived from the outbox booking ID. Brevo deduplication
has a 15-minute horizon, unlike the previous Resend adapter's 24 hours.
New migration `202610120012_brevo_owner_retry_window.sql` therefore replaces only
the two owner outbox claim/result functions after migration 010. It preserves
RLS, service-only execution, lease fencing, strict contact purging and five-attempt
limit. Claims terminate after ten minutes from a persisted first attempt; one-minute
leases/retry delay permit recovery inside that bound. The worker also refuses
stale/future timestamps and older claim payloads lacking `first_attempt_at`.
This dependency is fail-closed: old production RPCs cannot cause an unsafe send.
A successful API response with a message ID means accepted, **not delivered**.
Timeouts, quota failures and malformed responses never become delivery success.

Before provider cutover, pause the scheduler and reconcile any previously attempted
queued/sending owner notices against provider records. Migration 012 aborts if
such notices remain; this prevents resending an uncertain Resend delivery through
Brevo. Do not delete/requeue or manually mark them successful without evidence.
No automatic fallback or dual-provider owner sends are implemented.

Migration 012 is prepared and disposable-tested only; production execution requires
separate approval, schema preflight and verified recovery readiness. Do not replay
001–011. If 010 is absent, it needs its own reviewed dependency deployment first.
Rollback: pause delivery; restore the prior code and the two function definitions
from migration 010 only after reconciling attempted notices. Do not drop the outbox
or replay the full 010 table migration.

## Controlled acceptance (not performed)

1. Configure private Brevo credentials; check the verified sender and account quota
   in Brevo. Have the reviewed database prerequisites separately approved/applied.
2. With the scheduler paused, approve one controlled notification for an existing
   genuine booking. Do not create a fake production booking to test email.
3. Temporarily enable the worker only in the authorized environment and invoke its
   authenticated POST once. This requires separate approval because it sends email.
4. Confirm the only recipient and the recorded provider message ID, then confirm
   receipt privately in the Mail.ru inbox and Brevo transactional logs. Do not infer
   delivery from HTTP acceptance. Brevo delivery webhooks are not integrated here.
5. Verify a repeated authorized invocation does not resend an accepted outbox row;
   resume scheduling only after acceptance. Do not blindly replay historical notices.

API contract reference: official Brevo Node SDK
https://github.com/getbrevo/brevo-node/blob/main/src/api/resources/transactionalEmails/client/requests/SendTransacEmailRequest.ts
and https://developers.brevo.com/docs/heterogeneous-versions-of-email-sending-api.
No real provider requests, production SQL, emails, deployment or Auth changes are
part of this implementation.
